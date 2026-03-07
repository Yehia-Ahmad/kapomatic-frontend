import { ChangeDetectorRef, Component } from '@angular/core';
import { SideNavComponent } from "../../../layout/components/side-nav/side-nav.component";
import { FormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CateoryService } from '../../services/cateory.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { WarnComponent } from "../../../assets/warn/warn.component";
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../shared/services/theme.service';
import { ErrorIconComponent } from "../../../assets/error/error-icon.component";

@Component({
  selector: 'app-product-edit',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, SideNavComponent, WarnComponent, TranslatePipe, ErrorIconComponent],
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent {
  isLoading: boolean = false;
  productId: any;
  product: any = {};
  newInventory: number | string | null = null;
  inventoryCount: any;
  wholesalePrice: any;
  retailPrice: any;
  soldItemCount: any;
  loading: boolean = false;
  deleteVisible: boolean = false;
  isDarkMode$;
  imagePreview: string | ArrayBuffer | null = null;
  errorVisible = false;
  errorMessage = '';

  constructor(private _themeService: ThemeService, private cdr: ChangeDetectorRef, private _router: Router, private _cateoryService: CateoryService, private _activatedRoute: ActivatedRoute, private location: Location) {
    this.isDarkMode$ = this._themeService.isDarkMode$;
    this.productId = this._activatedRoute.snapshot.params['id'];
  }

  ngOnInit() {
    setTimeout(() => {
      this.getProductById();
    }, 100)
  }

  getProductById() {
    this.loading = true;
    this._cateoryService.getProductById(this.productId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.product = res;
        this.newInventory = null;
        this.cdr.detectChanges();
      }, error: (err: any) => {
        this.loading = false;
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    })
  }

  deleteProduct() {
    this.loading = true;
    this._cateoryService.deleteProduct(this.productId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.location.back();
      }, error: (err: any) => {
        this.loading = false;
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    }) 
  }

  updateProduct() {
    this.loading = true;
    const currentInventoryCount = this.toNumber(this.product.inventoryCount);
    const newInventoryCount = Math.max(0, this.toNumber(this.newInventory));

    let payload = {
      name: this.product.name,
      code: this.product.code,
      inventoryCount: currentInventoryCount,
      newInventory: newInventoryCount,
      wholesalePrice: this.product.wholesalePrice,
      retailPrice: this.product.retailPrice,
      soldItemCount: this.product.soldItemCount,
      image: this.product.image,
    };
    this._cateoryService.updateProduct(this.productId, payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.location.back();
      }, error: (err: any) => {
        this.loading = false;
        this.errorVisible = true;
        this.errorMessage = err.error.message;
        this.cdr.detectChanges();
      }
    })
  }


  showDeleteDialog() {
    this.deleteVisible = true;
  }

  closeDialog() {
    this.deleteVisible = false;
  }
  
  onBasicUploadAuto(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.imagePreview = base64String;
        // this.product.image = file;
        this.product.image = base64String;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  isOutOfStock(inventoryCount: unknown): boolean {
    const parsedValue = Number(inventoryCount);
    return Number.isFinite(parsedValue) && parsedValue === 0;
  }

  private toNumber(value: unknown): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
}
