import { Router } from 'express';
import {
  registerStore,
  getMyStore,
  updateStoreProfile,
  getDashboardStats,
  getSellerOrders,
  updateFulfillmentStatus,
  requestPayout,
  getPayoutHistory
} from '../controllers/seller.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Registration allows any authenticated user (Customer -> Seller)
router.post('/register', registerStore);
router.get('/store', getMyStore);

// Seller dashboard & order routes
router.get('/dashboard', authorize('SELLER', 'ADMIN'), getDashboardStats);
router.put('/profile', authorize('SELLER', 'ADMIN'), updateStoreProfile);
router.get('/orders', authorize('SELLER', 'ADMIN'), getSellerOrders);
router.put('/orders/:orderId/items/:itemId/status', authorize('SELLER', 'ADMIN'), updateFulfillmentStatus);
router.post('/payouts', authorize('SELLER', 'ADMIN'), requestPayout);
router.get('/payouts', authorize('SELLER', 'ADMIN'), getPayoutHistory);

export default router;
