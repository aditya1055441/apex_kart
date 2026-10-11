import { dbConnection } from './connection';
import { ShipmentTracking, TrackingEvent, ShipmentStatus } from '../types';

export class TrackingDatabase {
  // In-memory fallback stores
  private memoryShipments: Map<string, ShipmentTracking> = new Map();
  private memoryEvents: TrackingEvent[] = [];
  private nextShipmentId: number = 1000;
  private nextEventId: number = 5000;

  public async createShipment(
    orderId: string,
    trackingNumber: string,
    estimatedDelivery?: string
  ): Promise<ShipmentTracking> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    const now = new Date().toISOString();
    const estDate = estimatedDelivery || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          `INSERT INTO shipment_tracking (order_id, tracking_number, current_status, estimated_delivery, created_at, updated_at)
           VALUES ($1, $2, 'ORDER_PLACED', $3, $4, $4)
           ON CONFLICT (order_id) DO UPDATE SET updated_at = EXCLUDED.updated_at
           RETURNING *;`,
          [orderId, trackingNumber, estDate, now]
        );

        const row = res.rows[0];
        return {
          id: row.id,
          orderId: row.order_id,
          trackingNumber: row.tracking_number,
          currentStatus: row.current_status,
          estimatedDelivery: row.estimated_delivery ? row.estimated_delivery.toISOString().split('T')[0] : estDate,
          createdAt: row.created_at?.toISOString() || now,
          updatedAt: row.updated_at?.toISOString() || now,
          events: []
        };
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL insert error, using fallback:', err.message);
      }
    }

    // In-memory fallback
    const id = this.nextShipmentId++;
    const shipment: ShipmentTracking = {
      id,
      orderId,
      trackingNumber,
      currentStatus: 'ORDER_PLACED',
      estimatedDelivery: estDate,
      createdAt: now,
      updatedAt: now,
      events: []
    };
    this.memoryShipments.set(trackingNumber.toUpperCase(), shipment);
    this.memoryShipments.set(orderId, shipment);
    return shipment;
  }

  public async addTrackingEvent(
    shipmentId: number | string,
    status: ShipmentStatus,
    description: string,
    location?: string
  ): Promise<TrackingEvent> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    const now = new Date().toISOString();

    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          `INSERT INTO tracking_events (shipment_id, status, location, description, event_time, created_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           RETURNING *;`,
          [shipmentId, status, location || null, description, now]
        );

        const row = res.rows[0];
        return {
          id: row.id,
          shipmentId: row.shipment_id,
          status: row.status,
          location: row.location || undefined,
          description: row.description,
          eventTime: row.event_time?.toISOString() || now,
          createdAt: row.created_at?.toISOString() || now
        };
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL event insert error, using fallback:', err.message);
      }
    }

    const event: TrackingEvent = {
      id: this.nextEventId++,
      shipmentId,
      status,
      location,
      description,
      eventTime: now,
      createdAt: now
    };
    this.memoryEvents.push(event);
    return event;
  }

  public async updateShipmentStatus(
    shipmentId: number | string,
    newStatus: ShipmentStatus
  ): Promise<void> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    const now = new Date().toISOString();

    if (pool && dbConnection.isConnected()) {
      try {
        await pool.query(
          `UPDATE shipment_tracking
           SET current_status = $1, updated_at = $2
           WHERE id = $3;`,
          [newStatus, now, shipmentId]
        );
        return;
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL status update error:', err.message);
      }
    }

    // In-memory fallback
    for (const shipment of this.memoryShipments.values()) {
      if (shipment.id === shipmentId || shipment.id.toString() === shipmentId.toString()) {
        shipment.currentStatus = newStatus;
        shipment.updatedAt = now;
      }
    }
  }

  public async getShipmentByTrackingNumber(trackingNumber: string): Promise<ShipmentTracking | null> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    const cleanNum = trackingNumber.trim().toUpperCase();

    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          `SELECT * FROM shipment_tracking WHERE UPPER(tracking_number) = $1;`,
          [cleanNum]
        );

        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        const events = await this.getTrackingEvents(row.id);

        return {
          id: row.id,
          orderId: row.order_id,
          trackingNumber: row.tracking_number,
          currentStatus: row.current_status,
          estimatedDelivery: row.estimated_delivery ? row.estimated_delivery.toISOString().split('T')[0] : undefined,
          createdAt: row.created_at?.toISOString() || '',
          updatedAt: row.updated_at?.toISOString() || '',
          events
        };
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL get by tracking number error:', err.message);
      }
    }

    // In-memory fallback
    const shipment = this.memoryShipments.get(cleanNum);
    if (!shipment) return null;
    const events = await this.getTrackingEvents(shipment.id);
    return { ...shipment, events };
  }

  public async getShipmentByOrderId(orderId: string): Promise<ShipmentTracking | null> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          `SELECT * FROM shipment_tracking WHERE order_id = $1;`,
          [orderId]
        );

        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        const events = await this.getTrackingEvents(row.id);

        return {
          id: row.id,
          orderId: row.order_id,
          trackingNumber: row.tracking_number,
          currentStatus: row.current_status,
          estimatedDelivery: row.estimated_delivery ? row.estimated_delivery.toISOString().split('T')[0] : undefined,
          createdAt: row.created_at?.toISOString() || '',
          updatedAt: row.updated_at?.toISOString() || '',
          events
        };
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL get by order id error:', err.message);
      }
    }

    // In-memory fallback
    const shipment = this.memoryShipments.get(orderId);
    if (!shipment) return null;
    const events = await this.getTrackingEvents(shipment.id);
    return { ...shipment, events };
  }

  public async getTrackingEvents(shipmentId: number | string): Promise<TrackingEvent[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    if (pool && dbConnection.isConnected()) {
      try {
        const res = await pool.query(
          `SELECT * FROM tracking_events WHERE shipment_id = $1 ORDER BY event_time ASC, id ASC;`,
          [shipmentId]
        );

        return res.rows.map(row => ({
          id: row.id,
          shipmentId: row.shipment_id,
          status: row.status,
          location: row.location || undefined,
          description: row.description,
          eventTime: row.event_time?.toISOString() || '',
          createdAt: row.created_at?.toISOString() || ''
        }));
      } catch (err: any) {
        console.error('[TRACKING DB ERROR] PostgreSQL get events error:', err.message);
      }
    }

    return this.memoryEvents
      .filter(e => e.shipmentId === shipmentId || e.shipmentId.toString() === shipmentId.toString())
      .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  }
}

export const trackingDb = new TrackingDatabase();
