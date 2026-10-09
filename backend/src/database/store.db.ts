import { Store } from '../types';
import { dbConnection } from './connection';

export const mapRowToStore = (r: any): Store => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  logo: r.logo,
  banner: r.banner,
  gstin: r.gstin,
  pan: r.pan,
  bankAccount: typeof r.bank_account === 'string' ? JSON.parse(r.bank_account) : (r.bank_account || {}),
  kycDocuments: typeof r.kyc_documents === 'string' ? JSON.parse(r.kyc_documents) : (r.kyc_documents || {}),
  kycStatus: r.kyc_status,
  kycNotes: r.kyc_notes,
  status: r.status,
  commissionRate: parseFloat(r.commission_rate) || 10.0,
  balance: parseFloat(r.balance) || 0,
  totalEarnings: parseFloat(r.total_earnings) || 0,
  rating: parseFloat(r.rating) || 5.0,
  totalReviews: parseInt(r.total_reviews, 10) || 0,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export class StoreDatabase {
  public async findStoreById(id: string): Promise<Store | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM stores WHERE id = $1;', [id]);
    return res.rows.length > 0 ? mapRowToStore(res.rows[0]) : undefined;
  }

  public async findStoreByUserId(userId: string): Promise<Store | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM stores WHERE user_id = $1;', [userId]);
    return res.rows.length > 0 ? mapRowToStore(res.rows[0]) : undefined;
  }

  public async getAllStores(): Promise<Store[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM stores ORDER BY created_at DESC;');
    return res.rows.map(mapRowToStore);
  }

  public async createStore(store: Store): Promise<Store> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('store registration');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO stores (id, user_id, name, slug, description, logo, banner, gstin, pan, bank_account, kyc_documents, kyc_status, status, commission_rate, balance, total_earnings, rating, total_reviews, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (id) DO NOTHING;`,
      [
        store.id, store.userId, store.name, store.slug, store.description, store.logo, store.banner, store.gstin, store.pan,
        JSON.stringify(store.bankAccount), JSON.stringify(store.kycDocuments), store.kycStatus, store.status,
        store.commissionRate, store.balance, store.totalEarnings, store.rating, store.totalReviews, store.createdAt, store.updatedAt
      ]
    );
    return store;
  }

  public async updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating store');
    const pool = dbConnection.getPool()!;

    const existing = await this.findStoreById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    await pool.query(
      `UPDATE stores SET name = $1, description = $2, logo = $3, banner = $4, gstin = $5, pan = $6,
       bank_account = $7, kyc_status = $8, status = $9, commission_rate = $10, balance = $11,
       total_earnings = $12, rating = $13, total_reviews = $14, updated_at = $15 WHERE id = $16;`,
      [
        updated.name, updated.description, updated.logo, updated.banner, updated.gstin, updated.pan,
        JSON.stringify(updated.bankAccount), updated.kycStatus, updated.status, updated.commissionRate,
        updated.balance, updated.totalEarnings, updated.rating, updated.totalReviews, updated.updatedAt, id
      ]
    );
    return updated;
  }
}

export const storeDb = new StoreDatabase();
