import { Routes } from '@angular/router';
import { HomeComponent } from './features/customer/home/home.component';
import { CatalogComponent } from './features/customer/catalog/catalog.component';
import { ProductDetailComponent } from './features/customer/product-detail/product-detail.component';
import { CheckoutComponent } from './features/customer/checkout/checkout.component';
import { OrdersComponent } from './features/customer/orders/orders.component';
import { ProfileComponent } from './features/customer/profile/profile.component';

import { SellerRegisterComponent } from './features/seller/register/seller-register.component';
import { SellerDashboardComponent } from './features/seller/dashboard/seller-dashboard.component';
import { SellerProductsComponent } from './features/seller/products/seller-products.component';
import { SellerOrdersComponent } from './features/seller/orders/seller-orders.component';
import { SellerPayoutsComponent } from './features/seller/payouts/seller-payouts.component';

import { AdminDashboardComponent } from './features/admin/dashboard/admin-dashboard.component';
import { AdminSellersComponent } from './features/admin/sellers/admin-sellers.component';
import { AdminPayoutsComponent } from './features/admin/payouts/admin-payouts.component';
import { AdminCategoriesComponent } from './features/admin/categories/admin-categories.component';

import { sellerGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Customer routes
  { path: '', component: HomeComponent },
  { path: 'products', component: CatalogComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'profile', component: ProfileComponent },

  // Seller routes
  { path: 'seller/register', component: SellerRegisterComponent },
  { path: 'seller/dashboard', component: SellerDashboardComponent, canActivate: [sellerGuard] },
  { path: 'seller/products', component: SellerProductsComponent, canActivate: [sellerGuard] },
  { path: 'seller/orders', component: SellerOrdersComponent, canActivate: [sellerGuard] },
  { path: 'seller/payouts', component: SellerPayoutsComponent, canActivate: [sellerGuard] },

  // Super Admin routes
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'admin/sellers', component: AdminSellersComponent, canActivate: [adminGuard] },
  { path: 'admin/payouts', component: AdminPayoutsComponent, canActivate: [adminGuard] },
  { path: 'admin/categories', component: AdminCategoriesComponent, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' }
];
