import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderItem } from '../../../core/models';

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
      next: res => {
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
