import { Coupon } from '../types';
import { dbConnection } from './connection';

export const mapRowToCoupon = (c: any): Coupon => ({
  id: c.id,
  code: c.code,
  description: c.description,
  discountType: c.discount_type,
  discountValue: parseFloat(c.discount_value),
  minOrderAmount: parseFloat(c.min_order_amount),
  maxDiscount: c.max_discount ? parseFloat(c.max_discount) : undefined,
  expiresAt: c.expires_at,
  isActive: c.is_active,
  usageCount: parseInt(c.usage_count, 10) || 0
});

export class CouponDatabase {
  public async getCouponByCode(code: string): Promise<Coupon | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true;', [code]);
    if (res.rows.length === 0) return undefined;
    const coupon = mapRowToCoupon(res.rows[0]);
    if (new Date(coupon.expiresAt) < new Date()) return undefined;
    return coupon;
  }

  public async incrementCouponUsage(code: string): Promise<void> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (pool && dbConnection.isConnected()) {
      await pool.query('UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = UPPER($1);', [code]);
    }
  }

  public async getAllCoupons(): Promise<Coupon[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM coupons ORDER BY code ASC;');
    return res.rows.map(mapRowToCoupon);
  }

  public async createCoupon(coupon: Coupon): Promise<Coupon> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('creating promotional coupon');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, expires_at, is_active, usage_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING;`,
      [coupon.id, coupon.code, coupon.description, coupon.discountType, coupon.discountValue, coupon.minOrderAmount, coupon.maxDiscount || null, coupon.expiresAt, coupon.isActive, coupon.usageCount]
    );
    return coupon;
  }
}

export const couponDb = new CouponDatabase();
