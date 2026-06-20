import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { SideNavComponent } from '../../../layout/components/side-nav/side-nav.component';
import { ThemeService } from '../../../shared/services/theme.service';
import {
  WebsiteImage,
  WebsiteImageCategoryOption,
  WebsiteImagePayload,
  WebsiteImageProductOption,
  WebsiteImageTargetType
} from '../../models/website-images.models';
import { WebsiteImagesService } from '../../services/website-images.service';

type WebsiteImageForm = FormGroup<{
  title: FormControl<string>;
  imageBase64: FormControl<string>;
  targetType: FormControl<WebsiteImageTargetType>;
  categoryIds: FormControl<string[]>;
  productIds: FormControl<string[]>;
  maxPrice: FormControl<number | null>;
  isActive: FormControl<boolean>;
}>;

@Component({
  selector: 'app-website-images',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SideNavComponent,
    TranslatePipe,
    DialogModule,
    MultiSelectModule,
    TableModule
  ],
  templateUrl: './website-images.component.html',
  styleUrl: './website-images.component.scss'
})
export class WebsiteImagesComponent implements OnInit {
  isDarkMode$;
  images: WebsiteImage[] = [];
  categories: WebsiteImageCategoryOption[] = [];
  products: WebsiteImageProductOption[] = [];
  resolvedProducts: WebsiteImageProductOption[] = [];
  form: WebsiteImageForm;
  imagePreview = '';
  editingId: string | null = null;
  deletingImage: WebsiteImage | null = null;
  previewingImage: WebsiteImage | null = null;
  editorVisible = false;
  deleteVisible = false;
  productsPreviewVisible = false;
  isLoading = false;
  isCategoriesLoading = false;
  isProductsLoading = false;
  isEditorLoading = false;
  isSaving = false;
  isDeleting = false;
  isPreviewLoading = false;
  loadError = '';
  formError = '';
  previewError = '';
  private productLoadSequence = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: WebsiteImagesService,
    private readonly themeService: ThemeService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.loadImages();
    this.loadCategories();
  }

  get targetType(): WebsiteImageTargetType {
    return this.form.controls.targetType.value;
  }

  get showsCategories(): boolean {
    return ['category', 'product', 'both', 'price'].includes(this.targetType);
  }

  get showsProducts(): boolean {
    return this.targetType === 'product' || this.targetType === 'both';
  }

  get showsMaxPrice(): boolean {
    return this.targetType === 'price';
  }

  loadImages(): void {
    this.isLoading = true;
    this.loadError = '';

    this.service.getWebsiteImages().subscribe({
      next: (images) => {
        this.images = images;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadError = this.errorMessage(error, 'Failed to load website images.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadCategories(): void {
    this.isCategoriesLoading = true;

    this.service.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isCategoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.formError = this.errorMessage(error, 'Failed to load categories.');
        this.isCategoriesLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.createForm();
    this.imagePreview = '';
    this.products = [];
    this.formError = '';
    this.updateConditionalValidators();
    this.editorVisible = true;
    this.cdr.detectChanges();
  }

  openEdit(image: WebsiteImage): void {
    this.editingId = image.id;
    this.form = this.createForm();
    this.imagePreview = image.image;
    this.products = [];
    this.formError = '';
    this.isEditorLoading = true;
    this.editorVisible = true;

    this.service.getWebsiteImage(image.id).subscribe({
      next: (details) => {
        this.imagePreview = details.image;
        this.form.patchValue({
          title: details.title,
          targetType: details.targetType,
          categoryIds: details.categoryIds,
          productIds: details.productIds,
          maxPrice: details.maxPrice,
          isActive: details.isActive
        });
        this.updateConditionalValidators();
        this.form.markAsPristine();
        this.isEditorLoading = false;

        if (this.showsProducts) {
          this.loadProductsForSelectedCategories();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.formError = this.errorMessage(error, 'Failed to load website image details.');
        this.isEditorLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeEditor(): void {
    if (this.isSaving) return;
    this.productLoadSequence++;
    this.editorVisible = false;
    this.editingId = null;
    this.formError = '';
    this.products = [];
  }

  onTargetTypeChanged(): void {
    const type = this.targetType;

    if (type === 'category') {
      this.form.controls.productIds.setValue([]);
      this.form.controls.maxPrice.setValue(null);
      this.products = [];
    } else if (type === 'price') {
      this.form.controls.productIds.setValue([]);
      this.products = [];
    } else {
      this.form.controls.maxPrice.setValue(null);
      this.loadProductsForSelectedCategories();
    }

    this.updateConditionalValidators();
    this.cdr.detectChanges();
  }

  onCategoriesChanged(): void {
    if (this.showsProducts) {
      this.loadProductsForSelectedCategories();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.formError = 'Select a valid image file.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      this.form.controls.imageBase64.setValue(reader.result);
      this.form.controls.imageBase64.markAsDirty();
      this.imagePreview = reader.result;
      this.formError = '';
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.formError = 'The selected image could not be read.';
      input.value = '';
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (this.form.invalid || this.isSaving || this.isEditorLoading) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.formError = '';
    const payload = this.buildPayload();
    const request = this.editingId
      ? this.service.updateWebsiteImage(this.editingId, payload)
      : this.service.createWebsiteImage(payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.editorVisible = false;
        this.editingId = null;
        this.loadImages();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.formError = this.errorMessage(error, 'Failed to save website image.');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  requestDelete(image: WebsiteImage): void {
    this.deletingImage = image;
    this.deleteVisible = true;
  }

  cancelDelete(): void {
    if (this.isDeleting) return;
    this.deleteVisible = false;
    this.deletingImage = null;
  }

  confirmDelete(): void {
    if (!this.deletingImage || this.isDeleting) return;

    this.isDeleting = true;
    this.service.deleteWebsiteImage(this.deletingImage.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.deleteVisible = false;
        this.deletingImage = null;
        this.loadImages();
      },
      error: (error) => {
        this.isDeleting = false;
        this.deleteVisible = false;
        this.loadError = this.errorMessage(error, 'Failed to delete website image.');
        this.deletingImage = null;
        this.cdr.detectChanges();
      }
    });
  }

  previewProducts(image: WebsiteImage): void {
    this.previewingImage = image;
    this.resolvedProducts = [];
    this.previewError = '';
    this.isPreviewLoading = true;
    this.productsPreviewVisible = true;

    this.service.getResolvedProducts(image.id).subscribe({
      next: (products) => {
        this.resolvedProducts = products;
        this.isPreviewLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.previewError = this.errorMessage(error, 'Failed to resolve targeted products.');
        this.isPreviewLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadProductsForSelectedCategories(): void {
    const categoryIds = this.form.controls.categoryIds.value;
    const requestSequence = ++this.productLoadSequence;

    if (!categoryIds.length) {
      this.products = [];
      this.form.controls.productIds.setValue([]);
      this.isProductsLoading = false;
      return;
    }

    this.isProductsLoading = true;
    this.formError = '';
    forkJoin(categoryIds.map((categoryId) => this.service.getProductsByCategory(categoryId))).subscribe({
      next: (productGroups) => {
        if (requestSequence !== this.productLoadSequence) return;
        const productsById = new Map<string, WebsiteImageProductOption>();
        productGroups.flat().forEach((product) => productsById.set(product.id, product));
        this.products = Array.from(productsById.values());

        const availableIds = new Set(this.products.map((product) => product.id));
        const selectedIds = this.form.controls.productIds.value.filter((id) => availableIds.has(id));
        this.form.controls.productIds.setValue(selectedIds, { emitEvent: false });
        this.isProductsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (requestSequence !== this.productLoadSequence) return;
        this.products = [];
        this.isProductsLoading = false;
        this.formError = this.errorMessage(error, 'Failed to load products for the selected categories.');
        this.cdr.detectChanges();
      }
    });
  }

  private createForm(): WebsiteImageForm {
    return this.fb.group({
      title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
      imageBase64: this.fb.nonNullable.control(''),
      targetType: this.fb.nonNullable.control<WebsiteImageTargetType>('category', Validators.required),
      categoryIds: this.fb.nonNullable.control<string[]>([]),
      productIds: this.fb.nonNullable.control<string[]>([]),
      maxPrice: this.fb.control<number | null>(null),
      isActive: this.fb.nonNullable.control(true)
    });
  }

  private updateConditionalValidators(): void {
    const categoryControl = this.form.controls.categoryIds;
    const productControl = this.form.controls.productIds;
    const maxPriceControl = this.form.controls.maxPrice;

    categoryControl.clearValidators();
    productControl.clearValidators();
    maxPriceControl.clearValidators();

    if (['category', 'product', 'both'].includes(this.targetType)) {
      categoryControl.addValidators(Validators.required);
    }
    if (this.showsProducts) {
      productControl.addValidators(Validators.required);
    }
    if (this.showsMaxPrice) {
      maxPriceControl.addValidators([Validators.required, Validators.min(0)]);
    }
    if (!this.editingId) {
      this.form.controls.imageBase64.setValidators(Validators.required);
    } else {
      this.form.controls.imageBase64.clearValidators();
    }

    categoryControl.updateValueAndValidity({ emitEvent: false });
    productControl.updateValueAndValidity({ emitEvent: false });
    maxPriceControl.updateValueAndValidity({ emitEvent: false });
    this.form.controls.imageBase64.updateValueAndValidity({ emitEvent: false });
  }

  private buildPayload(): WebsiteImagePayload {
    const value = this.form.getRawValue();
    const payload: WebsiteImagePayload = {
      title: value.title.trim(),
      targetType: value.targetType,
      isActive: value.isActive
    };

    if (value.imageBase64) payload.imageBase64 = value.imageBase64;
    if (this.showsCategories) payload.categoryIds = value.categoryIds;
    if (this.showsProducts) payload.productIds = value.productIds;
    if (this.showsMaxPrice && value.maxPrice !== null) payload.maxPrice = Number(value.maxPrice);
    return payload;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
