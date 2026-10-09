import { Product, ProductVariant } from '../types';
import { seedProducts } from './seed';
import { dbConnection } from './connection';

export const mapRowToVariant = (v: any): ProductVariant => ({
  id: v.id,
  productId: v.product_id,
  title: v.title,
  sku: v.sku,
  price: parseFloat(v.price),
  stock: parseInt(v.stock, 10),
  attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {}),
  image: v.image
});

export const mapRowToProduct = (p: any, variants: ProductVariant[] = []): Product => ({
  id: p.id,
  storeId: p.store_id,
  storeName: p.store_name,
  categoryId: p.category_id,
  categoryName: p.category_name,
  brand: p.brand,
  title: p.title,
  slug: p.slug,
  description: p.description,
  shortDescription: p.short_description,
  basePrice: parseFloat(p.base_price),
  salePrice: parseFloat(p.sale_price),
  stock: parseInt(p.stock, 10),
  images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
  status: p.status,
  rating: parseFloat(p.rating) || 5.0,
  numReviews: parseInt(p.num_reviews, 10) || 0,
  isFeatured: p.is_featured,
  tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
  attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes) : (p.attributes || []),
  variants,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export class ProductDatabase {
  public async getProducts(filters?: {
    search?: string;
    categoryId?: string;
    brand?: string;
    storeId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    isFeatured?: boolean;
    status?: string;
  }): Promise<Product[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    // 1. If PostgreSQL is connected, query on-demand directly from the database
    if (pool && dbConnection.isConnected()) {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (filters?.status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(filters.status);
      } else {
        conditions.push(`status = 'ACTIVE'`);
      }

      if (filters?.storeId) {
        conditions.push(`store_id = $${paramIdx++}`);
        params.push(filters.storeId);
      }

      if (filters?.categoryId) {
        conditions.push(`category_id = $${paramIdx++}`);
        params.push(filters.categoryId);
      }

      if (filters?.brand) {
        conditions.push(`LOWER(brand) = LOWER($${paramIdx++})`);
        params.push(filters.brand);
      }

      if (filters?.isFeatured !== undefined) {
        conditions.push(`is_featured = $${paramIdx++}`);
        params.push(filters.isFeatured);
      }

      if (filters?.minPrice !== undefined) {
        conditions.push(`sale_price >= $${paramIdx++}`);
        params.push(filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        conditions.push(`sale_price <= $${paramIdx++}`);
        params.push(filters.maxPrice);
      }

      if (filters?.search) {
        conditions.push(`(LOWER(title) LIKE $${paramIdx} OR LOWER(description) LIKE $${paramIdx} OR LOWER(category_name) LIKE $${paramIdx})`);
        params.push(`%${filters.search.toLowerCase()}%`);
        paramIdx++;
      }

      let orderBy = 'ORDER BY created_at DESC';
      if (filters?.sortBy === 'price_asc') {
        orderBy = 'ORDER BY sale_price ASC';
      } else if (filters?.sortBy === 'price_desc') {
        orderBy = 'ORDER BY sale_price DESC';
      } else if (filters?.sortBy === 'rating') {
        orderBy = 'ORDER BY rating DESC';
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM products ${whereClause} ${orderBy};`;

      const prodRes = await pool.query(query, params);
      if (prodRes.rows.length === 0) return [];

      const productIds = prodRes.rows.map((r: any) => r.id);
      const variantsRes = await pool.query(`SELECT * FROM product_variants WHERE product_id = ANY($1);`, [productIds]);

      const variantsMap = new Map<string, ProductVariant[]>();
      variantsRes.rows.forEach((v: any) => {
        const list = variantsMap.get(v.product_id) || [];
        list.push(mapRowToVariant(v));
        variantsMap.set(v.product_id, list);
      });

      return prodRes.rows.map((r: any) => mapRowToProduct(r, variantsMap.get(r.id) || []));
    }

    // 2. If PostgreSQL is NOT connected, filter only from seed dummy products in memory
    let result = seedProducts.map(p => ({ ...p, variants: p.variants.map(v => ({ ...v })) }));

    if (filters?.status) {
      result = result.filter(p => p.status === filters.status);
    } else {
      result = result.filter(p => p.status === 'ACTIVE');
    }

    if (filters?.storeId) {
      result = result.filter(p => p.storeId === filters.storeId);
    }

    if (filters?.categoryId) {
      result = result.filter(p => p.categoryId === filters.categoryId);
    }

    if (filters?.brand) {
      result = result.filter(p => p.brand?.toLowerCase() === filters.brand?.toLowerCase());
    }

    if (filters?.isFeatured !== undefined) {
      result = result.filter(p => p.isFeatured === filters.isFeatured);
    }

    if (filters?.minPrice !== undefined) {
      result = result.filter(p => p.salePrice >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      result = result.filter(p => p.salePrice <= filters.maxPrice!);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q)) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    if (filters?.sortBy === 'price_asc') {
      result.sort((a, b) => a.salePrice - b.salePrice);
    } else if (filters?.sortBy === 'price_desc') {
      result.sort((a, b) => b.salePrice - a.salePrice);
    } else if (filters?.sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  public async getProductById(idOrSlug: string): Promise<Product | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();

    if (pool && dbConnection.isConnected()) {
      const res = await pool.query('SELECT * FROM products WHERE id = $1 OR slug = $1;', [idOrSlug]);
      if (res.rows.length === 0) return undefined;

      const productRow = res.rows[0];
      const variantsRes = await pool.query('SELECT * FROM product_variants WHERE product_id = $1;', [productRow.id]);
      const variants = variantsRes.rows.map(mapRowToVariant);

      return mapRowToProduct(productRow, variants);
    }

    return seedProducts.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  }

  public async createProduct(product: Product): Promise<Product> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('adding product');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO products (id, store_id, store_name, category_id, category_name, brand, title, slug, description, short_description, base_price, sale_price, stock, images, status, rating, num_reviews, is_featured, tags, attributes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       ON CONFLICT (id) DO NOTHING;`,
      [
        product.id, product.storeId, product.storeName, product.categoryId, product.categoryName, product.brand || '', product.title, product.slug,
        product.description, product.shortDescription, product.basePrice, product.salePrice, product.stock, JSON.stringify(product.images),
        product.status, product.rating, product.numReviews, product.isFeatured, JSON.stringify(product.tags), JSON.stringify(product.attributes),
        product.createdAt, product.updatedAt
      ]
    );

    for (const v of product.variants) {
      await pool.query(
        `INSERT INTO product_variants (id, product_id, title, sku, price, stock, attributes, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        [v.id, v.productId, v.title, v.sku, v.price, v.stock, JSON.stringify(v.attributes), v.image || null]
      );
    }
    return product;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating product');
    const pool = dbConnection.getPool()!;

    const existing = await this.getProductById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    await pool.query(
      `UPDATE products SET title = $1, description = $2, short_description = $3, base_price = $4,
       sale_price = $5, stock = $6, status = $7, is_featured = $8, updated_at = $9 WHERE id = $10;`,
      [
        updated.title, updated.description, updated.shortDescription, updated.basePrice,
        updated.salePrice, updated.stock, updated.status, updated.isFeatured, updated.updatedAt, id
      ]
    );
    return updated;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('deleting product');
    const pool = dbConnection.getPool()!;

    await pool.query('DELETE FROM products WHERE id = $1;', [id]);
    return true;
  }
}

export const productDb = new ProductDatabase();
