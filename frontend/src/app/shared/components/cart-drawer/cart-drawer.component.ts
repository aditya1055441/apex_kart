import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    @if (cart.isCartDrawerOpen()) {
      <div class="drawer-backdrop" (click)="cart.closeCartDrawer()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header flex justify-between items-center">
            <h3 class="drawer-title flex items-center gap-2">
              <span>Shopping Cart</span>
              <span class="badge badge-primary">{{ cart.totalItemsCount() }}</span>
            </h3>
            <button class="close-btn" (click)="cart.closeCartDrawer()" aria-label="Close">✕</button>
          </div>

          <div class="drawer-body">
            @if (cart.items().length === 0) {
              <div class="empty-cart-state text-center py-12">
                <span class="empty-icon">🛍️</span>
                <h4>Your cart is empty</h4>
                <p class="text-sm text-muted mb-4">Looks like you haven't added anything yet.</p>
                <button class="btn btn-primary btn-sm" (click)="cart.closeCartDrawer()" routerLink="/products">
                  Explore Products
                </button>
              </div>
            } @else {
              <!-- Cart Items List -->
              <div class="cart-items-list">
                @for (item of cart.items(); track item.id) {
                  <div class="cart-item-row flex gap-3">
                    <img [src]="item.image" [alt]="item.title" class="item-thumb" />
                    <div class="item-details flex-1">
                      <span class="item-store text-xs text-muted">{{ item.storeName }}</span>
                      <h4 class="item-title">{{ item.title }}</h4>
                      <div class="item-price font-bold">₹{{ item.price.toLocaleString() }}</div>
                      
                      <div class="item-actions flex items-center justify-between mt-2">
                        <div class="qty-control flex items-center">
                          <button (click)="cart.updateQuantity(item.id, item.quantity - 1)" class="qty-btn">-</button>
                          <span class="qty-val">{{ item.quantity }}</span>
                          <button (click)="cart.updateQuantity(item.id, item.quantity + 1)" class="qty-btn">+</button>
                        </div>
                        <button (click)="cart.removeItem(item.id)" class="remove-btn text-xs text-danger">Remove</button>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Coupon Code Section -->
              <div class="coupon-box my-4">
                <div class="flex gap-2">
                  <input 
                    type="text" 
                    [(ngModel)]="couponInput" 
                    placeholder="Enter coupon (e.g. WELCOME10)" 
                    class="form-control text-sm"
                  />
                  <button class="btn btn-outline btn-sm" (click)="applyCoupon()">Apply</button>
                </div>
                @if (couponMessage) {
                  <p class="coupon-msg text-xs mt-1" [class.text-danger]="!isCouponSuccess" [class.text-success]="isCouponSuccess">
                    {{ couponMessage }}
                  </p>
                }
              </div>

              <!-- Price Breakdown -->
              <div class="price-breakdown text-sm">
                <div class="flex justify-between py-1">
                  <span class="text-muted">Subtotal</span>
                  <span>₹{{ cart.summary().subtotal.toLocaleString() }}</span>
                </div>
                @if (cart.summary().discount > 0) {
                  <div class="flex justify-between py-1 text-success">
                    <span>Discount</span>
                    <span>-₹{{ cart.summary().discount.toLocaleString() }}</span>
                  </div>
                }
                <div class="flex justify-between py-1">
                  <span class="text-muted">Estimated Tax (18%)</span>
                  <span>₹{{ cart.summary().tax.toLocaleString() }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-muted">Delivery</span>
                  <span>{{ cart.summary().shippingFee === 0 ? 'FREE' : '₹' + cart.summary().shippingFee }}</span>
                </div>
                <div class="flex justify-between py-2 border-top font-bold text-base mt-2">
                  <span>Total Amount</span>
                  <span class="text-primary font-display">₹{{ cart.summary().total.toLocaleString() }}</span>
                </div>
              </div>
            }
          </div>

          @if (cart.items().length > 0) {
            <div class="drawer-footer">
              <button class="btn btn-primary btn-block btn-lg" (click)="proceedToCheckout()">
                Proceed to Checkout (₹{{ cart.summary().total.toLocaleString() }}) →
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    .drawer-panel {
      width: 100%;
      max-width: 420px;
      height: 100%;
      background: #ffffff;
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .drawer-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
    }
    .close-btn {
      font-size: 1.25rem;
      color: var(--text-muted);
      padding: 0.25rem;
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }
    .empty-icon {
      font-size: 3.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    .cart-item-row {
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
    }
    .item-thumb {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-md);
      object-fit: cover;
      background: #f1f5f9;
    }
    .item-title {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.3;
      margin: 0.15rem 0;
    }
    .qty-control {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .qty-btn {
      width: 26px;
      height: 26px;
      background: #f8fafc;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qty-btn:hover { background: #e2e8f0; }
    .qty-val {
      padding: 0 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .border-top {
      border-top: 1px solid var(--border);
    }
    .drawer-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      background: #f8fafc;
    }
    .text-success { color: #15803d; }
  `]
})
export class CartDrawerComponent {
  public cart = inject(CartService);
  public auth = inject(AuthService);
  private router = inject(Router);

  public couponInput = '';
  public couponMessage = '';
  public isCouponSuccess = false;

  applyCoupon() {
    if (!this.couponInput.trim()) return;
    this.cart.applyCoupon(this.couponInput.trim()).subscribe({
      next: res => {
        this.couponMessage = res.message;
        this.isCouponSuccess = true;
      },
      error: err => {
        this.couponMessage = err.error?.message || 'Invalid coupon code';
        this.isCouponSuccess = false;
      }
    });
  }

  proceedToCheckout() {
    this.cart.closeCartDrawer();
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal();
      return;
    }
    this.router.navigate(['/checkout']);
  }
}
