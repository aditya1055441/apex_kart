import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { Store, Payout } from '../types';

export const registerStore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const existingStore = await db.findStoreByUserId(userId);
    if (existingStore) {
      return res.status(400).json({ success: false, message: 'A store already exists for this account' });
    }

    const {
      name,
      description,
      gstin,
      pan,
      bankAccount,
      kycDocuments,
      logo,
      banner
    } = req.body;

    if (!name || !gstin || !pan || !bankAccount || !bankAccount.accountNumber || !bankAccount.ifsc) {
      return res.status(400).json({
        success: false,
        message: 'Store name, GSTIN, PAN, and complete Bank Account details are mandatory for seller registration'
      });
    }

    const storeId = `store-${uuidv4().substring(0, 8)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const newStore: Store = {
      id: storeId,
      userId,
      name,
      slug,
      description: description || '',
      logo: logo || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200',
      banner: banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      gstin,
      pan,
      bankAccount: {
        accountName: bankAccount.accountName || name,
        accountNumber: bankAccount.accountNumber,
        ifsc: bankAccount.ifsc,
        bankName: bankAccount.bankName || 'Bank'
      },
      kycDocuments: kycDocuments || {},
      kycStatus: 'PENDING',
      status: 'PENDING_REVIEW',
      commissionRate: 10.0,
      balance: 0,
      totalEarnings: 0,
      rating: 5.0,
      totalReviews: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedStore = await db.createStore(newStore);
    await db.updateUser(userId, { storeId, role: 'SELLER' });

    // Notify admins of new seller KYC
    const admins = Array.from(db.users.values()).filter(u => u.role === 'ADMIN');
    for (const admin of admins) {
      await db.createNotification({
        id: `notif-${uuidv4().substring(0, 8)}`,
        userId: admin.id,
        title: 'New Seller KYC Application',
        message: `Store "${name}" has submitted KYC verification documents for review.`,
        type: 'KYC',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Store registered successfully and KYC submitted for admin approval',
      store: savedStore
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyStore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const store = req.user?.storeId ? await db.findStoreById(req.user.storeId) : await db.findStoreByUserId(req.user!.id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    return res.json({ success: true, store });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStoreProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user!.storeId) {
      return res.status(403).json({ success: false, message: 'Store not found for this account' });
    }

    const { name, description, logo, banner, bankAccount, gstin, pan } = req.body;
    const updated = await db.updateStore(req.user!.storeId, {
      name,
      description,
      logo,
      banner,
      bankAccount,
      gstin,
      pan
    });

    return res.json({ success: true, message: 'Store profile updated', store: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'Not a seller account' });
    }

    const store = await db.findStoreById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const storeOrders = await db.getOrdersForStore(storeId);
    const storeProducts = await db.getProducts({ storeId, status: undefined });

    let pendingShipments = 0;
    let deliveredItems = 0;
    let returnRequests = 0;
    let totalItemsSold = 0;

    for (const { items } of storeOrders) {
      for (const item of items) {
        if (item.status === 'PENDING' || item.status === 'PROCESSING') pendingShipments += 1;
        if (item.status === 'DELIVERED') deliveredItems += 1;
        if (item.status === 'RETURN_REQUESTED') returnRequests += 1;
        totalItemsSold += item.quantity;
      }
    }

    return res.json({
      success: true,
      stats: {
        storeName: store.name,
        kycStatus: store.kycStatus,
        status: store.status,
        balance: store.balance,
        totalEarnings: store.totalEarnings,
        commissionRate: store.commissionRate,
        totalProducts: storeProducts.length,
        totalOrders: storeOrders.length,
        pendingShipments,
        deliveredItems,
        returnRequests,
        totalItemsSold,
        rating: store.rating,
        totalReviews: store.totalReviews
      },
      recentOrders: storeOrders.slice(0, 5)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getSellerOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'No store associated with account' });
    }

    const orders = await db.getOrdersForStore(storeId);
    return res.json({ success: true, orders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFulfillmentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const { orderId, itemId } = req.params;
    const { status, trackingNumber, courierName } = req.body;

    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item || item.storeId !== storeId) {
      return res.status(403).json({ success: false, message: 'Item does not belong to your store' });
    }

    const updated = await db.updateOrderItemStatus(orderId, itemId, status, {
      trackingNumber,
      courierName
    });

    // Notify customer
    await db.createNotification({
      id: `notif-${uuidv4().substring(0, 8)}`,
      userId: order.customerId,
      title: `Item ${status.toLowerCase()}`,
      message: `Your item "${item.productTitle}" is now ${status.toLowerCase()}.${trackingNumber ? ' Tracking #: ' + trackingNumber : ''}`,
      type: 'ORDER',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: `Status updated to ${status}`, item: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestPayout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'Not a seller account' });
    }

    const store = await db.findStoreById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const { amount } = req.body;
    const requestedAmount = parseFloat(amount);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payout amount required' });
    }

    if (requestedAmount > store.balance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount (₹${requestedAmount}) exceeds available balance (₹${store.balance})`
      });
    }

    const newPayout: Payout = {
      id: `po-${uuidv4().substring(0, 8)}`,
      storeId: store.id,
      storeName: store.name,
      amount: requestedAmount,
      commissionDeducted: 0,
      netPayout: requestedAmount,
      status: 'PENDING',
      bankAccount: store.bankAccount,
      requestedAt: new Date().toISOString()
    };

    const saved = await db.createPayout(newPayout);
    return res.status(201).json({
      success: true,
      message: 'Payout request submitted successfully and is pending admin disbursement',
      payout: saved
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPayoutHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'Not a seller account' });
    }

    const payouts = await db.getStorePayouts(storeId);
    return res.json({ success: true, payouts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
