import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DatePickerModule } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ThemeService } from '../../../shared/services/theme.service';
import { CustomSale, CustomSaleFilters } from '../../models/custom-sales.models';
import { CustomSalesService } from '../../services/custom-sales.service';

@Component({
  selector: 'app-custom-sales-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SideNavComponent,
    TranslatePipe,
    MatSnackBarModule,
    Dialog,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    ButtonModule,
    TableModule,
  ],
  templateUrl: './custom-sales-list.component.html',
  styleUrl: './custom-sales-list.component.scss',
})
export class CustomSalesListComponent implements OnInit {
  isDarkMode$;
  direction: 'rtl' | 'ltr' = 'ltr';
  sales: CustomSale[] = [];
  isLoading = false;
  errorMessage = '';
  search = '';
  status = '';
  sellingDate: Date | null = null;
  deliveryDate: Date | null = null;
  page = 1;
  limit = 10;
  totalRecords = 0;
  sortBy = 'sellingDate';
  sortOrder: 'asc' | 'desc' = 'desc';
  confirmVisible = false;
  confirmAction: 'delete' | 'cancel' | 'deliver' | null = null;
  selectedSale: CustomSale | null = null;
  paymentVisible = false;
  paymentAmount: number | null = null;
  paymentDate: Date = new Date();
  paymentNote = '';
  isActionSaving = false;
  statusOptions: Array<{ label: string; value: string }> = [];
  readonly isBrowser: boolean;

  constructor(
    private readonly customSalesService: CustomSalesService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly translate: TranslateService,
    private readonly themeService: ThemeService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.updateDirection();
    this.translate.onLangChange.subscribe(() => this.updateDirection());
    if (this.isBrowser) {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
      this.cdr.detectChanges();
    }
    this.loadSales();
  }

  loadSales(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.customSalesService.getCustomSales(this.buildFilters()).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.sales = this.extractRows(res);
        this.totalRecords = Number(
          res?.total ?? res?.totalRecords ?? res?.pagination?.total ?? this.sales.length,
        );
      this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractError(err, 'Failed to load Custom Sales.');
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadSales();
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.sellingDate = null;
    this.deliveryDate = null;
    this.page = 1;
    this.loadSales();
  }

  sort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.loadSales();
  }

  nextPage(): void {
    if (this.page * this.limit >= this.totalRecords) return;
    this.page += 1;
    this.loadSales();
  }

  previousPage(): void {
    if (this.page === 1) return;
    this.page -= 1;
    this.loadSales();
  }

  createSale(): void {
    this.router.navigate(['/custom-sales/create']);
  }

  viewSale(sale: CustomSale): void {
    this.router.navigate(['/custom-sales', this.getSaleId(sale)]);
  }

  editSale(sale: CustomSale): void {
    this.router.navigate(['/custom-sales', this.getSaleId(sale), 'edit']);
  }

  openPayment(sale: CustomSale): void {
    this.selectedSale = sale;
    this.paymentAmount = null;
    this.paymentDate = new Date();
    this.paymentNote = '';
    this.paymentVisible = true;
  }

  savePayment(): void {
    if (!this.selectedSale || !this.paymentAmount || this.paymentAmount <= 0) {
      this.showToast('Enter a valid payment amount.', 'أدخل مبلغ دفع صالح.', 'error');
      return;
    }
    if (this.paymentAmount > this.amount(this.selectedSale.remainingAmount)) {
      this.showToast(
        'Payment amount cannot exceed the remaining amount.',
        'لا يمكن أن يتجاوز الدفع المبلغ المتبقي.',
        'error',
      );
      return;
    }
    this.isActionSaving = true;
    this.customSalesService
      .addPayment(this.getSaleId(this.selectedSale), {
        amount: this.paymentAmount,
        paymentDate: this.formatDate(this.paymentDate),
        note: this.paymentNote || undefined,
      })
      .subscribe({
        next: () => {
          this.isActionSaving = false;
          this.paymentVisible = false;
          this.showToast('Payment added.', 'تمت إضافة الدفع.', 'success');
          this.loadSales();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isActionSaving = false;
          this.showToast(
            this.extractError(err, 'Failed to add payment.'),
            'تعذر إضافة الدفع.',
            'error',
          );
          this.cdr.detectChanges();
        },
      });
  }

  openConfirm(action: 'delete' | 'cancel' | 'deliver', sale: CustomSale): void {
    this.confirmAction = action;
    this.selectedSale = sale;
    this.confirmVisible = true;
  }

  runConfirmedAction(): void {
    if (!this.selectedSale || !this.confirmAction) return;
    this.isActionSaving = true;
    const id = this.getSaleId(this.selectedSale);
    const request =
      this.confirmAction === 'delete'
        ? this.customSalesService.deleteCustomSale(id)
        : this.confirmAction === 'cancel'
          ? this.customSalesService.cancelCustomSale(id)
          : this.customSalesService.markDelivered(id);
    request.subscribe({
      next: () => {
        const action = this.confirmAction;
        this.isActionSaving = false;
        this.confirmVisible = false;
        this.showToast(
          action === 'delete'
            ? 'Custom Sale deleted.'
            : action === 'cancel'
              ? 'Custom Sale cancelled.'
              : 'Custom Sale marked delivered.',
          action === 'delete'
            ? 'تم حذف البيع المخصص.'
            : action === 'cancel'
              ? 'تم إلغاء البيع المخصص.'
              : 'تم تحديد البيع المخصص كمسلم.',
          'success',
        );
        this.loadSales();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isActionSaving = false;
        this.showToast(this.extractError(err, 'Action failed.'), 'فشلت العملية.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  printSale(sale: CustomSale): void {
    this.customSalesService.getCustomSaleById(this.getSaleId(sale)).subscribe({
      next: (res: any) => this.openPrint(res?.data ?? res?.sale ?? res),
      error: (err) =>
        this.showToast(
          this.extractError(err, 'Failed to load printable invoice.'),
          'تعذر تحميل الفاتورة للطباعة.',
          'error',
        ),
      complete: () => this.cdr.detectChanges(),
    });
  }

  getSaleId(sale: CustomSale): string {
    return sale._id || sale.invoiceId || '';
  }

  amount(value: unknown): number {
    const numberValue = Number(value ?? 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  statusLabel(status?: string | null): string {
    if (!status) return '-';
    const key = `customSales.statuses.${status}`;
    const translated = this.translate.instant(key);
    return translated === key ? status : translated;
  }

  statusClass(status?: string | null): string {
    switch (status) {
      case 'pending':
        return 'status-pill--pending';
      case 'partially_paid':
        return 'status-pill--partially-paid';
      case 'paid':
        return 'status-pill--paid';
      case 'delivered':
        return 'status-pill--delivered';
      case 'cancelled':
        return 'status-pill--cancelled';
      default:
        return 'status-pill--default';
    }
  }

  formatDisplayDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  private buildFilters(): CustomSaleFilters {
    const filter: CustomSaleFilters = {
      page: this.page,
      limit: this.limit,
      status: this.status || undefined,
      sellingDate: this.sellingDate ? this.formatDate(this.sellingDate) : undefined,
      deliveryDate: this.deliveryDate ? this.formatDate(this.deliveryDate) : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
    const query = this.search.trim();
    if (query) {
      filter.search = query;
      filter.customerName = query;
      filter.customerPhone = query;
      filter.invoiceNumber = query;
      filter.finalProductName = query;
    }
    return filter;
  }

  private extractRows(response: any): CustomSale[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.sales)) return response.sales;
    if (Array.isArray(response?.invoices)) return response.invoices;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.sales)) return response.data.sales;
    return [];
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private updateDirection(): void {
    this.direction = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.statusOptions = this.createStatusOptions();
  }

  private createStatusOptions(): Array<{ label: string; value: string }> {
    return [
      { label: this.translate.instant('customSales.statuses.all'), value: '' },
      { label: this.translate.instant('customSales.statuses.pending'), value: 'pending' },
      {
        label: this.translate.instant('customSales.statuses.partially_paid'),
        value: 'partially_paid',
      },
      { label: this.translate.instant('customSales.statuses.paid'), value: 'paid' },
      { label: this.translate.instant('customSales.statuses.delivered'), value: 'delivered' },
      { label: this.translate.instant('customSales.statuses.cancelled'), value: 'cancelled' },
    ];
  }

  private openPrint(sale: CustomSale): void {
    if (!this.isBrowser) return;
    const html = `
      <html><head><title>Custom Sales ${sale.invoiceNumber || ''}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#222;margin:32px}
        h1{color:#ff9933}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0}
        table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f4f4f4}.totals{max-width:360px;margin-left:auto}.totals div{display:flex;justify-content:space-between;padding:5px 0}
      </style></head><body>
      <h1>Kapomatic Inventory System</h1><h2>Custom Sales Invoice</h2>
      <div class="meta">
        <div><b>Invoice Number:</b> ${sale.invoiceNumber || '-'}</div>
        <div><b>Status:</b> ${this.statusLabel(sale.status)}</div>
        <div><b>Customer:</b> ${sale.customerName || '-'}</div>
        <div><b>Phone:</b> ${sale.customerPhone || '-'}</div>
        <div><b>Selling Date:</b> ${this.formatDisplayDate(sale.sellingDate)}</div>
        <div><b>Delivery Date:</b> ${this.formatDisplayDate(sale.deliveryDate)}</div>
        <div><b>Final Product:</b> ${sale.finalProductName || '-'}</div>
        <div><b>Quantity:</b> ${sale.quantity ?? '-'}</div>
      </div>
      ${this.printTable('Materials', sale.materials || [])}
      ${this.printTable('Additional Components', sale.additionalComponents || [])}
      ${this.printPayments(sale.payments || [])}
      <div class="totals">
        <div><span>Labor Cost</span><b>${this.amount(sale.laborCost).toFixed(2)}</b></div>
        <div><span>Discount</span><b>${this.amount(sale.discountAmount).toFixed(2)}</b></div>
        <div><span>Total Price</span><b>${this.amount(sale.totalPrice).toFixed(2)}</b></div>
        <div><span>Paid Amount</span><b>${this.amount(sale.paidAmount).toFixed(2)}</b></div>
        <div><span>Remaining Amount</span><b>${this.amount(sale.remainingAmount).toFixed(2)}</b></div>
      </div>
      <p><b>Notes:</b> ${sale.notes || '-'}</p>
      </body></html>`;
    const win = window.open('', '_blank', 'width=980,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  private printTable(title: string, rows: any[]): string {
    const isMaterials = title === 'Materials';
    return `<h3>${title}</h3><table><thead><tr><th>Name</th><th>Qty</th><th>Unit</th><th>Unit Price</th>${isMaterials ? '<th>Manual Cost</th>' : ''}<th>Total</th></tr></thead><tbody>
      ${
        rows.length
          ? rows
              .map((row) => {
                const manualCost = isMaterials ? this.amount(row.manualCost) : 0;
                const total = this.amount(
                  row.totalCost ?? row.quantity * (this.amount(row.unitPrice) + manualCost),
                );
                return `<tr><td>${row.name || '-'}</td><td>${row.quantity ?? '-'}</td><td>${row.unit || '-'}</td><td>${this.amount(row.unitPrice).toFixed(2)}</td>${isMaterials ? `<td>${manualCost.toFixed(2)}</td>` : ''}<td>${total.toFixed(2)}</td></tr>`;
              })
              .join('')
          : `<tr><td colspan="${isMaterials ? 6 : 5}">No rows</td></tr>`
      }
    </tbody></table>`;
  }

  private printPayments(rows: any[]): string {
    return `<h3>Payment History</h3><table><thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead><tbody>
      ${rows.length ? rows.map((row) => `<tr><td>${this.formatDisplayDate(row.paymentDate)}</td><td>${this.amount(row.amount).toFixed(2)}</td><td>${row.note || '-'}</td></tr>`).join('') : '<tr><td colspan="3">No payments</td></tr>'}
    </tbody></table>`;
  }

  private showToast(english: string, arabic: string, type: 'success' | 'error'): void {
    this.snackBar.open(this.translate.currentLang === 'ar' ? arabic : english, undefined, {
      duration: type === 'success' ? 3500 : 6000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`operation-snackbar--${type}`],
    });
  }

  private extractError(error: unknown, fallback: string): string {
    const err = error as any;
    return err?.error?.message || err?.message || fallback;
  }
}
