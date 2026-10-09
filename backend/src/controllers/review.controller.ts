import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { Review } from '../types';

export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await db.getProductReviews(productId);
    return res.json({ success: true, count: reviews.length, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    if (!rating || !comment || !title) {
      return res.status(400).json({ success: false, message: 'Rating, title, and comment are required' });
    }

    const ratingNum = parseInt(rating, 10);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const user = await db.findUserById(req.user!.id);

    // Verify if user purchased the product
    const userOrders = await db.getOrdersByCustomer(req.user!.id);
    const hasPurchased = userOrders.some(
      o => (o.status === 'DELIVERED' || o.paymentStatus === 'PAID') && o.items.some(i => i.productId === productId)
    );

    const review: Review = {
      id: `rev-${uuidv4().substring(0, 8)}`,
      productId,
      customerId: req.user!.id,
      customerName: user?.name || 'Customer',
      rating: ratingNum,
      title,
      comment,
      verifiedPurchase: hasPurchased,
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    };

    const saved = await db.addReview(review);
    return res.status(201).json({ success: true, message: 'Review submitted successfully', review: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
