import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { CartItem } from '../types';

export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-guest-id'] as string) || 'guest';
    const items = await db.getCart(userId);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = subtotal > 1500 || subtotal === 0 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18); // 18% GST estimate

    return res.json({
      success: true,
      items,
      summary: {
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        subtotal,
        shippingFee,
        tax,
        discount: 0,
        total: subtotal + shippingFee + tax
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-guest-id'] as string) || 'guest';
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let price = product.salePrice;
    let title = product.title;
    let image = product.images[0] || '';
    let selectedAttributes: Record<string, string> = {};

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        price = variant.price;
        title = `${product.title} (${variant.title})`;
        if (variant.image) image = variant.image;
        selectedAttributes = variant.attributes;
      }
    }

    const cartItem: CartItem = {
      id: `cart-${uuidv4().substring(0, 8)}`,
      userId,
      productId,
      variantId,
      title,
      price,
      quantity: Math.max(1, parseInt(quantity, 10)),
      image,
      storeId: product.storeId,
      storeName: product.storeName,
      attributes: selectedAttributes
    };

    const saved = await db.addToCart(cartItem);
    return res.status(201).json({ success: true, item: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Quantity is required' });
    }

    const updated = await db.updateCartQuantity(id, parseInt(quantity, 10));
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const removeCartItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.removeCartItem(id);
    return res.json({ success: true, message: 'Item removed from cart' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-guest-id'] as string) || 'guest';
    await db.clearCart(userId);
    return res.json({ success: true, message: 'Cart cleared' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const applyCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-guest-id'] as string) || 'guest';
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await db.getCouponByCode(code);
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const items = await db.getCart(userId);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      });
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, subtotal);
    const shippingFee = subtotal > 1500 ? 0 : 99;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = Math.max(0, subtotal - discount + shippingFee + tax);

    return res.json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discount
      },
      summary: {
        subtotal,
        discount,
        shippingFee,
        tax,
        total
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
