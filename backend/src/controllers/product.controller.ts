import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { Product } from '../types';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      brand,
      storeId,
      minPrice,
      maxPrice,
      sortBy,
      featured,
      page = 1,
      limit = 20
    } = req.query;

    const products = await db.getProducts({
      search: search as string,
      categoryId: category as string,
      brand: brand as string,
      storeId: storeId as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      sortBy: sortBy as string,
      isFeatured: featured !== undefined ? featured === 'true' : undefined
    });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = products.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      total: products.length,
      page: pageNum,
      totalPages: Math.ceil(products.length / limitNum),
      products: paginated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const reviews = await db.getProductReviews(product.id);
    const store = await db.findStoreById(product.storeId);

    return res.json({
      success: true,
      product,
      reviews,
      store: store
        ? {
            id: store.id,
            name: store.name,
            rating: store.rating,
            totalReviews: store.totalReviews
          }
        : undefined
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!user.storeId) {
      return res.status(403).json({ success: false, message: 'No seller store found for this account' });
    }

    const store = await db.findStoreById(user.storeId);
    if (!store || store.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Seller KYC must be verified and approved before creating products'
      });
    }

    const {
      title,
      description,
      shortDescription,
      categoryId,
      brand,
      basePrice,
      salePrice,
      stock,
      images,
      attributes,
      variants,
      tags
    } = req.body;

    if (!title || !categoryId || !basePrice || !salePrice) {
      return res.status(400).json({ success: false, message: 'Title, category, and pricing are required' });
    }

    const category = await db.getCategoryById(categoryId);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    const productId = `prod-${uuidv4().substring(0, 8)}`;

    const newProduct: Product = {
      id: productId,
      storeId: store.id,
      storeName: store.name,
      categoryId,
      categoryName: category?.name || 'General',
      brand: brand || 'Generic',
      title,
      slug,
      description: description || title,
      shortDescription: shortDescription || description?.substring(0, 120) || title,
      basePrice: parseFloat(basePrice),
      salePrice: parseFloat(salePrice),
      stock: parseInt(stock || '0', 10),
      images: Array.isArray(images) && images.length ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
      status: 'ACTIVE',
      rating: 5.0,
      numReviews: 0,
      isFeatured: false,
      tags: Array.isArray(tags) ? tags : [],
      attributes: Array.isArray(attributes) ? attributes : [],
      variants: Array.isArray(variants)
        ? variants.map((v: any) => ({
            id: `var-${uuidv4().substring(0, 8)}`,
            productId,
            title: v.title,
            sku: v.sku || `${title.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
            price: parseFloat(v.price || salePrice),
            stock: parseInt(v.stock || stock, 10),
            attributes: v.attributes || {}
          }))
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.createProduct(newProduct);
    return res.status(201).json({ success: true, product: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Authorization: seller owner or ADMIN
    if (req.user!.role !== 'ADMIN' && product.storeId !== req.user!.storeId) {
      return res.status(403).json({ success: false, message: 'Permission denied: Cannot modify another vendor product' });
    }

    const updated = await db.updateProduct(id, req.body);
    return res.json({ success: true, product: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (req.user!.role !== 'ADMIN' && product.storeId !== req.user!.storeId) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await db.deleteProduct(id);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
