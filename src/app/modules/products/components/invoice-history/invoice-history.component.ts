import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { ThemeService } from '../../../shared/services/theme.service';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ProductsService } from '../../services/products.service';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CateoryService } from '../../../category/services/cateory.service';
import { WarnComponent } from '../../../assets/warn/warn.component';
import {
  buildFallbackInvoiceNumber,
  buildInvoiceDocument,
  InvoiceHistoryRow,
  InvoicePrintLanguage
} from './invoice-history-print.util';

type SelectOption = {
  label: string;
  value: string;
};

@Component({
  selector: 'app-invoice-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SideNavComponent,
    TranslatePipe,
    TableModule,
    InputTextModule,
    DatePickerModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    WarnComponent
],
  templateUrl: './invoice-history.component.html',
  styleUrl: './invoice-history.component.scss'
})
export class InvoiceHistoryComponent implements OnInit {
  isDarkMode$;
  private isBrowser: boolean;
  isLoading = false;
  loadError = '';
  sellings: InvoiceHistoryRow[] = [];
  isCategoriesLoading = false;
  isProductsLoading = false;
  categoryOptions: SelectOption[] = [];
  productOptions: SelectOption[] = [];
  filterCategoryId = '';
  filterProductId = '';
  filterCustomerName = '';
  filterCustomerPhone = '';
  filterSellingDate: Date | null = null;
  deletingSellingId = '';
  downloadingInvoiceId = '';
  deleteDialogVisible = false;
  selectedSellingToDelete: InvoiceHistoryRow | null = null;

  constructor(
    private _themeService: ThemeService,
    private _router: Router,
    private _productsService: ProductsService,
    private _categoryService: CateoryService,
    private _translate: TranslateService,
    private _cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isDarkMode$ = this._themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
    this.loadCategories();
    this.loadSellings();
  }

  backToProducts(): void {
    if (this.isBrowser) {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
    }
    this._router.navigate(['/home']);
  }

  applyFilters(): void {
    this.loadSellings();
  }

  resetFilters(): void {
    this.filterCategoryId = '';
    this.filterProductId = '';
    this.productOptions = [];
    this.filterCustomerName = '';
    this.filterCustomerPhone = '';
    this.filterSellingDate = null;
    this.loadSellings();
  }

  onCategoryFilterChange(categoryId: string): void {
    this.filterCategoryId = String(categoryId || '');
    this.filterProductId = '';
    this.productOptions = [];

    if (!this.filterCategoryId) {
      return;
    }

    this.loadProductsByCategory(this.filterCategoryId);
  }

  private loadSellings(): void {
    this.isLoading = true;
    this.loadError = '';

    this._productsService.getSellings(this.buildFilterParams()).subscribe({
      next: (response: any) => {
        this.sellings = this.extractSellings(response);
        this.isLoading = false;
        this._cdr.detectChanges();
      },
      error: (err: any) => {
        this.sellings = [];
        this.isLoading = false;
        this.loadError = err?.error?.message || 'Failed to load sellings.';
        this._cdr.detectChanges();
      }
    });
  }

  private buildFilterParams(): {
    categoryId?: string;
    productId?: string;
    customerName?: string;
    customerPhone?: string;
    sellingDate?: string;
  } {
    const categoryId = this.filterCategoryId.trim();
    const productId = this.filterProductId.trim();
    const customerName = this.filterCustomerName.trim();
    const customerPhone = this.filterCustomerPhone.trim();
    const sellingDate = this.formatDateParam(this.filterSellingDate);

    return {
      ...(categoryId ? { categoryId } : {}),
      ...(productId ? { productId } : {}),
      ...(customerName ? { customerName } : {}),
      ...(customerPhone ? { customerPhone } : {}),
      ...(sellingDate ? { sellingDate } : {})
    };
  }

  private formatDateParam(value: Date | null): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0];
  }

  private loadCategories(): void {
    this.isCategoriesLoading = true;

    this._categoryService.getCategories().subscribe({
      next: (response: any) => {
        const categories = this.extractCollection(response);
        this.categoryOptions = categories.map((item: any) => ({
          label: String(item?.name || ''),
          value: String(item?._id || item?.id || '')
        })).filter((item: SelectOption) => Boolean(item.value));

        this.isCategoriesLoading = false;
        this._cdr.detectChanges();
      },
      error: () => {
        this.categoryOptions = [];
        this.isCategoriesLoading = false;
        this._cdr.detectChanges();
      }
    });
  }

  private loadProductsByCategory(categoryId: string): void {
    this.isProductsLoading = true;
    const params = { categoryId };

    this._categoryService.getProducts(categoryId, params).subscribe({
      next: (response: any) => {
        const products = this.extractCollection(response);
        this.productOptions = products.map((item: any) => ({
          label: String(item?.name || item?.productName || ''),
          value: String(item?._id || item?.id || '')
        })).filter((item: SelectOption) => Boolean(item.value));

        this.isProductsLoading = false;
        this._cdr.detectChanges();
      },
      error: () => {
        this.productOptions = [];
        this.isProductsLoading = false;
        this._cdr.detectChanges();
      }
    });
  }

  private extractSellings(response: any): any[] {
    let list: any[] = [];

    if (Array.isArray(response)) {
      list = response;
    } else if (Array.isArray(response?.data?.invoices)) {
      list = response.data.invoices;
    } else if (Array.isArray(response?.data)) {
      list = response.data;
    } else if (Array.isArray(response?.invoices)) {
      list = response.invoices;
    } else if (Array.isArray(response?.sellings)) {
      list = response.sellings;
    } else if (response?.data && typeof response.data === 'object') {
      list = [response.data];
    } else if (response && typeof response === 'object') {
      list = [response];
    }

    return list
      .map((item) => this.mapSelling(item))
      .filter((item): item is InvoiceHistoryRow => item !== null);
  }

  private extractCollection(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.categories)) return response.categories;
    if (response?.data && typeof response.data === 'object') return [response.data];
    if (response && typeof response === 'object') return [response];
    return [];
  }

  private mapSelling(item: any): InvoiceHistoryRow | null {
    if (!item) return null;

    const id = item.invoiceId || item._id || item.id;
    if (!id) return null;
    const normalizedId = String(id);
    const items = this.extractInvoiceItems(item, normalizedId);
    const invoiceNumber = String(
      item.invoiceNumber ||
      item.invoiceNo ||
      item.number ||
      buildFallbackInvoiceNumber(normalizedId)
    );

    return {
      id: normalizedId,
      invoiceId: normalizedId,
      invoiceNumber,
      customerName: String(item.customerName || ''),
      customerPhone: String(item.customerPhone || item.customer?.phone || item.customer?.phoneNumber || ''),
      customerAddress: String(item.customerAddress || item.customer?.address || ''),
      sellingDate: item.sellingDate ? String(item.sellingDate) : (items[0]?.sellingDate || null),
      itemCount: this.toNumber(item.itemCount) ?? items.length,
      totalQuantity: this.toNumber(item.totalQuantity) ?? this.sumInvoiceMetric(items, 'quantity'),
      totalPrice: this.toNumber(item.totalPrice ?? item.total) ?? this.sumInvoiceMetric(items, 'totalPrice'),
      items
    };
  }

  private extractInvoiceItems(source: any, invoiceId: string): InvoiceHistoryRow['items'] {
    if (Array.isArray(source?.items)) {
      return source.items
        .map((item: any, index: number) => this.mapInvoiceItem(item, invoiceId, source, index))
        .filter((item): item is InvoiceHistoryRow['items'][number] => item !== null);
    }

    const legacyItem = this.mapInvoiceItem(source, invoiceId, source, 0);
    return legacyItem ? [legacyItem] : [];
  }

  private mapInvoiceItem(
    item: any,
    invoiceId: string,
    parentInvoice: any,
    index: number
  ): InvoiceHistoryRow['items'][number] | null {
    if (!item) return null;

    const id = item._id || item.id || `${invoiceId}-${item.productId || item.productCode || index}`;

    return {
      id: String(id),
      invoiceId,
      productId: String(item.productId || ''),
      productCode: String(item.productCode || item.product?.code || item.code || ''),
      productName: String(item.productName || item.product?.name || item.name || ''),
      categoryName: String(item.categoryName || item.category?.name || parentInvoice?.categoryName || ''),
      customerName: String(item.customerName || parentInvoice?.customerName || ''),
      customerPhone: String(
        item.customerPhone ||
        item.customer?.phone ||
        item.customer?.phoneNumber ||
        parentInvoice?.customerPhone ||
        parentInvoice?.customer?.phone ||
        parentInvoice?.customer?.phoneNumber ||
        ''
      ),
      sellingDate: item.sellingDate ? String(item.sellingDate) : (parentInvoice?.sellingDate ? String(parentInvoice.sellingDate) : null),
      quantity: this.toNumber(item.productQuantity ?? item.productQuentity ?? item.quantity),
      unitPrice: this.toNumber(item.productPricePerEach ?? item.price),
      totalPrice: this.toNumber(item.totalPrice ?? item.total)
    };
  }

  openWhatsAppChat(phone: string): void {
    const normalizedPhone = this.normalizePhoneForWhatsApp(phone);
    if (!normalizedPhone || !this.isBrowser) return;
    window.open(`https://wa.me/${normalizedPhone}`, '_blank');
  }

  canOpenWhatsApp(phone: string): boolean {
    return Boolean(this.normalizePhoneForWhatsApp(phone));
  }

  downloadInvoice(selling: InvoiceHistoryRow): void {
    if (!this.isBrowser || !selling?.id) {
      return;
    }

    this.downloadingInvoiceId = selling.id;
    this.loadError = '';
    this._cdr.detectChanges();

    try {
      const invoiceWindow = window.open('', '_blank', 'width=1180,height=860');

      if (!invoiceWindow) {
        this.loadError = this.translateKey('invoiceHistoryPage.messages.invoiceWindowBlocked');
        return;
      }

      const language = this.getInvoiceLanguage();
      invoiceWindow.document.open();
      invoiceWindow.document.write(buildInvoiceDocument({
        selling,
        language,
        logoUrl: this.resolveAssetUrl('assets/img/Kapo.jpeg'),
        fontUrl: this.resolveAssetUrl('assets/fonts/Montserrat-VariableFont_wght.ttf')
      }));
      invoiceWindow.document.close();
      invoiceWindow.focus();
    } catch {
      this.loadError = this.translateKey('invoiceHistoryPage.messages.invoiceDownloadFailed');
    } finally {
      this.downloadingInvoiceId = '';
      this._cdr.detectChanges();
    }
  }

  isDownloadingInvoice(sellingId: string): boolean {
    return this.downloadingInvoiceId === sellingId;
  }

  openDeleteDialog(selling: InvoiceHistoryRow): void {
    if (!selling?.id) {
      return;
    }

    this.selectedSellingToDelete = selling;
    this.deleteDialogVisible = true;
  }

  closeDeleteDialog(): void {
    if (this.isDeletingSelectedSelling) {
      return;
    }

    this.deleteDialogVisible = false;
    this.selectedSellingToDelete = null;
  }

  deleteSelling(): void {
    const selling = this.selectedSellingToDelete;
    if (!selling?.id) {
      return;
    }

    this.deletingSellingId = selling.id;
    this.loadError = '';

    this._productsService.deleteSelling(selling.id).subscribe({
      next: () => {
        this.sellings = this.sellings.filter((item) => item.id !== selling.id);
        this.deletingSellingId = '';
        this.deleteDialogVisible = false;
        this.selectedSellingToDelete = null;
        this._cdr.detectChanges();
      },
      error: (err: any) => {
        this.deletingSellingId = '';
        this.deleteDialogVisible = false;
        this.selectedSellingToDelete = null;
        this.loadError = err?.error?.message || this.translateKey('invoiceHistoryPage.messages.deleteFailed');
        this._cdr.detectChanges();
      }
    });
  }

  isDeletingSelling(sellingId: string): boolean {
    return this.deletingSellingId === sellingId;
  }

  get isDeletingSelectedSelling(): boolean {
    return this.isDeletingSelling(this.selectedSellingToDelete?.id || '');
  }

  private normalizePhoneForWhatsApp(phone: string): string {
    return this.normalizeEgyptPhone(phone);
  }

  private normalizeEgyptPhone(phone: string): string {
    const rawPhone = String(phone || '').trim();
    if (!rawPhone) return '';

    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (!digitsOnly) return '';

    if (digitsOnly.startsWith('0020')) {
      return digitsOnly.slice(2);
    }

    if (digitsOnly.startsWith('+20')) {
      return digitsOnly;
    }

    if (digitsOnly.startsWith('0')) {
      return `+20${digitsOnly.slice(1)}`;
    }

    return `+20${digitsOnly}`;
  }

  private sumInvoiceMetric(
    items: InvoiceHistoryRow['items'],
    field: 'quantity' | 'totalPrice'
  ): number {
    return items.reduce((total, item) => total + Number(item[field] || 0), 0);
  }

  private toNumber(value: any): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private translateKey(key: string): string {
    return this._translate.instant(key);
  }

  private getInvoiceLanguage(): InvoicePrintLanguage {
    const activeLanguage = (
      this._translate.currentLang ||
      this._translate.getDefaultLang() ||
      'en'
    ).toLowerCase();

    return activeLanguage.startsWith('ar') ? 'ar' : 'en';
  }

  private resolveAssetUrl(assetPath: string): string {
    if (!this.isBrowser) {
      return assetPath;
    }

    return new URL(assetPath, document.baseURI).href;
  }
}
