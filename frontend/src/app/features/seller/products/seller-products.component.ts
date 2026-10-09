import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product, Category } from '../../../core/models';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-products.component.html',
  styleUrls: ['./seller-products.component.css']
})
export class SellerProductsComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public products = signal<Product[]>([]);
  public categories = signal<Category[]>([]);
  public loading = signal<boolean>(true);
  public isAddModalOpen = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);
  public errorMsg = signal<string>('');

  public newProd = {
    title: '',
    categoryId: 'cat-electronics',
    brand: '',
    basePrice: 1999,
    salePrice: 1499,
    stock: 25,
    description: '',
    images: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
  };

  ngOnInit() {
    this.loadCatalog();
  }

  loadCatalog() {
    this.loading.set(true);
    const storeId = this.auth.currentUser()?.storeId;

    this.api.get<{ success: boolean; categories: Category[] }>('/categories').subscribe(res => {
      if (res.success) this.categories.set(res.categories);
    });

    this.api.get<{ success: boolean; products: Product[] }>('/products', { storeId, limit: 100 }).subscribe({
      next: res => {
        if (res.success) this.products.set(res.products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openAddModal() {
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
    this.errorMsg.set('');
  }

  createProduct() {
    this.isSubmitting.set(true);
    this.errorMsg.set('');

    const payload = {
      title: this.newProd.title,
      categoryId: this.newProd.categoryId,
      brand: this.newProd.brand || 'Generic',
      basePrice: this.newProd.basePrice,
      salePrice: this.newProd.salePrice,
      stock: this.newProd.stock,
      description: this.newProd.description || this.newProd.title,
      images: [this.newProd.images]
    };

    this.api.post<{ success: boolean; product: Product }>('/products', payload).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.products.update(list => [res.product, ...list]);
          this.closeAddModal();
        }
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to create product. Ensure KYC is approved.');
      }
    });
  }

  deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    this.api.delete(`/products/${id}`).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.id !== id));
      }
    });
  }
}
