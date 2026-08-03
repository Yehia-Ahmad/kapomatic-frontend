import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { HOME_VIEW_STORAGE_KEY } from '../../../layout/constants/home-view.constants';
import { ThemeService } from '../../../shared/services/theme.service';
import { CustomSale } from '../../models/custom-sales.models';
import { CustomSalesListComponent } from '../custom-sales-list/custom-sales-list.component';
import { CustomSalesService } from '../../services/custom-sales.service';

@Component({
  selector: 'app-custom-sales-detail',
  standalone: true,
  imports: [CommonModule, SideNavComponent, TranslatePipe, MatSnackBarModule],
  templateUrl: './custom-sales-detail.component.html',
  styleUrl: './custom-sales-detail.component.scss'
})
export class CustomSalesDetailComponent implements OnInit {
  isDarkMode$;
  sale: CustomSale | null = null;
  isLoading = false;
  errorMessage = '';
  direction: 'rtl' | 'ltr' = 'ltr';
  private readonly isBrowser: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: CustomSalesService,
    private readonly snackBar: MatSnackBar,
    private readonly translate: TranslateService,
    private readonly themeService: ThemeService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.direction = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.translate.onLangChange.subscribe(() => this.direction = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr');
    if (this.isBrowser) localStorage.setItem(HOME_VIEW_STORAGE_KEY, 'products');
    this.loadSale();
  }

  loadSale(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.isLoading = true;
    this.errorMessage = '';
    this.service.getCustomSaleById(id).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.sale = res?.data ?? res?.sale ?? res;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || err?.message || 'Failed to load Custom Sale.';
      }
    });
  }

  back(): void {
    this.router.navigate(['/custom-sales']);
  }

  edit(): void {
    if (!this.sale) return;
    this.router.navigate(['/custom-sales', this.id, 'edit']);
  }

  print(): void {
    window.print();
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

  date(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  get id(): string {
    return this.sale?._id || this.sale?.invoiceId || this.route.snapshot.paramMap.get('id') || '';
  }
}
