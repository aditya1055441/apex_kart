import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { Product, Category, Brand } from '../../../core/models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public cart = inject(CartService);

  public products = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public brands = signal<Brand[]>([]);
  public total = signal<number>(0);
  public loading = signal<boolean>(true);

  // Filter states
  public selectedCategory = signal<string>('');
  public selectedBrand = signal<string>('');
  public selectedSort = signal<string>('newest');
  public searchQuery = signal<string>('');
  public minPrice = signal<number>(0);
  public maxPrice = signal<number>(100000);

  ngOnInit() {
    this.api.get<{ success: boolean; categories: Category[] }>('/categories').subscribe(res => {
      if (res.success) this.categories.set(res.categories);
    });

    this.api.get<{ success: boolean; brands: Brand[] }>('/categories/brands').subscribe(res => {
      if (res.success) this.brands.set(res.brands);
    });

    this.route.queryParams.subscribe(params => {
      if (params['category']) this.selectedCategory.set(params['category']);
      if (params['brand']) this.selectedBrand.set(params['brand']);
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['sortBy']) this.selectedSort.set(params['sortBy']);
      this.fetchProducts();
    });
  }

  fetchProducts() {
    this.loading.set(true);
    const params: any = {
      limit: 40,
      sortBy: this.selectedSort(),
      search: this.searchQuery(),
      category: this.selectedCategory(),
      brand: this.selectedBrand(),
      minPrice: this.minPrice() > 0 ? this.minPrice() : undefined,
      maxPrice: this.maxPrice() < 100000 ? this.maxPrice() : undefined
    };

    this.api.get<{ success: boolean; products: Product[]; total: number }>('/products', params).subscribe({
      next: res => {
        if (res.success) {
          this.products.set(res.products);
          this.total.set(res.total);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onFilterChange() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory() || null,
        brand: this.selectedBrand() || null,
        search: this.searchQuery() || null,
        sortBy: this.selectedSort() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilters() {
    this.selectedCategory.set('');
    this.selectedBrand.set('');
    this.searchQuery.set('');
    this.minPrice.set(0);
    this.maxPrice.set(100000);
    this.selectedSort.set('newest');
    this.router.navigate(['/products']);
  }

  addToCart(product: Product, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.cart.addToCart(product.id, undefined, 1).subscribe();
  }
}
