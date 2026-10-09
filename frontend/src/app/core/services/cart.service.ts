import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { CartItem, CartSummary } from '../models';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private api = inject(ApiService);

  public items = signal<CartItem[]>([]);
  public summary = signal<CartSummary>({
    itemCount: 0,
    subtotal: 0,
    shippingFee: 0,
    tax: 0,
    discount: 0,
    total: 0
  });

  public appliedCoupon = signal<{ code: string; discount: number; description: string } | null>(null);
  public isCartDrawerOpen = signal<boolean>(false);

  public totalItemsCount = computed(() => {
    return this.items().reduce((acc, item) => acc + item.quantity, 0);
  });

  constructor() {
    this.fetchCart().subscribe();
  }

  public fetchCart() {
    return this.api.get<{ success: boolean; items: CartItem[]; summary: CartSummary }>('/cart').pipe(
      tap(res => {
        if (res.success) {
          this.items.set(res.items);
          this.summary.set(res.summary);
        }
      })
    );
  }

  public addToCart(productId: string, variantId?: string, quantity: number = 1) {
    return this.api.post<{ success: boolean; item: CartItem }>('/cart', {
      productId,
      variantId,
      quantity
    }).pipe(
      tap(res => {
        if (res.success) {
          this.fetchCart().subscribe();
          this.openCartDrawer();
        }
      })
    );
  }

  public updateQuantity(itemId: string, quantity: number) {
    return this.api.put<{ success: boolean; item: CartItem }>(`/cart/${itemId}`, { quantity }).pipe(
      tap(() => this.fetchCart().subscribe())
    );
  }

  public removeItem(itemId: string) {
    return this.api.delete<{ success: boolean; message: string }>(`/cart/${itemId}`).pipe(
      tap(() => this.fetchCart().subscribe())
    );
  }

  public clearCart() {
    return this.api.delete<{ success: boolean; message: string }>('/cart').pipe(
      tap(() => {
        this.items.set([]);
        this.appliedCoupon.set(null);
        this.summary.set({
          itemCount: 0,
          subtotal: 0,
          shippingFee: 0,
          tax: 0,
          discount: 0,
          total: 0
        });
      })
    );
  }

  public applyCoupon(code: string) {
    return this.api.post<any>('/cart/apply-coupon', { code }).pipe(
      tap(res => {
        if (res.success) {
          this.appliedCoupon.set(res.coupon);
          this.summary.set(res.summary);
        }
      })
    );
  }

  public openCartDrawer() {
    this.isCartDrawerOpen.set(true);
  }

  public closeCartDrawer() {
    this.isCartDrawerOpen.set(false);
  }
}
