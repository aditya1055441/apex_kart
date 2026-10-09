import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { Category } from '../types';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await db.getAllCategories();
    return res.json({ success: true, categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const brands = await db.getAllBrands();
    return res.json({ success: true, brands });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, image, parentId, commissionRate } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const newCategory: Category = {
      id: `cat-${uuidv4().substring(0, 8)}`,
      name,
      slug,
      description: description || '',
      image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
      parentId: parentId || null,
      isActive: true,
      commissionRate: commissionRate ? parseFloat(commissionRate) : 10.0
    };

    const saved = await db.createCategory(newCategory);
    return res.status(201).json({ success: true, category: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
