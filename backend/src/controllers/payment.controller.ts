import { Request, Response } from 'express';
import { razorpayService } from '../services/razorpay.service';
import { db } from '../database/db';

export const getRazorpayConfig = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    keyId: razorpayService.getKeyId()
  });
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ success: false, message: 'Missing required payment verification parameters' });
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || ''
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    order.paymentStatus = 'PAID';
    order.status = 'PROCESSING';
    order.razorpayPaymentId = razorpayPaymentId;
    order.items.forEach(item => (item.status = 'PROCESSING'));

    await db.updateOrderStatus(orderId, 'PROCESSING', 'PAID');

    // Notify customer
    await db.createNotification({
      id: `notif-${Date.now()}`,
      userId: order.customerId,
      title: 'Payment Successful',
      message: `Your payment of ₹${order.totalAmount.toLocaleString()} for order #${order.orderNumber} was confirmed.`,
      type: 'ORDER',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Payment verified and order is now being processed',
      order
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body?.event;
    console.log(`[RAZORPAY WEBHOOK] Received event: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        const order = Array.from(db.orders.values()).find(o => o.razorpayOrderId === rzpOrderId);
        if (order && order.paymentStatus !== 'PAID') {
          order.paymentStatus = 'PAID';
          order.status = 'PROCESSING';
          order.razorpayPaymentId = paymentEntity.id;
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
