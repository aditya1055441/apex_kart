import { Router } from 'express';
import { getCategories, getBrands, createCategory } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getCategories);
router.get('/brands', getBrands);
router.post('/', authenticate, authorize('ADMIN'), createCategory);

export default router;
