import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  requestItemReturn,
  getShipmentTracking
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public Shipment Tracking by tracking number/id
router.get('/tracking', getShipmentTracking);

// Protected Customer/Seller/Admin Order endpoints
router.use(authenticate);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.post('/:orderId/items/:itemId/return', requestItemReturn);

export default router;
