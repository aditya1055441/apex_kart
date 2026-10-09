import { Request, Response } from 'express';
import { razorpayService } from '../services/razorpay.service';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

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
        const order = await db.findOrderByRazorpayOrderId(rzpOrderId);
        if (order && order.paymentStatus !== 'PAID') {
          await db.updateOrderStatus(order.id, 'PROCESSING', 'PAID');
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const retryOrderPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await db.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order has already been paid for' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot resume payment for a cancelled order' });
    }

    let razorpayOrderId = order.razorpayOrderId;

    // If order didn't have a razorpayOrderId or it needs renewal, create one
    if (!razorpayOrderId) {
      const rzpOrder = await razorpayService.createOrder({
        amount: order.totalAmount,
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          customerId: order.customerId
        }
      });
      razorpayOrderId = rzpOrder.id;
      order.razorpayOrderId = razorpayOrderId;
      await db.updateOrderStatus(order.id, order.status, order.paymentStatus);
    }

    return res.json({
      success: true,
      message: 'Razorpay session ready for retry',
      order,
      razorpay: {
        orderId: razorpayOrderId,
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        keyId: razorpayService.getKeyId()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
