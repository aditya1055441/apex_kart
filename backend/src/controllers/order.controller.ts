import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { razorpayService } from '../services/razorpay.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderItem, Address } from '../types';

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { shippingAddress, paymentMethod = 'RAZORPAY', couponCode, items: directItems } = req.body;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1) {
      return res.status(400).json({ success: false, message: 'Valid shipping address is required' });
    }

    // Retrieve items from user's cart or from payload
    let cartItems = directItems;
    if (!cartItems || cartItems.length === 0) {
      cartItems = await db.getCart(userId);
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Add products to place an order.' });
    }

    // Validate inventory and prepare order items
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const product = await db.getProductById(item.productId);
      if (!product || product.status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: `Product "${item.title || item.productId}" is currently unavailable`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.title}". Only ${product.stock} left in stock.`
        });
      }

      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        id: `oi-${uuidv4().substring(0, 8)}`,
        orderId: '', // populated below
        storeId: product.storeId,
        storeName: product.storeName,
        productId: product.id,
        variantId: item.variantId,
        productTitle: item.title || product.title,
        sku: item.variantId
          ? product.variants.find(v => v.id === item.variantId)?.sku || 'SKU'
          : 'SKU',
        price: item.price,
        quantity: item.quantity,
        image: item.image || product.images[0] || '',
        subtotal: itemTotal,
        status: 'PENDING'
      });
    }

    // Apply Coupon Discount
    let discount = 0;
    if (couponCode) {
      const coupon = await db.getCouponByCode(couponCode);
      if (coupon && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'PERCENTAGE') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discountValue;
        }
        await db.incrementCouponUsage(coupon.code);
      }
    }

    const shippingFee = subtotal > 1500 ? 0 : 99;
    const tax = Math.round((subtotal - discount) * 0.18);
    const totalAmount = Math.max(0, subtotal - discount + shippingFee + tax);

    const orderId = `ord-${uuidv4().substring(0, 8)}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    orderItems.forEach(i => (i.orderId = orderId));

    let razorpayOrderId: string | undefined = undefined;

    if (paymentMethod === 'RAZORPAY') {
      const rzpOrder = await razorpayService.createOrder({
        amount: totalAmount,
        receipt: orderNumber,
        notes: {
          orderId,
          customerId: userId
        }
      });
      razorpayOrderId = rzpOrder.id;
    }

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: userId,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
      razorpayOrderId,
      subtotal,
      discount,
      couponCode,
      tax,
      shippingFee,
      totalAmount,
      status: 'PLACED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedOrder = await db.createOrder(newOrder);

    // Clear cart
    await db.clearCart(userId);

    // Notify customer
    await db.createNotification({
      id: `notif-${uuidv4().substring(0, 8)}`,
      userId,
      title: 'Order Placed Successfully!',
      message: `Your order #${orderNumber} for ₹${totalAmount.toLocaleString()} has been placed.`,
      type: 'ORDER',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    // Notify each store vendor
    const uniqueStores = [...new Set(orderItems.map(i => i.storeId))];
    for (const storeId of uniqueStores) {
      const store = await db.findStoreById(storeId);
      if (store) {
        await db.createNotification({
          id: `notif-${uuidv4().substring(0, 8)}`,
          userId: store.userId,
          title: 'New Order Received',
          message: `You have new items to fulfill in order #${orderNumber}.`,
          type: 'ORDER',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder,
      razorpay: razorpayOrderId
        ? {
            orderId: razorpayOrderId,
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
            keyId: razorpayService.getKeyId()
          }
        : undefined
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.getOrdersByCustomer(req.user!.id);
    return res.json({ success: true, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await db.getOrderById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Access control: Customer owns order, or Seller has items in order, or Admin
    if (req.user!.role === 'CUSTOMER' && order.customerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user!.role === 'SELLER') {
      const hasSellerItems = order.items.some(i => i.storeId === req.user!.storeId);
      if (!hasSellerItems) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await db.getOrderById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user!.role !== 'ADMIN' && order.customerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been shipped or delivered. Please submit a Return Request instead.'
      });
    }

    const updated = await db.updateOrderStatus(id, 'CANCELLED');
    // Also cancel all order items
    order.items.forEach(i => (i.status = 'CANCELLED'));

    return res.json({ success: true, message: 'Order cancelled successfully', order: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestItemReturn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updatedItem = await db.updateOrderItemStatus(orderId, itemId, 'RETURN_REQUESTED', {
      returnReason: reason || 'Item return requested by customer'
    });

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    return res.json({
      success: true,
      message: 'Return request submitted successfully. The seller and admin will review it.',
      item: updatedItem
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
