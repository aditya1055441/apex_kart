import { Router } from 'express';
import {
  getPlatformAnalytics,
  getSellers,
  reviewSellerKyc,
  updateStoreCommission,
  getAllPayouts,
  processPayout,
  getAllUsers,
  getAllCoupons,
  createCoupon
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/analytics', getPlatformAnalytics);
router.get('/sellers', getSellers);
router.put('/sellers/:id/kyc', reviewSellerKyc);
router.put('/sellers/:id/commission', updateStoreCommission);
router.get('/payouts', getAllPayouts);
router.put('/payouts/:id/process', processPayout);
router.get('/users', getAllUsers);
router.get('/coupons', getAllCoupons);
router.post('/coupons', createCoupon);

export default router;
