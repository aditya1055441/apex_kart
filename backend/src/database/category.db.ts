import { Category, Brand } from '../types';
import { seedCategories, seedBrands } from './seed';
import { dbConnection } from './connection';

export const mapRowToCategory = (r: any): Category => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  image: r.image,
  parentId: r.parent_id,
  isActive: r.is_active,
  commissionRate: parseFloat(r.commission_rate) || 10.0
});

export class CategoryDatabase {
  public async getAllCategories(): Promise<Category[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (pool && dbConnection.isConnected()) {
      const res = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY name ASC;');
      return res.rows.map(mapRowToCategory);
    }
    // Fallback: return seed categories if database is not connected
    return seedCategories.filter(c => c.isActive);
  }

  public async getCategoryById(id: string): Promise<Category | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (pool && dbConnection.isConnected()) {
      const res = await pool.query('SELECT * FROM categories WHERE id = $1;', [id]);
      return res.rows.length > 0 ? mapRowToCategory(res.rows[0]) : undefined;
    }
    return seedCategories.find(c => c.id === id);
  }

  public async createCategory(cat: Category): Promise<Category> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('creating category');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO categories (id, name, slug, description, image, is_active, commission_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING;`,
      [cat.id, cat.name, cat.slug, cat.description, cat.image, cat.isActive, cat.commissionRate || 10.0]
    );
    return cat;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating category');
    const pool = dbConnection.getPool()!;

    const existing = await this.getCategoryById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };

    await pool.query(
      `UPDATE categories SET name = $1, description = $2, image = $3, is_active = $4, commission_rate = $5 WHERE id = $6;`,
      [updated.name, updated.description, updated.image, updated.isActive, updated.commissionRate, id]
    );
    return updated;
  }

  public async getAllBrands(): Promise<Brand[]> {
    await dbConnection.ensureReady();
    return seedBrands.filter(b => b.isActive);
  }
}

export const categoryDb = new CategoryDatabase();
