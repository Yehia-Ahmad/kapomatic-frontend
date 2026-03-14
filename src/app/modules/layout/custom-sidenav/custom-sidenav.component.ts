import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, effect, EventEmitter, Inject, inject, Injector, Input, OnInit, Output, PLATFORM_ID, runInInjectionContext, signal, SimpleChanges } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CateoryService } from '../../category/services/cateory.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WarnComponent } from "../../assets/warn/warn.component";
import { ErrorIconComponent } from "../../assets/error/error-icon.component";
import { LanguageService } from '../../shared/services/translation.service';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../shared/services/theme.service';
import { HOME_DEFAULT_VIEW, HOME_VIEW_STORAGE_KEY } from '../constants/home-view.constants';
import { filter } from 'rxjs';

export type MenuItem = {
  label: string;
  icon: SafeHtml;
  route?: string;
  children?: { label: string; route: string }[];
}

@Component({
  selector: 'app-custom-sidenav',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatListModule, RouterModule, DialogModule, ButtonModule, InputTextModule, WarnComponent, ErrorIconComponent, TranslatePipe],
  templateUrl: './custom-sidenav.component.html',
  styleUrl: './custom-sidenav.component.scss'
})
export class CustomSidenavComponent implements OnInit {
  private _injector = inject(Injector);
  private _languageService = inject(LanguageService);
  isSidenavCollapsed = true;
  @Output() collapsedSidenav = new EventEmitter<boolean>();
  menuItems = signal<MenuItem[]>([]);
  expandedCategory: string | null = null;
  categories: any[] = [];
  visible: boolean = false;
  isSaving = signal(false);
  deleteCategoryVisible: boolean = false;
  categoryToDelete: any = null;
  addCategory: FormGroup;
  isDarkMode$;
  private isBrowser: boolean;
  direction = signal<'rtl' | 'ltr'>('ltr');
  // role: any = JSON.parse(localStorage.getItem("userProfile")).role;
  imagePreview: string | ArrayBuffer | null = null;
  errorMessage = signal('');
  errorVisible = signal(false);

  constructor(
    private _themeService: ThemeService,
    private sanitizer: DomSanitizer,
    private _cateoryService: CateoryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private _router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.initalizeAddCategory();
    this.isDarkMode$ = this._themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.getAllCategories();
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.buildAdminMenuItems());
    runInInjectionContext(this._injector, () => {
      effect(() => {
        const lang = this._languageService.selectedLanguage();
        this.direction.set(lang === 'ar' ? 'rtl' : 'ltr');
        this.buildAdminMenuItems();
      });
    });
  }

  initalizeAddCategory() {
    this.addCategory = this.fb.group({
      name: [null, Validators.required],
      imageBase64: [null]
    })
  }

  private sanitize(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getAllCategories() {
    this.categories = [];
    this._cateoryService.getCategories().subscribe((res: any) => {
      res.map((category: any) => {
        this.categories.push({ label: category.name, route: `/categories/${category._id}`, id: category._id })
      });
      this.buildAdminMenuItems();
    })
  }

  buildAdminMenuItems() {
    if (this.isProductsContext()) {
      this.menuItems.set(this.getProductsMenuItems());
      return;
    }

    this.menuItems.set([
      {
        label: 'sidebarTitles.customers',
        icon: this.sanitize(`
        <span class="block w-8 h-8">
            <svg width="100%" height="100%" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
              <path d="M320 312C400.1 312 464 248.1 464 168C464 87.9 400.1 24 320 24C239.9 24 176 87.9 176 168C176 248.1 239.9 312 320 312zM229.3 360C123.6 360 38 445.6 38 551.3C38 584.8 65.2 612 98.7 612L541.3 612C574.8 612 602 584.8 602 551.3C602 445.6 516.4 360 410.7 360L229.3 360z" style="fill:#2f2f2f;fill-rule:nonzero;" />
            </svg>
        </span>
        `),
        route: '/customers'
      },
      {
        label: 'sidebarTitles.categories',
        icon: this.sanitize(`
        <span class="block w-8 h-8">
            <svg width="100%" height="100%" viewBox="0 0 31 28" version="1.1" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/"
                style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
                <path
                    d="M14.349,0.699c0.793,-0.367 1.709,-0.367 2.502,-0l11.637,5.376c0.452,0.208 0.74,0.661 0.74,1.161c-0,0.5 -0.288,0.953 -0.74,1.16l-11.637,5.377c-0.793,0.367 -1.709,0.367 -2.502,-0l-11.637,-5.377c-0.452,-0.213 -0.739,-0.665 -0.739,-1.16c-0,-0.495 0.287,-0.953 0.739,-1.161l11.637,-5.376Zm11.307,10.881l2.832,1.309c0.452,0.208 0.74,0.66 0.74,1.161c-0,0.5 -0.288,0.953 -0.74,1.16l-11.637,5.377c-0.793,0.367 -1.709,0.367 -2.502,-0l-11.637,-5.377c-0.452,-0.213 -0.739,-0.665 -0.739,-1.16c-0,-0.495 0.287,-0.953 0.739,-1.161l2.832,-1.309l8.092,3.737c1.245,0.575 2.683,0.575 3.928,-0l8.092,-3.737Zm-8.092,10.55l8.092,-3.737l2.832,1.31c0.452,0.208 0.74,0.66 0.74,1.16c-0,0.501 -0.288,0.953 -0.74,1.161l-11.637,5.376c-0.793,0.368 -1.709,0.368 -2.502,0l-11.637,-5.376c-0.452,-0.213 -0.739,-0.665 -0.739,-1.161c-0,-0.495 0.287,-0.952 0.739,-1.16l2.832,-1.31l8.092,3.737c1.245,0.575 2.683,0.575 3.928,0Z"
                    style="fill:#2f2f2f;fill-rule:nonzero;" />
            </svg>
        </span>
        `),
        children: this.categories,
      }
    ]);
  }

  private isProductsContext(): boolean {
    const isProductsRoute = this._router.url.includes('/selling')
      || this._router.url.includes('/credit-sales')
      || this._router.url.includes('/invoice-history');
    if (!this.isBrowser) return isProductsRoute;

    const currentView = localStorage.getItem(HOME_VIEW_STORAGE_KEY);
    const isProductsView = currentView === 'products' || currentView === 'selling' || currentView === 'invoice-history';
    return isProductsView || isProductsRoute;
  }

  private getProductsMenuItems(): MenuItem[] {
    return [
      {
        label: 'sidebarTitles.selling',
        icon: this.sanitize(`
        <span class="block w-8 h-8">
            <svg width="100%" height="100%" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
              <path d="M142 66.2C150.5 62.3 160.5 63.7 167.6 69.8L208 104.4L248.4 69.8C257.4 62.1 270.7 62.1 279.6 69.8L320 104.4L360.4 69.8C369.4 62.1 382.6 62.1 391.6 69.8L432 104.4L472.4 69.8C479.5 63.7 489.5 62.3 498 66.2C506.5 70.1 512 78.6 512 88L512 552C512 561.4 506.5 569.9 498 573.8C489.5 577.7 479.5 576.3 472.4 570.2L432 535.6L391.6 570.2C382.6 577.9 369.4 577.9 360.4 570.2L320 535.6L279.6 570.2C270.6 577.9 257.3 577.9 248.4 570.2L208 535.6L167.6 570.2C160.5 576.3 150.5 577.7 142 573.8C133.5 569.9 128 561.4 128 552L128 88C128 78.6 133.5 70.1 142 66.2zM232 200C218.7 200 208 210.7 208 224C208 237.3 218.7 248 232 248L408 248C421.3 248 432 237.3 432 224C432 210.7 421.3 200 408 200L232 200zM208 416C208 429.3 218.7 440 232 440L408 440C421.3 440 432 429.3 432 416C432 402.7 421.3 392 408 392L232 392C218.7 392 208 402.7 208 416zM232 296C218.7 296 208 306.7 208 320C208 333.3 218.7 344 232 344L408 344C421.3 344 432 333.3 432 320C432 306.7 421.3 296 408 296L232 296z" style="fill:#2f2f2f;fill-rule:nonzero;" />
            </svg>
        </span>
        `),
        route: '/selling'
      },
      {
        label: 'sidebarTitles.credit_sales',
        icon: this.sanitize(`
        <span class="block w-8 h-8">
            <svg width="100%" height="100%" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
              <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM320 184C355.3 184 384 212.7 384 248L384 264L432 264C445.3 264 456 274.7 456 288C456 301.3 445.3 312 432 312L384 312L384 336L432 336C445.3 336 456 346.7 456 360C456 373.3 445.3 384 432 384L384 384L384 408C384 443.3 355.3 472 320 472C289.6 472 264.1 450.8 257.4 422.4C254.3 409.4 262.4 396.4 275.3 393.3C288.2 390.2 301.3 398.3 304.4 411.2C306 417.8 312 424 320 424C328.8 424 336 416.8 336 408L336 384L232 384C218.7 384 208 373.3 208 360C208 346.7 218.7 336 232 336L336 336L336 312L272 312C228.9 312 194 277.1 194 234C194 190.9 228.9 156 272 156L408 156C421.3 156 432 166.7 432 180C432 193.3 421.3 204 408 204L272 204C255.4 204 242 217.4 242 234C242 250.6 255.4 264 272 264L336 264L336 248C336 239.2 328.8 232 320 232C312 232 306 238.2 304.4 244.8C301.3 257.7 288.2 265.8 275.3 262.7C262.4 259.6 254.3 246.6 257.4 233.6C264.1 205.2 289.6 184 320 184z" style="fill:#2f2f2f;fill-rule:nonzero;" />
            </svg>
        </span>
        `),
        route: '/credit-sales'
      },
      {
        label: 'sidebarTitles.invoice_history',
        icon: this.sanitize(`
        <span class="block w-8 h-8">
            <svg width="100%" height="100%" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
              <path d="M320 128C426 128 512 214 512 320C512 426 426 512 320 512C254.8 512 197.1 479.5 162.4 429.7C152.3 415.2 132.3 411.7 117.8 421.8C103.3 431.9 99.8 451.9 109.9 466.4C156.1 532.6 233 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C234.3 64 158.5 106.1 112 170.7L112 144C112 126.3 97.7 112 80 112C62.3 112 48 126.3 48 144L48 256C48 273.7 62.3 288 80 288L104.6 288C105.1 288 105.6 288 106.1 288L192.1 288C209.8 288 224.1 273.7 224.1 256C224.1 238.3 209.8 224 192.1 224L153.8 224C186.9 166.6 249 128 320 128zM344 216C344 202.7 333.3 192 320 192C306.7 192 296 202.7 296 216L296 320C296 326.4 298.5 332.5 303 337L375 409C384.4 418.4 399.6 418.4 408.9 409C418.2 399.6 418.3 384.4 408.9 375.1L343.9 310.1L343.9 216z" style="fill:#2f2f2f;fill-rule:nonzero;" />
            </svg>
        </span>
        `),
        route: '/invoice-history'
      }
    ];
  }

  toggleCategory(category: string) {
    if (this.isSidenavCollapsed) {
      this.openSidenav();
      // Wait a bit to allow sidenav to expand smoothly before showing children
      setTimeout(() => {
        this.expandedCategory = category;
      }, 300); // adjust delay to match your sidenav animation time
    } else {
      this.expandedCategory = this.expandedCategory === category ? null : category;
    }
  }


  openSidenav() {
    this.isSidenavCollapsed = false
    this.collapsedSidenav.emit(this.isSidenavCollapsed);
  }

  openDialog(): void {
    this.visible = true;
    this.errorMessage.set('');
    this.errorVisible.set(false);
    this.cdr.detectChanges();
  }

  closeDialog(): void {
    this.visible = false;
    this.addCategory.reset();
    this.imagePreview = null;
    this.errorMessage.set('');
    this.errorVisible.set(false);
    this.cdr.detectChanges();
  }

  onErrorDialogVisibleChange(visible: boolean): void {
    this.errorVisible.set(visible);
  }

  closeErrorDialog(): void {
    this.errorVisible.set(false);
  }

  addNewCategory() {
    if (this.addCategory.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    const payload: any = { ...this.addCategory.value };
    if (!payload.imageBase64) {
      delete payload.imageBase64;
    }

    this._cateoryService.createCategory(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.getAllCategories();
        this.closeDialog();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(this.extractErrorMessage(err));
        this.errorVisible.set(true);
        console.error(err);
      }
    });
  }

  onBasicUploadAuto(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.imagePreview = base64String;
        this.addCategory.patchValue({ imageBase64: base64String });
        this.addCategory.get('imageBase64')!.updateValueAndValidity();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  private extractErrorMessage(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;
    return 'حدث خطأ أثناء إضافة الفئة';
  }

  resetHomeView() {
    if (this.isBrowser) {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, HOME_DEFAULT_VIEW);
    }
    this._router.navigate(['/home'], { queryParams: { resetView: Date.now() } });
  }

  promptForCategoryDeletion(category: any) {
    this.categoryToDelete = category;
    this.deleteCategoryVisible = true;
  }

  closeDeleteCategoryDialog() {
    this.deleteCategoryVisible = false;
    this.categoryToDelete = null;
  }

  confirmDeleteCategory() {
    if (!this.categoryToDelete) return;

    this._cateoryService.deleteCategory(this.categoryToDelete.id).subscribe({
      next: () => {
        this.getAllCategories();
        this.closeDeleteCategoryDialog();
      },
      error: (err) => {
        console.error(err);
        this.closeDeleteCategoryDialog();
      }
    });
  }
}
