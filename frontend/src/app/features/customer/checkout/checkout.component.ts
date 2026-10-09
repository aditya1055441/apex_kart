import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { Address, Order } from '../../../core/models';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  private api = inject(ApiService);
  public cart = inject(CartService);
  public auth = inject(AuthService);
  private router = inject(Router);

  public savedAddresses = signal<Address[]>([]);
  public selectedAddressId = signal<string>('new');
  public paymentMethod = signal<'RAZORPAY' | 'COD'>('RAZORPAY');
  public isSubmitting = signal<boolean>(false);
  public orderSuccess = signal<Order | null>(null);
  public pendingOrder = signal<Order | null>(null);
  public pendingRazorpay = signal<any>(null);
  public errorMessage = signal<string>('');

  // New Address form pre-populated dynamically
  public newAddress: Address = {
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: true
  };

  ngOnInit() {
    this.initCustomerDetails();
    if (this.auth.isAuthenticated()) {
      this.loadAddresses();
    }
  }

  initCustomerDetails() {
    const user = this.auth.currentUser();
    if (user) {
      if (!this.newAddress.fullName) {
        this.newAddress.fullName = user.name || '';
      }
      if (!this.newAddress.phone && user.phone && !user.phone.includes('9999999999')) {
        this.newAddress.phone = user.phone;
      }
    }
  }

  loadAddresses() {
    this.api.get<{ success: boolean; addresses: Address[] }>('/auth/addresses').subscribe(res => {
      if (res.success && res.addresses.length > 0) {
        this.savedAddresses.set(res.addresses);
        const def = res.addresses.find(a => a.isDefault) || res.addresses[0];
        if (def && def.id) this.selectedAddressId.set(def.id);
      } else {
        this.selectedAddressId.set('new');
        this.initCustomerDetails();
      }
    });
  }

  getSelectedShippingAddress(): Address {
    if (this.selectedAddressId() !== 'new') {
      const existing = this.savedAddresses().find(a => a.id === this.selectedAddressId());
      if (existing) return existing;
    }
    return this.newAddress;
  }

  placeOrder() {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal();
      return;
    }

    if (this.cart.items().length === 0) {
      this.errorMessage.set('Your cart is empty');
      return;
    }

    const shippingAddress = this.getSelectedShippingAddress();
    if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1) {
      this.errorMessage.set('Please provide a complete shipping address');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      shippingAddress,
      paymentMethod: this.paymentMethod(),
      couponCode: this.cart.appliedCoupon()?.code
    };

    this.api.post<{ success: boolean; order: Order; razorpay?: any }>('/orders', payload).subscribe({
      next: res => {
        if (res.success) {
          if (this.paymentMethod() === 'RAZORPAY' && res.razorpay) {
            this.pendingOrder.set(res.order);
            this.pendingRazorpay.set(res.razorpay);
            this.cart.clearCart();
            this.launchRazorpay(res.order, res.razorpay);
          } else {
            // Cash on Delivery
            this.isSubmitting.set(false);
            this.orderSuccess.set(res.order);
            this.cart.clearCart();
          }
        }
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to place order');
      }
    });
  }

  resumePendingPayment() {
    if (this.pendingOrder() && this.pendingRazorpay()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');
      this.launchRazorpay(this.pendingOrder()!, this.pendingRazorpay()!);
    }
  }

  launchRazorpay(order: Order, rzpConfig: any) {
    const options = {
      key: rzpConfig.keyId,
      amount: rzpConfig.amount,
      currency: rzpConfig.currency || 'INR',
      name: 'ApexKart Marketplace',
      description: `Payment for Order #${order.orderNumber}`,
      order_id: rzpConfig.orderId,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
        contact: order.customerPhone
      },
      theme: {
        color: '#4f46e5'
      },
      handler: (response: any) => {
        // Verify payment signature on backend
        this.api.post<{ success: boolean; order: Order }>('/payments/verify', {
          orderId: order.id,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature || 'mock_signature'
        }).subscribe({
          next: verifyRes => {
            this.isSubmitting.set(false);
            this.pendingOrder.set(null);
            this.pendingRazorpay.set(null);
            this.orderSuccess.set(verifyRes.order);
            this.cart.clearCart();
          },
          error: () => {
            this.isSubmitting.set(false);
            this.errorMessage.set('Payment was captured but signature verification failed. Please contact support.');
          }
        });
      },
      modal: {
        ondismiss: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Payment was cancelled or closed. You can resume and complete your payment below.');
        }
      }
    };

    try {
      if (typeof Razorpay !== 'undefined') {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(response.error?.description || response.error?.reason || 'Payment failed or was declined.');
        });
        rzp.open();
      } else {
        // Fallback simulated payment dialog for environments without live external script
        this.simulateSandboxPayment(order, rzpConfig.orderId);
      }
    } catch (e: any) {
      this.isSubmitting.set(false);
      this.errorMessage.set(e?.message || 'Error opening payment gateway');
    }
  }

  simulateSandboxPayment(order: Order, rzpOrderId: string) {
    const confirmed = confirm(`[Razorpay Sandbox Gateway]\nAmount: ₹${order.totalAmount.toLocaleString()}\nOrder ID: ${rzpOrderId}\n\nClick OK to simulate Successful Payment, or Cancel to abort.`);
    if (confirmed) {
      this.api.post<{ success: boolean; order: Order }>('/payments/verify', {
        orderId: order.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: 'pay_simulated_' + Date.now(),
        razorpaySignature: 'simulated_sig'
      }).subscribe({
        next: verifyRes => {
          this.isSubmitting.set(false);
          this.orderSuccess.set(verifyRes.order);
          this.cart.clearCart();
        }
      });
    } else {
      this.isSubmitting.set(false);
    }
  }
}
