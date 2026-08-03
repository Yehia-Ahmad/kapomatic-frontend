import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './modules/layout/components/home/home.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    {
        path: 'home',
        // canActivate: [authGuard],
        component: HomeComponent
    },
    {
        path: 'admins',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/admin/components/admins/admins.component').then(m => m.AdminsComponent)
    },
    {
        path: 'customers',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/customer/components/customers/customers.component').then(m => m.CustomersComponent)
    },
    {
        path: 'customers/:id',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/customer/components/customer-details/customer-details.component').then(m => m.CustomerDetailsComponent)
    },
    {
        path: 'selling',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/products/components/selling/selling.component').then(m => m.SellingComponent)
    },
    {
        path: 'credit-sales',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/products/components/credit-sales/credit-sales.component').then(m => m.CreditSalesComponent)
    },
    {
        path: 'custom-sales',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/custom-sales/components/custom-sales-list/custom-sales-list.component').then(m => m.CustomSalesListComponent)
    },
    {
        path: 'custom-sales/create',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/custom-sales/components/custom-sales-form/custom-sales-form.component').then(m => m.CustomSalesFormComponent)
    },
    {
        path: 'custom-sales/:id',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/custom-sales/components/custom-sales-detail/custom-sales-detail.component').then(m => m.CustomSalesDetailComponent)
    },
    {
        path: 'custom-sales/:id/edit',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/custom-sales/components/custom-sales-form/custom-sales-form.component').then(m => m.CustomSalesFormComponent)
    },
    {
        path: 'invoice-history',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/products/components/invoice-history/invoice-history.component').then(m => m.InvoiceHistoryComponent)
    },
    {
        path: 'returns',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/returns/components/returns/returns.component').then(m => m.ReturnsComponent)
    },
    {
        path: 'categories/:id',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/category/components/category-details/category-details.component').then(m => m.CategoryDetailsComponent)
    },
    {
        path: 'products/edit/:id',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/category/components/product-edit/product-edit.component').then(m => m.ProductEditComponent)
    },
    {
        path: 'products/profit-report',
        loadComponent: () => import('./modules/products/components/product-profit-report/product-profit-report.component').then(m => m.ProductProfitReportComponent)
    },
    {
        path: 'ecommerce-settings/shipping/general',
        loadComponent: () => import('./modules/ecommerce-settings/components/ecommerce-settings/ecommerce-settings.component').then(m => m.EcommerceSettingsComponent)
    },
    {
        path: 'ecommerce-settings/shipping/governments',
        loadComponent: () => import('./modules/ecommerce-settings/components/ecommerce-settings/ecommerce-settings.component').then(m => m.EcommerceSettingsComponent)
    },
    {
        path: 'ecommerce-settings',
        loadComponent: () => import('./modules/ecommerce-settings/components/ecommerce-settings/ecommerce-settings.component').then(m => m.EcommerceSettingsComponent)
    },
    {
        path: 'website-images',
        loadComponent: () => import('./modules/website-images/components/website-images/website-images.component').then(m => m.WebsiteImagesComponent)
    },
    {
        path: 'website-orders',
        loadComponent: () => import('./modules/website-orders/components/website-orders/website-orders.component').then(m => m.WebsiteOrdersComponent)
    },
    {
        path: '**',
        // canActivate: [authGuard],
        component: HomeComponent
    },
];
