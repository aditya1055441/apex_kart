import { trackingDb } from '../database/tracking.db';
import { db } from '../database/db';
import { ShipmentStatus, ShipmentTracking, TrackingEvent } from '../types';

export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  ORDER_PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERY_FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

export const STATUS_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  ORDER_PLACED: "Customer's order is confirmed.",
  PACKED: "Warehouse has packed the product.",
  SHIPPED: "Parcel has left the warehouse.",
  IN_TRANSIT: "Parcel is moving between logistics facilities.",
  OUT_FOR_DELIVERY: "Courier is delivering the parcel.",
  DELIVERED: "Customer's parcel has been delivered.",
  CANCELLED: "Order has been cancelled.",
  DELIVERY_FAILED: "Delivery attempt was unsuccessful. Customer unavailable or incorrect address."
};

export class TrackingService {
  /**
   * Validates if moving from currentStatus to nextStatus is allowed by the lifecycle state machine.
   */
  public isValidTransition(current: ShipmentStatus, next: ShipmentStatus): boolean {
    if (current === next) return true;
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  /**
   * Initializes tracking for an order with status ORDER_PLACED and initial tracking event.
   */
  public async createTrackingForOrder(orderId: string, customTrackingNumber?: string): Promise<ShipmentTracking> {
    const existing = await trackingDb.getShipmentByOrderId(orderId);
    if (existing) {
      return existing;
    }

    const trackingNumber =
      customTrackingNumber ||
      `TRK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const estDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const shipment = await trackingDb.createShipment(orderId, trackingNumber, estDeliveryDate);

    // Initial Event: ORDER_PLACED
    await trackingDb.addTrackingEvent(
      shipment.id,
      'ORDER_PLACED',
      STATUS_DESCRIPTIONS.ORDER_PLACED,
      'Central Order Facility'
    );

    const fullShipment = await trackingDb.getShipmentByTrackingNumber(trackingNumber);
    return fullShipment || shipment;
  }

  /**
   * Transitions a shipment to a new validated status and appends a tracking event.
   */
  public async transitionShipmentStatus(
    trackingNumber: string,
    nextStatus: ShipmentStatus,
    location?: string,
    description?: string
  ): Promise<{ success: boolean; message?: string; shipment?: ShipmentTracking }> {
    const shipment = await trackingDb.getShipmentByTrackingNumber(trackingNumber);
    if (!shipment) {
      return { success: false, message: `Shipment with tracking number ${trackingNumber} not found.` };
    }

    const current = shipment.currentStatus;

    if (!this.isValidTransition(current, nextStatus)) {
      return {
        success: false,
        message: `Invalid shipment status transition: Cannot jump from ${current} to ${nextStatus}. Allowed next states: [${(VALID_TRANSITIONS[current] || []).join(', ')}]`
      };
    }

    // Update current status
    await trackingDb.updateShipmentStatus(shipment.id, nextStatus);

    // Append history event
    const eventDesc = description || STATUS_DESCRIPTIONS[nextStatus];
    const eventLocation = location || (nextStatus === 'OUT_FOR_DELIVERY' || nextStatus === 'DELIVERED' ? 'Destination Hub' : 'Regional Transit Hub');

    await trackingDb.addTrackingEvent(shipment.id, nextStatus, eventDesc, eventLocation);

    const updated = await trackingDb.getShipmentByTrackingNumber(trackingNumber);
    return {
      success: true,
      shipment: updated || undefined
    };
  }

  /**
   * Retrieves tracking details by tracking number or order ID.
   */
  public async getTrackingDetails(identifier: string): Promise<ShipmentTracking | null> {
    const clean = identifier.trim();
    let shipment = await trackingDb.getShipmentByTrackingNumber(clean);
    if (!shipment) {
      shipment = await trackingDb.getShipmentByOrderId(clean);
    }

    if (shipment) {
      const order = await db.getOrderById(shipment.orderId);
      if (order) {
        shipment.order = order;
      }
    }

    return shipment;
  }
}

export const trackingService = new TrackingService();
