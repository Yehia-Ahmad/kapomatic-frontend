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
        path: 'selling',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/products/components/selling/selling.component').then(m => m.SellingComponent)
    },
    {
        path: 'invoice-history',
        // canActivate: [authGuard],
        loadComponent: () => import('./modules/products/components/invoice-history/invoice-history.component').then(m => m.InvoiceHistoryComponent)
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
        path: '**',
        // canActivate: [authGuard],
        component: HomeComponent
    },
];
