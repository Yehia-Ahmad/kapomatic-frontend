import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { ThemeService } from '../../../shared/services/theme.service';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ProductsService } from '../../services/products.service';
import { format as formatDate } from 'date-fns';
import { CustomersService } from '../../../customer/services/customers.service';

type PriceType = 'wholesalePrice' | 'retailPrice' | 'custom';

type ProductSearchResult = {
  id: string;
  name: string;
  code: string;
  displayLabel: string;
  categoryName: string;
  wholesalePrice: number | null;
  retailPrice: number | null;
};

type CustomerSearchResult = {
  id: string;
  name: string;
  phone: string;
  displayLabel: string;
};

@Component({
  selector: 'app-selling',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SideNavComponent,
    TranslatePipe,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    ButtonModule,
    Dialog
  ],
  templateUrl: './selling.component.html',
  styleUrl: './selling.component.scss'
})
export class SellingComponent implements OnInit {
  isDarkMode$;
  direction: 'rtl' | 'ltr' = 'ltr';
  private isBrowser: boolean;
  private latestRequestedQuery = '';
  private latestRequestedCustomerQuery = '';
  private searchBlurTimer: ReturnType<typeof setTimeout> | null = null;
  private customerSearchBlurTimer: ReturnType<typeof setTimeout> | null = null;
  searchInputValue = '';
  customerSearchInputValue = '';
  showSuggestionPanel = false;
  showCustomerSuggestionPanel = false;
  productOptions: ProductSearchResult[] = [];
  customerOptions: CustomerSearchResult[] = [];
  selectedProductOption: ProductSearchResult | null = null;
  selectedCustomerOption: CustomerSearchResult | null = null;
  sellingForm: FormGroup;
  isSearching = false;
  isSearchingCustomers = false;
  isSaving = false;
  successDialogVisible = false;
  errorDialogVisible = false;
  searchError = '';
  customerSearchError = '';
  saveError = '';
  saveSuccess = '';
  selectedProduct: ProductSearchResult | null = null;

  priceTypeOptions = [
    { label: '', value: 'wholesalePrice' },
    { label: '', value: 'retailPrice' },
    { label: '', value: 'custom' }
  ];

  constructor(
    private _themeService: ThemeService,
    private _router: Router,
    private _fb: FormBuilder,
    private _productsService: ProductsService,
    private _customersService: CustomersService,
    private _translate: TranslateService,
    private _cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isDarkMode$ = this._themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
    this.sellingForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.updateDirection();
    this.setPriceTypeOptions();
    this._translate.onLangChange.subscribe(() => {
      this.updateDirection();
      this.setPriceTypeOptions();
    });

    if (!this.isBrowser) return;
    localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');

    this.sellingForm.get('priceType')?.valueChanges.subscribe((value) => {
      this.applyPriceType(value as PriceType);
    });

    this.sellingForm.get('price')?.valueChanges.subscribe(() => this.updateTotalInvoicePrice());
    this.sellingForm.get('quantity')?.valueChanges.subscribe(() => this.updateTotalInvoicePrice());
  }

  backToProducts(): void {
    if (this.isBrowser) {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
    }
    this._router.navigate(['/home']);
  }

  get isCustomPrice(): boolean {
    return this.sellingForm.get('priceType')?.value === 'custom';
  }

  onSearchInputChange(event: Event): void {
    const query = String((event.target as HTMLInputElement)?.value || '').trim();
    this.searchError = '';
    this.searchInputValue = String((event.target as HTMLInputElement)?.value || '');

    if (!query) {
      this.productOptions = [];
      this.isSearching = false;
      this.latestRequestedQuery = '';
      this.showSuggestionPanel = false;
      this.selectedProductOption = null;
      this.onProductSelectionChange(null);
      return;
    }

    if (this.selectedProduct && query !== this.selectedProduct.displayLabel) {
      this.selectedProductOption = null;
      this.onProductSelectionChange(null);
    }

    this.fetchProductOptions(query);
  }

  onCustomerSearchInputChange(event: Event): void {
    const value = String((event.target as HTMLInputElement)?.value || '');
    const query = value.trim();

    this.customerSearchError = '';
    this.customerSearchInputValue = value;

    if (!query) {
      this.customerOptions = [];
      this.isSearchingCustomers = false;
      this.latestRequestedCustomerQuery = '';
      this.showCustomerSuggestionPanel = false;
      this.selectedCustomerOption = null;
      return;
    }

    if (this.selectedCustomerOption && query !== this.selectedCustomerOption.displayLabel) {
      this.selectedCustomerOption = null;
    }

    this.fetchCustomerOptions(query);
  }

  onSearchInputFocus(): void {
    if (this.searchBlurTimer) {
      clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }

    if (this.productOptions.length > 0 || this.isSearching) {
      this.showSuggestionPanel = true;
    }
  }

  onCustomerSearchInputFocus(): void {
    if (this.customerSearchBlurTimer) {
      clearTimeout(this.customerSearchBlurTimer);
      this.customerSearchBlurTimer = null;
    }

    if (this.customerOptions.length > 0 || this.isSearchingCustomers) {
      this.showCustomerSuggestionPanel = true;
    }
  }

  onSearchInputBlur(): void {
    this.searchBlurTimer = setTimeout(() => {
      this.showSuggestionPanel = false;
      this._cdr.detectChanges();
    }, 180);
  }

  onCustomerSearchInputBlur(): void {
    this.customerSearchBlurTimer = setTimeout(() => {
      this.showCustomerSuggestionPanel = false;
      this._cdr.detectChanges();
    }, 180);
  }

  onNativeOptionSelect(product: ProductSearchResult): void {
    if (this.searchBlurTimer) {
      clearTimeout(this.searchBlurTimer);
      this.searchBlurTimer = null;
    }

    this.selectedProductOption = product;
    this.searchInputValue = product.displayLabel;
    this.showSuggestionPanel = false;
    this.onProductSelectionChange(product);
  }

  onCustomerOptionSelect(customer: CustomerSearchResult): void {
    if (this.customerSearchBlurTimer) {
      clearTimeout(this.customerSearchBlurTimer);
      this.customerSearchBlurTimer = null;
    }

    this.selectedCustomerOption = customer;
    this.customerSearchInputValue = customer.displayLabel;
    this.showCustomerSuggestionPanel = false;
    this.customerSearchError = '';
    this.sellingForm.patchValue({
      customerName: customer.name,
      customerPhone: customer.phone
    });
  }

  onProductSelectionChange(product: ProductSearchResult | null): void {
    this.searchError = '';

    if (!product) {
      this.selectedProduct = null;
      this.clearProductData();
      return;
    }

    this.selectedProduct = product;
    this.sellingForm.patchValue({
      productId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
    });

    this.applyPriceType(this.sellingForm.get('priceType')?.value as PriceType);
  }

  private fetchProductOptions(query: string): void {
    this.latestRequestedQuery = query;

    this.isSearching = true;
    this.searchError = '';
    this.saveError = '';
    this.saveSuccess = '';

    this._productsService.searchProducts(query).subscribe({
      next: (res: any) => {
        if (query !== this.latestRequestedQuery) {
          return;
        }

        this.isSearching = false;
        this.productOptions = this.extractProducts(res);
        this.showSuggestionPanel = this.productOptions.length > 0 && this.searchInputValue.trim().length > 0;

        if (!this.productOptions.length) {
          this.searchError = this.translateKey('sellingPage.messages.noProductFound');
        }

        if (this.selectedProduct) {
          const stillAvailable = this.productOptions.some((item) => item.id === this.selectedProduct?.id);
          if (!stillAvailable) {
            this.selectedProductOption = null;
            this.onProductSelectionChange(null);
          }
        }

        this._cdr.detectChanges();
      },
      error: (err: any) => {
        if (query !== this.latestRequestedQuery) {
          return;
        }

        this.isSearching = false;
        this.selectedProduct = null;
        this.selectedProductOption = null;
        this.productOptions = [];
        this.showSuggestionPanel = false;
        this.clearProductData();
        this.searchError = err?.error?.message || this.translateKey('sellingPage.messages.searchFailed');
        this._cdr.detectChanges();
      }
    });
  }

  private fetchCustomerOptions(query: string): void {
    this.latestRequestedCustomerQuery = query;
    this.isSearchingCustomers = true;
    this.customerSearchError = '';

    this._customersService.getCustomers({ search: query }).subscribe({
      next: (res: any) => {
        if (query !== this.latestRequestedCustomerQuery) {
          return;
        }

        this.isSearchingCustomers = false;
        this.customerOptions = this.extractCustomerOptions(res);
        this.showCustomerSuggestionPanel = this.customerOptions.length > 0 && this.customerSearchInputValue.trim().length > 0;

        if (!this.customerOptions.length) {
          this.customerSearchError = this.translateKey('sellingPage.messages.noCustomerFound');
        }

        this._cdr.detectChanges();
      },
      error: (err: any) => {
        if (query !== this.latestRequestedCustomerQuery) {
          return;
        }

        this.isSearchingCustomers = false;
        this.selectedCustomerOption = null;
        this.customerOptions = [];
        this.showCustomerSuggestionPanel = false;
        this.customerSearchError = err?.error?.message || this.translateKey('sellingPage.messages.customerSearchFailed');
        this._cdr.detectChanges();
      }
    });
  }

  saveSelling(): void {
    this.errorDialogVisible = false;
    this.saveError = '';
    this.saveSuccess = '';

    if (this.sellingForm.invalid) {
      this.sellingForm.markAllAsTouched();
      return;
    }

    const raw = this.sellingForm.getRawValue();
    const payload = {
      productId: raw.productId,
      customerName: raw.customerName?.trim(),
      customerPhone: raw.customerPhone?.trim(),
      sellingDate: this.formatSellingDate(raw.sellingDate),
      quantity: Number(raw.quantity),
      price: Number(raw.price),
    };

    this.isSaving = true;
    this._productsService.createSelling(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.successDialogVisible = true;
        this.resetSellingForm();
        this._cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.saveError = err?.error?.message || this.translateKey('sellingPage.messages.createFailed');
        this.errorDialogVisible = true;
        this._cdr.detectChanges();
      }
    });
  }

  closeSuccessPopup(): void {
    this.successDialogVisible = false;
  }

  closeErrorPopup(): void {
    this.errorDialogVisible = false;
  }

  private setPriceTypeOptions(): void {
    this.priceTypeOptions = [
      {
        label: this.translateKey('sellingPage.priceTypeOptions.wholesalePrice'),
        value: 'wholesalePrice'
      },
      {
        label: this.translateKey('sellingPage.priceTypeOptions.retailPrice'),
        value: 'retailPrice'
      },
      {
        label: this.translateKey('sellingPage.priceTypeOptions.custom'),
        value: 'custom'
      }
    ];
  }

  private updateDirection(): void {
    const lang = this._translate.currentLang || this._translate.getDefaultLang() || 'en';
    this.direction = lang === 'ar' ? 'rtl' : 'ltr';
  }

  private translateKey(key: string): string {
    return this._translate.instant(key);
  }

  private initializeForm(): FormGroup {
    return this._fb.group({
      productId: [null, Validators.required],
      productName: [{ value: '', disabled: true }],
      categoryName: [{ value: '', disabled: true }],
      priceType: ['wholesalePrice', Validators.required],
      price: [{ value: null, disabled: true }, [Validators.required, Validators.min(0.01)]],
      customerName: ['', Validators.required],
      customerPhone: [''],
      sellingDate: [this.getTodayDate(), Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      totalInvoicePrice: [{ value: 0, disabled: true }]
    });
  }

  private applyPriceType(priceType: PriceType): void {
    const priceControl = this.sellingForm.get('price');
    if (!priceControl) return;

    if (priceType === 'custom') {
      priceControl.enable({ emitEvent: false });
      this.updateTotalInvoicePrice();
      return;
    }

    const selectedPrice = this.selectedProduct?.[priceType] ?? null;
    priceControl.setValue(selectedPrice);
    priceControl.disable({ emitEvent: false });
    this.updateTotalInvoicePrice();
  }

  private updateTotalInvoicePrice(): void {
    const raw = this.sellingForm.getRawValue();
    const price = Number(raw.price || 0);
    const quantity = Number(raw.quantity || 0);
    const total = Number.isFinite(price * quantity) ? price * quantity : 0;
    this.sellingForm.get('totalInvoicePrice')?.setValue(total, { emitEvent: false });
  }

  private formatSellingDate(value: Date | string): string {
    if (value instanceof Date) {
      return formatDate(value, 'yyyy-MM-dd');
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDate(parsed, 'yyyy-MM-dd');
    }

    return String(value);
  }

  private clearProductData(): void {
    this.sellingForm.patchValue({
      productId: null,
      productName: '',
      categoryName: '',
      price: null,
      totalInvoicePrice: 0
    });
  }

  private resetSellingForm(): void {
    this.searchInputValue = '';
    this.customerSearchInputValue = '';
    this.productOptions = [];
    this.customerOptions = [];
    this.selectedProductOption = null;
    this.selectedCustomerOption = null;
    this.selectedProduct = null;
    this.showSuggestionPanel = false;
    this.showCustomerSuggestionPanel = false;
    this.latestRequestedQuery = '';
    this.latestRequestedCustomerQuery = '';
    this.searchError = '';
    this.customerSearchError = '';
    this.saveError = '';
    this.saveSuccess = '';

    this.sellingForm.reset({
      productId: null,
      productName: '',
      categoryName: '',
      priceType: 'wholesalePrice',
      price: null,
      customerName: '',
      customerPhone: '',
      sellingDate: this.getTodayDate(),
      quantity: 1,
      totalInvoicePrice: 0
    });

    this.applyPriceType('wholesalePrice');
  }

  private getTodayDate(): Date {
    return new Date();
  }

  private extractProducts(response: any): ProductSearchResult[] {
    let list: any[] = [];

    if (Array.isArray(response)) {
      list = response;
    } else if (Array.isArray(response?.data)) {
      list = response.data;
    } else if (Array.isArray(response?.products)) {
      list = response.products;
    } else if (response?.data && typeof response.data === 'object') {
      list = [response.data];
    } else if (response && typeof response === 'object') {
      list = [response];
    }

    return list
      .map((candidate) => this.mapProduct(candidate))
      .filter((item): item is ProductSearchResult => item !== null);
  }

  private extractCustomerOptions(response: any): CustomerSearchResult[] {
    let list: any[] = [];

    if (Array.isArray(response)) {
      list = response;
    } else if (Array.isArray(response?.data?.customers)) {
      list = response.data.customers;
    } else if (Array.isArray(response?.customers)) {
      list = response.customers;
    } else if (Array.isArray(response?.data)) {
      list = response.data;
    } else if (response?.data && typeof response.data === 'object') {
      list = [response.data];
    } else if (response && typeof response === 'object') {
      list = [response];
    }

    return list
      .map((candidate) => this.mapCustomer(candidate))
      .filter((item): item is CustomerSearchResult => item !== null);
  }

  private mapProduct(candidate: any): ProductSearchResult | null {
    if (!candidate) return null;

    const id = candidate._id || candidate.id || candidate.productId;
    if (!id) return null;

    const name = String(candidate.name || candidate.productName || '').trim();
    const code = String(candidate.code || candidate.productCode || '').trim();
    const categoryName = String(
      candidate.category?.name ||
      candidate.categoryName ||
      candidate.categoryId?.name ||
      ''
    ).trim();

    const displayLabel = [name, code].filter(Boolean).join(' - ') || String(id);

    return {
      id: String(id),
      name,
      code,
      displayLabel,
      categoryName,
      wholesalePrice: this.toNumber(candidate.wholesalePrice),
      retailPrice: this.toNumber(candidate.retailPrice)
    };
  }

  private mapCustomer(candidate: any): CustomerSearchResult | null {
    if (!candidate) return null;

    const id = candidate._id || candidate.id || candidate.customerId;
    if (!id) return null;

    const name = String(candidate.name || candidate.customerName || '').trim();
    const phone = String(candidate.phone || candidate.customerPhone || '').trim();
    const displayLabel = [name, phone].filter(Boolean).join(' - ') || String(id);

    return {
      id: String(id),
      name,
      phone,
      displayLabel
    };
  }

  private toNumber(value: any): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
}
