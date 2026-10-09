import { Router } from 'express';
import { getProductReviews, addReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/products/:productId', getProductReviews);
router.post('/products/:productId', authenticate, addReview);

export default router;
