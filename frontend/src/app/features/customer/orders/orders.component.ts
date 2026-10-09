import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderItem } from '../../../core/models';

declare var Razorpay: any;

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public orders = signal<Order[]>([]);
  public loading = signal<boolean>(true);
  public isPayingOrderId = signal<string | null>(null);

  // Return modal
  public isReturnModalOpen = signal<boolean>(false);
  public activeReturnOrder = signal<Order | null>(null);
  public activeReturnItem = signal<OrderItem | null>(null);
  public returnReason = '';
  public returnSubmitting = signal<boolean>(false);

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.api.get<{ success: boolean; orders: Order[] }>('/orders/my').subscribe({
      next: res => {
        if (res.success) this.orders.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cancelOrder(order: Order) {
    if (!confirm(`Are you sure you want to cancel order #${order.orderNumber}?`)) return;

    this.api.post<{ success: boolean; order: Order }>(`/orders/${order.id}/cancel`, {}).subscribe({
      next: res => {
        if (res.success) {
          this.orders.update(list => list.map(o => (o.id === order.id ? res.order : o)));
        }
      },
      error: err => alert(err.error?.message || 'Cannot cancel this order')
    });
  }

  resumePaymentForOrder(order: Order) {
    this.isPayingOrderId.set(order.id);
    this.api.post<{ success: boolean; order: Order; razorpay: any }>(`/payments/orders/${order.id}/retry`, {}).subscribe({
      next: res => {
        if (res.success && res.razorpay) {
          this.launchRazorpayForOrder(res.order, res.razorpay);
        } else {
          this.isPayingOrderId.set(null);
        }
      },
      error: err => {
        this.isPayingOrderId.set(null);
        alert(err.error?.message || 'Unable to resume payment for this order');
      }
    });
  }

  launchRazorpayForOrder(order: Order, rzpConfig: any) {
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
        this.api.post<{ success: boolean; order: Order }>('/payments/verify', {
          orderId: order.id,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature || 'mock_signature'
        }).subscribe({
          next: () => {
            this.isPayingOrderId.set(null);
            this.loadOrders();
            alert(`Payment of ₹${order.totalAmount.toLocaleString()} completed successfully! Your order is now being processed.`);
          },
          error: () => {
            this.isPayingOrderId.set(null);
            alert('Payment captured, but signature verification failed. Please contact support.');
          }
        });
      },
      modal: {
        ondismiss: () => {
          this.isPayingOrderId.set(null);
        }
      }
    };

    try {
      if (typeof Razorpay !== 'undefined') {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response: any) => {
          this.isPayingOrderId.set(null);
          alert(response.error?.description || 'Payment was declined or failed.');
        });
        rzp.open();
      } else {
        const confirmed = confirm(`[Razorpay Sandbox Gateway]\nAmount: ₹${order.totalAmount.toLocaleString()}\nOrder ID: ${rzpConfig.orderId}\n\nClick OK to simulate Successful Payment.`);
        if (confirmed) {
          this.api.post('/payments/verify', {
            orderId: order.id,
            razorpayOrderId: rzpConfig.orderId,
            razorpayPaymentId: 'pay_sim_' + Date.now(),
            razorpaySignature: 'sig'
          }).subscribe(() => {
            this.isPayingOrderId.set(null);
            this.loadOrders();
          });
        } else {
          this.isPayingOrderId.set(null);
        }
      }
    } catch (e: any) {
      this.isPayingOrderId.set(null);
      alert(e.message || 'Error opening payment gateway');
    }
  }

  openReturnModal(order: Order, item: OrderItem) {
    this.activeReturnOrder.set(order);
    this.activeReturnItem.set(item);
    this.returnReason = '';
    this.isReturnModalOpen.set(true);
  }

  closeReturnModal() {
    this.isReturnModalOpen.set(false);
    this.activeReturnOrder.set(null);
    this.activeReturnItem.set(null);
  }

  submitReturn() {
    if (!this.activeReturnOrder() || !this.activeReturnItem() || !this.returnReason.trim()) return;

    this.returnSubmitting.set(true);
    const orderId = this.activeReturnOrder()!.id;
    const itemId = this.activeReturnItem()!.id;

    this.api.post<{ success: boolean; item: OrderItem }>(`/orders/${orderId}/items/${itemId}/return`, {
      reason: this.returnReason
    }).subscribe({
      next: () => {
        this.returnSubmitting.set(false);
        this.closeReturnModal();
        this.loadOrders();
        alert('Return request has been registered and sent to the vendor.');
      },
      error: err => {
        this.returnSubmitting.set(false);
        alert(err.error?.message || 'Failed to submit return request');
      }
    });
  }

  getStatusStep(status: string): number {
    switch (status) {
      case 'PLACED': return 1;
      case 'PROCESSING': return 2;
      case 'SHIPPED': return 3;
      case 'DELIVERED': return 4;
      default: return 1;
    }
  }
}
