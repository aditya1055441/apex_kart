import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { Product, Category, Store } from '../../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  public cart = inject(CartService);

  public featuredProducts = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public topStores = signal<Store[]>([]);
  public loading = signal<boolean>(true);

  ngOnInit() {
    this.loadHomeData();
  }

  loadHomeData() {
    this.loading.set(true);

    // Fetch featured products
    this.api.get<{ success: boolean; products: Product[] }>('/products', { featured: 'true', limit: 8 }).subscribe({
      next: res => {
        if (res.success) this.featuredProducts.set(res.products);
      }
    });

    // Fetch categories
    this.api.get<{ success: boolean; categories: Category[] }>('/categories').subscribe({
      next: res => {
        if (res.success) this.categories.set(res.categories);
      }
    });

    // Fetch top stores
    this.api.get<{ success: boolean; stores: Store[] }>('/seller/dashboard').subscribe({
      error: () => {
        // Fallback or public stores
      }
    });

    this.loading.set(false);
  }

  addToCart(product: Product, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.cart.addToCart(product.id, undefined, 1).subscribe();
  }
}
