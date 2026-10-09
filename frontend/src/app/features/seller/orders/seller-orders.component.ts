import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { OrderItem } from '../../../core/models';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-orders.component.html',
  styleUrls: ['./seller-orders.component.css']
})
export class SellerOrdersComponent implements OnInit {
  private api = inject(ApiService);

  public sellerOrders = signal<any[]>([]);
  public loading = signal<boolean>(true);

  // Ship modal
  public isShipModalOpen = signal<boolean>(false);
  public activeOrder = signal<any>(null);
  public activeItem = signal<OrderItem | null>(null);
  public courierName = 'Blue Dart Express';
  public trackingNumber = '';
  public isSubmitting = signal<boolean>(false);

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.api.get<{ success: boolean; orders: any[] }>('/seller/orders').subscribe({
      next: res => {
        if (res.success) this.sellerOrders.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openShipModal(order: any, item: OrderItem) {
    this.activeOrder.set(order);
    this.activeItem.set(item);
    this.trackingNumber = `TRK-${Date.now().toString().slice(-6)}`;
    this.isShipModalOpen.set(true);
  }

  closeShipModal() {
    this.isShipModalOpen.set(false);
    this.activeOrder.set(null);
    this.activeItem.set(null);
  }

  submitShipment() {
    if (!this.activeOrder() || !this.activeItem() || !this.trackingNumber.trim()) return;

    this.isSubmitting.set(true);
    const orderId = this.activeOrder().id;
    const itemId = this.activeItem()!.id;

    this.api.put(`/seller/orders/${orderId}/items/${itemId}/status`, {
      status: 'SHIPPED',
      courierName: this.courierName,
      trackingNumber: this.trackingNumber
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeShipModal();
        this.loadOrders();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  markDelivered(order: any, item: OrderItem) {
    if (!confirm(`Mark item "${item.productTitle}" as DELIVERED to buyer?`)) return;

    this.api.put(`/seller/orders/${order.id}/items/${item.id}/status`, {
      status: 'DELIVERED'
    }).subscribe({
      next: () => this.loadOrders()
    });
  }

  approveReturn(order: any, item: OrderItem) {
    if (!confirm(`Approve customer return for "${item.productTitle}"?`)) return;

    this.api.put(`/seller/orders/${order.id}/items/${item.id}/status`, {
      status: 'RETURNED'
    }).subscribe({
      next: () => this.loadOrders()
    });
  }
}
