import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { CateoryService } from '../../services/cateory.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SideNavComponent } from "../../../layout/components/side-nav/side-nav.component";
import { DialogModule } from "primeng/dialog";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from "primeng/select";
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../shared/services/theme.service';
import { ErrorIconComponent } from "../../../assets/error/error-icon.component";
import { LanguageService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-category-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SideNavComponent,
    SelectModule,
    TranslatePipe,
    ErrorIconComponent,
],
  templateUrl: './category-details.component.html',
  styleUrl: './category-details.component.scss'
})
export class CategoryDetailsComponent {
  categoryId: number;
  categoryDetails: any;
  visible: boolean = false;
  categories: any[] = [];
  addProductForm: FormGroup;
  products: any[] = [];
  searchTerm = '';
  qrCodes: any[] = [];
  codes: string[] = [];
  selectedProduct: any;
  imagePreview: string | ArrayBuffer | null = null;
  

  // ✅ Loading flags for button disable state
  isLoading: boolean = false;
  isAddingProduct: boolean = false;
  isCreatingModel: boolean = false;
  isCreatingQrCodes: boolean = false;
  isPrinting: boolean = false;
  isDarkMode$;
  errorVisible = false;
  errorMessage = '';

  constructor(
    private _themeService: ThemeService,
    private _languageService: LanguageService,
    private _cateoryService: CateoryService,
    private _activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private _router: Router
  ) {
    this.isDarkMode$ = this._themeService.isDarkMode$;
    this.initlizeAddProduct(null);
    this._activatedRoute.params.subscribe(params => {
      this.categoryId = params['id'];
      setTimeout(() => {
        this.getAllCategories();
        this.getProducts();
        this.initlizeAddProduct(this.categoryId);
      }, 100);
    });
  }

  ngOnInit() {
  }

  get filteredProducts(): any[] {
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return this.products;
    }

    return this.products.filter((product) => {
      const productName = String(product?.name || '').toLowerCase();
      const productCode = String(product?.code || '').toLowerCase();

      return productName.includes(normalizedSearchTerm) || productCode.includes(normalizedSearchTerm);
    });
  }

  get formDirection(): 'ltr' | 'rtl' {
    return this._languageService.selectedLanguage() === 'ar' ? 'rtl' : 'ltr';
  }

  initlizeAddProduct(category_id: number | null) {
    this.addProductForm = this.fb.group({
      name: [''],
      code: [''],
      inventoryCount: [''],
      imageBase64: [null],
      categoryId: [category_id],
      wholesalePrice: [''],
      retailPrice: [''],
      soldItemCount: [''],
    });
  }

  getAllCategories() {
    this._cateoryService.getCategories().subscribe({
      next: (res: any) => {
        this.categories = res;
        this.categoryDetails = this.categories.filter(cat => cat._id == this.categoryId)[0];
        this.cdr.detectChanges();
      }, 
      error: (err) => {
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    });
  }

  getProducts() {
    let params = { categoryId: this.categoryId };
    this._cateoryService.getProducts(this.categoryId, params).subscribe({
      next: (res: any) => {
        this.products = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    });
  }

  showDialog() {
    this.resetForm();
    this.addProductForm.patchValue({
      code: this.getNextProductCode(),
      categoryId: this.categoryId,
    });
    this.visible = true;
  }

  hideDialog() {
    this.visible = false;
    this.resetForm();
  }

  getCategoryDetails() {
    this._cateoryService.getCategoryById(this.categoryId).subscribe({
      next: (res: any) => {
        this.categoryDetails = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    });
  }

  addNewProduct() {
    this.isAddingProduct = true;
    if (!this.addProductForm.value.categoryId) this.addProductForm.value.categoryId = this.categoryId;
    const payload: any = { ...this.addProductForm.value };
    if (!payload.imageBase64) {
      delete payload.imageBase64;
    }
    console.log('Adding product with payload:', this.addProductForm.value);
    console.log('Adding product with payload:', payload);

    this._cateoryService.addNewProduct(payload).subscribe({
      next: (res: any) => {
        this.hideDialog();
        this.getProducts();
        this.resetForm();
        this.isAddingProduct = false;
      },
      error: (err: any) => {
        this.isAddingProduct = false;
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    });
  }

  resetForm() {
    this.addProductForm.reset({
      name: '',
      code: '',
      inventoryCount: '',
      imageBase64: null,
      categoryId: this.categoryId,
      wholesalePrice: '',
      retailPrice: '',
      soldItemCount: '',
    });
    this.imagePreview = null;
  }

  navigateToProductDetails(product) {
    this._router.navigate(['/products/edit', product._id]);
  }

  isLowInventory(inventoryCount: unknown): boolean {
    const parsedValue = Number(inventoryCount);
    return Number.isFinite(parsedValue) && parsedValue <= 10;
  }

  onBasicUploadAuto(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.imagePreview = base64String;
        this.addProductForm.patchValue({ imageBase64: base64String });
        this.addProductForm.get('imageBase64')!.updateValueAndValidity();
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  private getNextProductCode(): string {
    if (this.products.length === 0) {
      return '01';
    }

    const parsedCodes = this.products
      .map((product) => this.parseProductCode(product?.code))
      .filter((code): code is { prefix: string; numericValue: number; width: number } => code !== null);

    if (parsedCodes.length > 0) {
      const highestCode = parsedCodes.reduce((currentHighest, currentCode) =>
        currentCode.numericValue > currentHighest.numericValue ? currentCode : currentHighest
      );

      const nextNumber = String(highestCode.numericValue + 1).padStart(highestCode.width, '0');
      return `${highestCode.prefix}${nextNumber}`;
    }

    const lastCode = this.products[this.products.length - 1]?.code;
    const fallbackCode = lastCode == null ? '' : String(lastCode).trim();
    return fallbackCode ? `${fallbackCode}-1` : '';
  }

  private parseProductCode(code: unknown): { prefix: string; numericValue: number; width: number } | null {
    if (code == null) {
      return null;
    }

    const normalizedCode = String(code).trim();
    const codeParts = normalizedCode.match(/^(.*?)(\d+)$/);

    if (!codeParts) {
      return null;
    }

    const [, prefix, numericPart] = codeParts;
    return {
      prefix,
      numericValue: Number(numericPart),
      width: numericPart.length,
    };
  }
}
