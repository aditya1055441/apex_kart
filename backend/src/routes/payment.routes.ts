import { Router } from 'express';
import { getRazorpayConfig, verifyPayment, handleRazorpayWebhook, retryOrderPayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/config', getRazorpayConfig);
router.post('/verify', authenticate, verifyPayment);
router.post('/orders/:orderId/retry', authenticate, retryOrderPayment);
router.post('/webhook', handleRazorpayWebhook);

export default router;
