import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ShipmentTracking } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private api = inject(ApiService);

  public getTrackingInfo(trackingId: string): Observable<{ success: boolean; tracking: ShipmentTracking }> {
    return this.api.get<{ success: boolean; tracking: ShipmentTracking }>('/orders/tracking', {
      trackingNumber: trackingId.trim()
    });
  }
}
