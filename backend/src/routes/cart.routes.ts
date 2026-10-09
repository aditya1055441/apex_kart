import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon
} from '../controllers/cart.controller';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.use(optionalAuthenticate);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:id', updateCartItem);
router.delete('/:id', removeCartItem);
router.delete('/', clearCart);
router.post('/apply-coupon', applyCoupon);

export default router;
