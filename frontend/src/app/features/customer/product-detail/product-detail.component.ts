import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product, ProductVariant, Review } from '../../../core/models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public cart = inject(CartService);
  public auth = inject(AuthService);

  public product = signal<Product | null>(null);
  public reviews = signal<Review[]>([]);
  public store = signal<any>(null);
  public selectedImage = signal<string>('');
  public selectedVariant = signal<ProductVariant | null>(null);
  public quantity = signal<number>(1);
  public loading = signal<boolean>(true);

  // New Review form state
  public newReviewRating = 5;
  public newReviewTitle = '';
  public newReviewComment = '';
  public reviewSubmitting = signal<boolean>(false);
  public reviewSuccessMsg = signal<string>('');

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.fetchProduct(id);
      }
    });
  }

  fetchProduct(id: string) {
    this.loading.set(true);
    this.api.get<{ success: boolean; product: Product; reviews: Review[]; store?: any }>(`/products/${id}`).subscribe({
      next: res => {
        if (res.success) {
          this.product.set(res.product);
          this.reviews.set(res.reviews || []);
          this.store.set(res.store);
          this.selectedImage.set(res.product.images[0] || '');
          if (res.product.variants && res.product.variants.length > 0) {
            this.selectedVariant.set(res.product.variants[0]);
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
    if (variant.image) {
      this.selectedImage.set(variant.image);
    }
  }

  getCurrentPrice(): number {
    return this.selectedVariant() ? this.selectedVariant()!.price : (this.product()?.salePrice || 0);
  }

  addToCart() {
    if (!this.product()) return;
    this.cart.addToCart(
      this.product()!.id,
      this.selectedVariant()?.id,
      this.quantity()
    ).subscribe();
  }

  buyNow() {
    if (!this.product()) return;
    this.cart.addToCart(
      this.product()!.id,
      this.selectedVariant()?.id,
      this.quantity()
    ).subscribe({
      next: () => {
        this.cart.closeCartDrawer();
        this.router.navigate(['/checkout']);
      }
    });
  }

  submitReview() {
    if (!this.product() || !this.newReviewComment.trim() || !this.newReviewTitle.trim()) return;

    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal();
      return;
    }

    this.reviewSubmitting.set(true);
    this.api.post<{ success: boolean; review: Review }>(`/reviews/products/${this.product()!.id}`, {
      rating: this.newReviewRating,
      title: this.newReviewTitle,
      comment: this.newReviewComment
    }).subscribe({
      next: res => {
        this.reviewSubmitting.set(false);
        this.reviewSuccessMsg.set('Review submitted successfully!');
        this.reviews.update(list => [res.review, ...list]);
        this.newReviewTitle = '';
        this.newReviewComment = '';
      },
      error: () => this.reviewSubmitting.set(false)
    });
  }
}
