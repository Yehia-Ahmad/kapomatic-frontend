import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ThemeService } from '../../../shared/services/theme.service';
import { CustomersService } from '../../../customer/services/customers.service';
import { ProductsService } from '../../../products/services/products.service';
import {
  CustomSale,
  CustomSaleLineItem,
  CustomSalePayload,
  CustomSaleSummary
} from '../../models/custom-sales.models';
import { CustomSalesService } from '../../services/custom-sales.service';

type SearchOption = {
  id: string;
  name: string;
  displayLabel: string;
  phone?: string;
  unitPrice?: number | null;
};

type LineState = {
  options: SearchOption[];
  isSearching: boolean;
  showOptions: boolean;
  query: string;
};

@Component({
  selector: 'app-custom-sales-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SideNavComponent,
    TranslatePipe,
    MatSnackBarModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    TextareaModule,
    ButtonModule
  ],
  templateUrl: './custom-sales-form.component.html',
  styleUrl: './custom-sales-form.component.scss'
})
export class CustomSalesFormComponent implements OnInit, OnDestroy {
  isDarkMode$;
  direction: 'rtl' | 'ltr' = 'ltr';
  form: FormGroup;
  summary: CustomSaleSummary = this.emptySummary();
  submitAttempted = false;
  isSaving = false;
  isLoading = false;
  loadError = '';
  mode: 'create' | 'edit' = 'create';
  saleId = '';
  customerOptions: SearchOption[] = [];
  showCustomerOptions = false;
  isSearchingCustomers = false;
  customerSearch = '';
  materialStates: LineState[] = [];
  componentStates: LineState[] = [];
  private readonly subscriptions = new Subscription();
  private readonly isBrowser: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly translate: TranslateService,
    private readonly themeService: ThemeService,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly customSalesService: CustomSalesService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.createForm();
    this.addMaterial(false);
    this.addComponent(false);
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.routeConfig?.path?.includes('edit') ? 'edit' : 'create';
    this.saleId = this.route.snapshot.paramMap.get('id') || '';
    this.updateDirection();
    this.subscriptions.add(this.translate.onLangChange.subscribe(() => this.updateDirection()));
    this.subscriptions.add(this.form.valueChanges.subscribe(() => this.recalculateSummary()));
    this.recalculateSummary();

    if (this.isBrowser) {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
    }

    if (this.mode === 'edit' && this.saleId) {
      this.loadSale();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get materials(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  get additionalComponents(): FormArray {
    return this.form.get('additionalComponents') as FormArray;
  }

  controls(array: FormArray): FormGroup[] {
    return array.controls as FormGroup[];
  }

  addMaterial(recalculate = true): void {
    this.materials.push(this.createLineItemGroup());
    this.materialStates.push(this.emptyLineState());
    if (recalculate) this.recalculateSummary();
  }

  addComponent(recalculate = true): void {
    this.additionalComponents.push(this.createLineItemGroup(undefined, false));
    this.componentStates.push(this.emptyLineState());
    if (recalculate) this.recalculateSummary();
  }

  removeLine(array: FormArray, states: LineState[], index: number): void {
    if (array.length === 1) {
      array.at(index).reset({ productId: null, name: '', quantity: 1, unit: '', unitPrice: 0, manualCost: 0, totalCost: 0 });
      states[index] = this.emptyLineState();
    } else {
      array.removeAt(index);
      states.splice(index, 1);
    }
    this.recalculateSummary();
  }

  searchCustomers(event: Event): void {
    const query = String((event.target as HTMLInputElement).value || '').trim();
    this.customerSearch = query;
    if (!query) {
      this.customerOptions = [];
      this.showCustomerOptions = false;
      return;
    }
    this.isSearchingCustomers = true;
    this.customersService.getCustomers({ search: query }).subscribe({
      next: (res: any) => {
        this.isSearchingCustomers = false;
        const rows = this.extractRows(res);
        this.customerOptions = rows.map((customer: any) => ({
          id: customer._id || customer.id,
          name: customer.name || '',
          phone: customer.phone || '',
          displayLabel: [customer.name, customer.phone].filter(Boolean).join(' - ')
        })).filter((item) => item.id);
        this.showCustomerOptions = this.customerOptions.length > 0;
      },
      error: () => {
        this.isSearchingCustomers = false;
        this.customerOptions = [];
      }
    });
  }

  selectCustomer(option: SearchOption): void {
    this.form.patchValue({
      customerId: option.id,
      customerName: option.name,
      customerPhone: option.phone || ''
    });
    this.customerSearch = option.displayLabel;
    this.showCustomerOptions = false;
  }

  searchProducts(kind: 'materials' | 'components', index: number, event: Event): void {
    const query = String((event.target as HTMLInputElement).value || '').trim();
    const state = this.getLineState(kind, index);
    state.query = query;
    if (!query) {
      state.options = [];
      state.showOptions = false;
      return;
    }
    state.isSearching = true;
    this.productsService.searchProducts(query).subscribe({
      next: (res: any) => {
        state.isSearching = false;
        state.options = this.extractRows(res).map((product: any) => {
          const name = product.name || product.productName || '';
          const code = product.code || product.productCode || '';
          const unitPrice = this.toNumber(product.priceAfterDiscount ?? product.retailPrice ?? product.price ?? product.sellingPrice);
          return {
            id: product._id || product.id || product.productId,
            name,
            unitPrice,
            displayLabel: [name, code].filter(Boolean).join(' - ')
          };
        }).filter((item) => item.id);
        state.showOptions = state.options.length > 0;
      },
      error: () => {
        state.isSearching = false;
        state.options = [];
      }
    });
  }

  selectProduct(kind: 'materials' | 'components', index: number, option: SearchOption): void {
    const group = (kind === 'materials' ? this.materials : this.additionalComponents).at(index) as FormGroup;
    group.patchValue({
      productId: option.id,
      name: option.name,
      unitPrice: option.unitPrice ?? group.get('unitPrice')?.value ?? 0
    });
    const state = this.getLineState(kind, index);
    state.query = option.displayLabel;
    state.showOptions = false;
    this.recalculateSummary();
  }

  submit(): void {
    this.submitAttempted = true;
    this.recalculateSummary();
    if (this.form.invalid || !this.isBusinessValid()) {
      this.form.markAllAsTouched();
      this.showToast('Please fix the highlighted fields.', 'يرجى تصحيح الحقول المحددة.', 'error');
      return;
    }

    const payload = this.buildPayload();
    this.isSaving = true;
    const request = this.mode === 'edit' && this.saleId
      ? this.customSalesService.updateCustomSale(this.saleId, payload)
      : this.customSalesService.createCustomSale(payload);

    request.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        const id = res?._id || res?.invoiceId || this.saleId;
        this.showToast(
          this.mode === 'edit' ? 'Custom Sale updated.' : 'Custom Sale created.',
          this.mode === 'edit' ? 'تم تحديث البيع المخصص.' : 'تم إنشاء البيع المخصص.',
          'success'
        );
        this.router.navigate(id ? ['/custom-sales', id] : ['/custom-sales']);
      },
      error: (err) => {
        this.isSaving = false;
        this.showToast(this.extractError(err, 'Failed to save Custom Sale.'), 'تعذر حفظ البيع المخصص.', 'error');
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/custom-sales']);
  }

  fieldInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || this.submitAttempted);
  }

  lineInvalid(group: FormGroup, name: string): boolean {
    const control = group.get(name);
    return !!control && control.invalid && (control.touched || this.submitAttempted);
  }

  get discountTooHigh(): boolean {
    return this.toNumber(this.form.get('discountAmount')?.value) > this.summary.subtotal;
  }

  get paidTooHigh(): boolean {
    return this.toNumber(this.form.get('initialPaidAmount')?.value) > this.summary.totalPrice;
  }

  private loadSale(): void {
    this.isLoading = true;
    this.loadError = '';
    this.customSalesService.getCustomSaleById(this.saleId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.patchSale(res?.data ?? res?.sale ?? res);
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = this.extractError(err, 'Failed to load Custom Sale.');
      }
    });
  }

  private patchSale(sale: CustomSale): void {
    this.resetArray(this.materials, this.materialStates);
    this.resetArray(this.additionalComponents, this.componentStates);

    (sale.materials?.length ? sale.materials : [{ name: '', quantity: 1, unitPrice: 0 }]).forEach((item) => {
      this.materials.push(this.createLineItemGroup(item, true));
      this.materialStates.push(this.emptyLineState());
    });
    (sale.additionalComponents?.length ? sale.additionalComponents : [{ name: '', quantity: 1, unitPrice: 0 }]).forEach((item) => {
      this.additionalComponents.push(this.createLineItemGroup(item, false));
      this.componentStates.push(this.emptyLineState());
    });

    this.form.patchValue({
      customerId: sale.customerId || null,
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      sellingDate: this.toDate(sale.sellingDate) || new Date(),
      deliveryDate: this.toDate(sale.deliveryDate),
      finalProductName: sale.finalProductName || '',
      description: sale.description || '',
      quantity: sale.quantity || 1,
      laborCost: sale.laborCost || 0,
      discountAmount: sale.discountAmount || 0,
      initialPaidAmount: sale.paidAmount || 0,
      notes: sale.notes || ''
    });
    this.recalculateSummary();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      customerId: [null],
      customerName: ['', Validators.required],
      customerPhone: [''],
      sellingDate: [new Date(), Validators.required],
      deliveryDate: [null],
      finalProductName: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      materials: this.fb.array([]),
      additionalComponents: this.fb.array([]),
      laborCost: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      initialPaidAmount: [0, [Validators.min(0)]],
      notes: ['']
    });
  }

  private createLineItemGroup(item?: Partial<CustomSaleLineItem>, includeManualCost = true): FormGroup {
    const controls: Record<string, unknown> = {
      productId: [item?.productId ?? null],
      name: [item?.name ?? '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.000001)]],
      unit: [item?.unit ?? ''],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      totalCost: [{ value: item?.totalCost ?? 0, disabled: true }]
    };

    if (includeManualCost) {
      controls['manualCost'] = [item?.manualCost ?? 0, [Validators.min(0)]];
    }

    return this.fb.group(controls);
  }

  private recalculateSummary(): void {
    this.updateMaterialTotals();
    this.updateComponentTotals();
    const materialsCost = this.sumLineItems(this.materials, true);
    const additionalComponentsCost = this.sumLineItems(this.additionalComponents, false);
    const laborCost = this.toNumber(this.form.get('laborCost')?.value);
    const discount = this.toNumber(this.form.get('discountAmount')?.value);
    const paidAmount = this.toNumber(this.form.get('initialPaidAmount')?.value);
    const subtotal = materialsCost + additionalComponentsCost + laborCost;
    const totalPrice = Math.max(subtotal - discount, 0);
    this.summary = {
      materialsCost,
      additionalComponentsCost,
      laborCost,
      subtotal,
      discount,
      totalPrice,
      paidAmount,
      remainingAmount: Math.max(totalPrice - paidAmount, 0),
      profitAmount: totalPrice - (materialsCost + additionalComponentsCost + laborCost)
    };
  }

  private updateMaterialTotals(): void {
    this.materials.controls.forEach((control) => {
      const group = control as FormGroup;
      const total = this.toNumber(group.get('quantity')?.value)
        * (this.toNumber(group.get('unitPrice')?.value) + this.toNumber(group.get('manualCost')?.value));
      group.get('totalCost')?.setValue(total, { emitEvent: false });
    });
  }

  private updateComponentTotals(): void {
    this.additionalComponents.controls.forEach((control) => {
      const group = control as FormGroup;
      const total = this.toNumber(group.get('quantity')?.value) * this.toNumber(group.get('unitPrice')?.value);
      group.get('totalCost')?.setValue(total, { emitEvent: false });
    });
  }

  private sumLineItems(array: FormArray, includeManualCost: boolean): number {
    return array.getRawValue().reduce((sum: number, item: CustomSaleLineItem) => {
      const manualCost = includeManualCost ? this.toNumber(item.manualCost) : 0;
      return sum + this.toNumber(item.quantity) * (this.toNumber(item.unitPrice) + manualCost);
    }, 0);
  }

  private isBusinessValid(): boolean {
    return !this.discountTooHigh && !this.paidTooHigh;
  }

  private buildPayload(): CustomSalePayload {
    const raw = this.form.getRawValue();
    return {
      customerId: raw.customerId || undefined,
      customerName: String(raw.customerName || '').trim(),
      customerPhone: raw.customerPhone || undefined,
      sellingDate: this.formatDate(raw.sellingDate),
      deliveryDate: raw.deliveryDate ? this.formatDate(raw.deliveryDate) : undefined,
      finalProductName: String(raw.finalProductName || '').trim(),
      description: raw.description || undefined,
      quantity: this.toNumber(raw.quantity),
      materials: this.cleanLines(raw.materials, true),
      additionalComponents: this.cleanLines(raw.additionalComponents, false),
      laborCost: this.toNumber(raw.laborCost),
      discountAmount: this.toNumber(raw.discountAmount),
      initialPaidAmount: this.toNumber(raw.initialPaidAmount),
      notes: raw.notes || undefined
    };
  }

  private cleanLines(lines: CustomSaleLineItem[], includeManualCost: boolean): CustomSaleLineItem[] {
    return (lines || [])
      .filter((line) => String(line.name || '').trim())
      .map((line) => {
        const quantity = this.toNumber(line.quantity);
        const unitPrice = this.toNumber(line.unitPrice);
        const manualCost = includeManualCost ? this.toNumber(line.manualCost) : 0;
        const payload: CustomSaleLineItem = {
          productId: line.productId || undefined,
          name: String(line.name || '').trim(),
          quantity,
          unit: line.unit || undefined,
          unitPrice
        };

        if (includeManualCost) {
          payload.manualCost = manualCost;
        }

        return payload;
      });
  }

  private formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private toDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private resetArray(array: FormArray, states: LineState[]): void {
    array.clear();
    states.splice(0, states.length);
  }

  private getLineState(kind: 'materials' | 'components', index: number): LineState {
    return kind === 'materials' ? this.materialStates[index] : this.componentStates[index];
  }

  private emptyLineState(): LineState {
    return { options: [], isSearching: false, showOptions: false, query: '' };
  }

  private emptySummary(): CustomSaleSummary {
    return {
      materialsCost: 0,
      additionalComponentsCost: 0,
      laborCost: 0,
      subtotal: 0,
      discount: 0,
      totalPrice: 0,
      paidAmount: 0,
      remainingAmount: 0,
      profitAmount: 0
    };
  }

  private extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.customers)) return response.customers;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.products)) return response.data.products;
    if (Array.isArray(response?.data?.customers)) return response.data.customers;
    return [];
  }

  private toNumber(value: unknown): number {
    const numberValue = Number(value ?? 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private updateDirection(): void {
    this.direction = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  private showToast(english: string, arabic: string, type: 'success' | 'error'): void {
    this.snackBar.open(this.translate.currentLang === 'ar' ? arabic : english, undefined, {
      duration: type === 'success' ? 3500 : 6000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`operation-snackbar--${type}`]
    });
  }

  private extractError(error: unknown, fallback: string): string {
    const err = error as any;
    return err?.error?.message || err?.message || fallback;
  }
}
