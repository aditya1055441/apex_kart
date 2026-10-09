import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { Coupon } from '../types';

export const getPlatformAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.getAllOrders();
    const stores = await db.getAllStores();
    const users = await db.getAllUsers();
    const products = await db.getProducts({ status: undefined });

    let totalGmv = 0;
    let totalPlatformRevenue = 0;
    let totalOrdersPaid = 0;

    for (const order of orders) {
      if (order.paymentStatus === 'PAID') {
        totalGmv += order.totalAmount;
        totalOrdersPaid += 1;
        // Calculate platform commission
        for (const item of order.items) {
          const store = stores.find(s => s.id === item.storeId);
          const commRate = store ? store.commissionRate : 10;
          totalPlatformRevenue += (item.subtotal * commRate) / 100;
        }
      }
    }

    const pendingKycCount = stores.filter(s => s.kycStatus === 'PENDING').length;
    const pendingPayouts = (await db.getAllPayouts()).filter(p => p.status === 'PENDING');

    return res.json({
      success: true,
      analytics: {
        totalGmv: Math.round(totalGmv),
        totalPlatformRevenue: Math.round(totalPlatformRevenue),
        totalOrders: orders.length,
        totalOrdersPaid,
        totalSellers: stores.length,
        activeSellers: stores.filter(s => s.status === 'ACTIVE').length,
        pendingKycCount,
        totalCustomers: users.filter(u => u.role === 'CUSTOMER').length,
        totalProducts: products.length,
        pendingPayoutsCount: pendingPayouts.length,
        pendingPayoutsAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0)
      },
      recentOrders: orders.slice(0, 10),
      topStores: stores.sort((a, b) => b.totalEarnings - a.totalEarnings).slice(0, 5)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSellers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kycStatus, status } = req.query;
    let stores = await db.getAllStores();

    if (kycStatus) {
      stores = stores.filter(s => s.kycStatus === kycStatus);
    }
    if (status) {
      stores = stores.filter(s => s.status === status);
    }

    return res.json({ success: true, count: stores.length, stores });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const reviewSellerKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes, commissionRate } = req.body; // 'APPROVE' or 'REJECT'

    const store = await db.findStoreById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (action === 'APPROVE') {
      store.kycStatus = 'APPROVED';
      store.status = 'ACTIVE';
      if (commissionRate !== undefined) {
        store.commissionRate = parseFloat(commissionRate);
      }
    } else if (action === 'REJECT') {
      store.kycStatus = 'REJECTED';
      store.status = 'SUSPENDED';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    store.kycNotes = notes || '';
    store.updatedAt = new Date().toISOString();
    await db.updateStore(id, store);

    // Notify seller
    await db.createNotification({
      id: `notif-${uuidv4().substring(0, 8)}`,
      userId: store.userId,
      title: action === 'APPROVE' ? 'Seller KYC Approved!' : 'Seller KYC Rejected',
      message:
        action === 'APPROVE'
          ? `Congratulations! Your store "${store.name}" has been approved. You can now publish products.`
          : `Your KYC submission was rejected: ${notes || 'Please verify your business documents.'}`,
      type: 'KYC',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: `Seller KYC ${action}D successfully`, store });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStoreCommission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ success: false, message: 'Commission rate must be between 0 and 100%' });
    }

    const updated = await db.updateStore(id, { commissionRate: rate });
    return res.json({ success: true, message: 'Commission rate updated', store: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllPayouts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payouts = await db.getAllPayouts();
    return res.json({ success: true, payouts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const processPayout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, transactionRef, notes } = req.body; // 'PROCESS' or 'REJECT'

    const status = action === 'PROCESS' ? 'PROCESSED' : 'REJECTED';
    const updated = await db.updatePayoutStatus(id, status, transactionRef);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    // Notify store owner
    const store = await db.findStoreById(updated.storeId);
    if (store) {
      await db.createNotification({
        id: `notif-${uuidv4().substring(0, 8)}`,
        userId: store.userId,
        title: action === 'PROCESS' ? 'Payout Disbursed' : 'Payout Request Rejected',
        message:
          action === 'PROCESS'
            ? `Payout of ₹${updated.amount.toLocaleString()} was processed to your bank account. Ref: ${transactionRef}`
            : `Payout request for ₹${updated.amount.toLocaleString()} was rejected: ${notes || ''}`,
        type: 'PAYOUT',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: `Payout marked as ${status}`, payout: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await db.getAllUsers();
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllCoupons = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coupons = await db.getAllCoupons();
    return res.json({ success: true, coupons });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCoupon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, expiresAt } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'Code, discount type, and discount value required' });
    }

    const newCoupon: Coupon = {
      id: `cpn-${uuidv4().substring(0, 8)}`,
      code: code.toUpperCase().trim(),
      description: description || '',
      discountType,
      discountValue: parseFloat(discountValue),
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      isActive: true,
      usageCount: 0
    };

    const saved = await db.createCoupon(newCoupon);
    return res.status(201).json({ success: true, coupon: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
