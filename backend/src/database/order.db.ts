import { Order, OrderItem } from '../types';
import { dbConnection } from './connection';
import { storeDb } from './store.db';

export const mapRowToOrderItem = (i: any): OrderItem => ({
  id: i.id,
  orderId: i.order_id,
  storeId: i.store_id,
  storeName: i.store_name,
  productId: i.product_id,
  variantId: i.variant_id,
  productTitle: i.product_title,
  sku: i.sku,
  price: parseFloat(i.price),
  quantity: parseInt(i.quantity, 10),
  image: i.image,
  subtotal: parseFloat(i.subtotal),
  status: i.status,
  trackingNumber: i.tracking_number,
  courierName: i.courier_name,
  returnReason: i.return_reason
});

export const mapRowToOrder = (o: any, items: OrderItem[] = []): Order => ({
  id: o.id,
  orderNumber: o.order_number,
  customerId: o.customer_id,
  customerName: o.customer_name,
  customerEmail: o.customer_email,
  customerPhone: o.customer_phone,
  shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {}),
  paymentMethod: o.payment_method,
  paymentStatus: o.payment_status,
  razorpayOrderId: o.razorpay_order_id,
  razorpayPaymentId: o.razorpay_payment_id,
  subtotal: parseFloat(o.subtotal),
  discount: parseFloat(o.discount) || 0,
  couponCode: o.coupon_code,
  tax: parseFloat(o.tax) || 0,
  shippingFee: parseFloat(o.shipping_fee) || 0,
  totalAmount: parseFloat(o.total_amount),
  status: o.status,
  items,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});

export class OrderDatabase {
  public async createOrder(order: Order): Promise<Order> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('placing an order');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, subtotal, discount, coupon_code, tax, shipping_fee, total_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
      [
        order.id, order.orderNumber, order.customerId, order.customerName, order.customerEmail, order.customerPhone,
        JSON.stringify(order.shippingAddress), order.paymentMethod, order.paymentStatus, order.razorpayOrderId || null,
        order.razorpayPaymentId || null, order.subtotal, order.discount, order.couponCode || null, order.tax,
        order.shippingFee, order.totalAmount, order.status, order.createdAt, order.updatedAt
      ]
    );

    for (const item of order.items) {
      await pool.query(
        `INSERT INTO order_items (id, order_id, store_id, store_name, product_id, variant_id, product_title, sku, price, quantity, image, subtotal, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          item.id, order.id, item.storeId, item.storeName, item.productId, item.variantId || null,
          item.productTitle, item.sku || null, item.price, item.quantity, item.image, item.subtotal, item.status
        ]
      );
    }

    // Stock deduction & store balance update
    for (const item of order.items) {
      await pool.query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2;', [item.quantity, item.productId]);
      if (item.variantId) {
        await pool.query('UPDATE product_variants SET stock = GREATEST(0, stock - $1) WHERE id = $2;', [item.quantity, item.variantId]);
      }
      const store = await storeDb.findStoreById(item.storeId);
      if (store) {
        const commission = (item.subtotal * store.commissionRate) / 100;
        const sellerShare = item.subtotal - commission;
        await pool.query('UPDATE stores SET balance = balance + $1, total_earnings = total_earnings + $1 WHERE id = $2;', [sellerShare, store.id]);
      }
    }

    return order;
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM orders WHERE id = $1;', [id]);
    if (res.rows.length === 0) return undefined;

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1;', [id]);
    const items = itemsRes.rows.map(mapRowToOrderItem);

    return mapRowToOrder(res.rows[0], items);
  }

  public async findOrderByRazorpayOrderId(rzpOrderId: string): Promise<Order | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM orders WHERE razorpay_order_id = $1;', [rzpOrderId]);
    if (res.rows.length === 0) return undefined;

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1;', [res.rows[0].id]);
    return mapRowToOrder(res.rows[0], itemsRes.rows.map(mapRowToOrderItem));
  }

  public async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC;', [customerId]);
    if (res.rows.length === 0) return [];

    const orderIds = res.rows.map((r: any) => r.id);
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = ANY($1);', [orderIds]);

    const itemsByOrder = new Map<string, OrderItem[]>();
    itemsRes.rows.forEach((i: any) => {
      const list = itemsByOrder.get(i.order_id) || [];
      list.push(mapRowToOrderItem(i));
      itemsByOrder.set(i.order_id, list);
    });

    return res.rows.map((r: any) => mapRowToOrder(r, itemsByOrder.get(r.id) || []));
  }

  public async getOrdersForStore(storeId: string): Promise<{ order: Order; items: OrderItem[] }[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const allOrders = await this.getAllOrders();
    const results: { order: Order; items: OrderItem[] }[] = [];
    for (const order of allOrders) {
      const storeItems = order.items.filter(item => item.storeId === storeId);
      if (storeItems.length > 0) {
        results.push({ order, items: storeItems });
      }
    }
    return results;
  }

  public async getAllOrders(): Promise<Order[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC;');
    if (res.rows.length === 0) return [];

    const orderIds = res.rows.map((r: any) => r.id);
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = ANY($1);', [orderIds]);

    const itemsByOrder = new Map<string, OrderItem[]>();
    itemsRes.rows.forEach((i: any) => {
      const list = itemsByOrder.get(i.order_id) || [];
      list.push(mapRowToOrderItem(i));
      itemsByOrder.set(i.order_id, list);
    });

    return res.rows.map((r: any) => mapRowToOrder(r, itemsByOrder.get(r.id) || []));
  }

  public async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ): Promise<Order | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating order status');
    const pool = dbConnection.getPool()!;

    const updatedAt = new Date().toISOString();
    await pool.query(
      'UPDATE orders SET status = $1, payment_status = COALESCE($2, payment_status), updated_at = $3 WHERE id = $4;',
      [status, paymentStatus || null, updatedAt, orderId]
    );
    return this.getOrderById(orderId);
  }

  public async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    status: OrderItem['status'],
    trackingInfo?: { trackingNumber?: string; courierName?: string; returnReason?: string }
  ): Promise<OrderItem | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating shipment fulfillment status');
    const pool = dbConnection.getPool()!;

    await pool.query(
      'UPDATE order_items SET status = $1, tracking_number = COALESCE($2, tracking_number), courier_name = COALESCE($3, courier_name), return_reason = COALESCE($4, return_reason) WHERE id = $5 AND order_id = $6;',
      [status, trackingInfo?.trackingNumber || null, trackingInfo?.courierName || null, trackingInfo?.returnReason || null, itemId, orderId]
    );

    const itemRes = await pool.query('SELECT * FROM order_items WHERE id = $1;', [itemId]);
    return itemRes.rows.length > 0 ? mapRowToOrderItem(itemRes.rows[0]) : undefined;
  }
}

export const orderDb = new OrderDatabase();
