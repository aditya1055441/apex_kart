import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrackingService } from '../../../core/services/tracking.service';
import { ShipmentTracking, ShipmentStatus, TrackingEvent } from '../../../core/models';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private trackingService = inject(TrackingService);

  public trackingInput = '';
  public loading = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public trackingData = signal<ShipmentTracking | null>(null);

  public readonly LIFECYCLE_STEPS: { status: ShipmentStatus; label: string; icon: string }[] = [
    { status: 'ORDER_PLACED', label: 'Order Placed', icon: '📝' },
    { status: 'PACKED', label: 'Packed', icon: '📦' },
    { status: 'SHIPPED', label: 'Shipped', icon: '🚚' },
    { status: 'IN_TRANSIT', label: 'In Transit', icon: '✈️' },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
    { status: 'DELIVERED', label: 'Delivered', icon: '✅' }
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['id'] || params['trackingNumber'] || params['orderId'];
      if (id) {
        this.trackingInput = id;
        this.searchTracking(id);
      }
    });
  }

  onSearchSubmit() {
    if (!this.trackingInput.trim()) {
      this.errorMessage.set('Please enter a valid tracking number or order ID');
      return;
    }
    // Update URL query param cleanly without full reload
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: this.trackingInput.trim() },
      queryParamsHandling: 'merge'
    });
    this.searchTracking(this.trackingInput.trim());
  }

  searchTracking(trackingId: string) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.trackingData.set(null);

    this.trackingService.getTrackingInfo(trackingId).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.tracking) {
          this.trackingData.set(res.tracking);
        } else {
          this.errorMessage.set(`No tracking info found for "${trackingId}".`);
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || `No shipment found for "${trackingId}". Please check the number and try again.`
        );
      }
    });
  }

  isStepCompleted(stepStatus: ShipmentStatus): boolean {
    const current = this.trackingData()?.currentStatus;
    if (!current) return false;
    if (current === 'CANCELLED' || current === 'DELIVERY_FAILED') return false;

    const order: ShipmentStatus[] = [
      'ORDER_PLACED',
      'PACKED',
      'SHIPPED',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED'
    ];

    const currentIndex = order.indexOf(current);
    const stepIndex = order.indexOf(stepStatus);
    return stepIndex !== -1 && currentIndex !== -1 && stepIndex <= currentIndex;
  }

  isStepCurrent(stepStatus: ShipmentStatus): boolean {
    return this.trackingData()?.currentStatus === stepStatus;
  }

  copyTrackingNumber() {
    const num = this.trackingData()?.trackingNumber;
    if (num) {
      navigator.clipboard?.writeText(num);
    }
  }

  getStatusBadgeClass(status?: ShipmentStatus): string {
    switch (status) {
      case 'DELIVERED':
        return 'badge-success';
      case 'CANCELLED':
      case 'DELIVERY_FAILED':
        return 'badge-danger';
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
      case 'SHIPPED':
        return 'badge-info';
      default:
        return 'badge-warning';
    }
  }

  formatStatus(status?: ShipmentStatus): string {
    if (!status) return '';
    return status.replace(/_/g, ' ');
  }
}
