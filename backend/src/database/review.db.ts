import { Review } from '../types';
import { dbConnection } from './connection';

export const mapRowToReview = (r: any): Review => ({
  id: r.id,
  productId: r.product_id,
  customerId: r.customer_id,
  customerName: r.customer_name,
  rating: parseInt(r.rating, 10),
  title: r.title,
  comment: r.comment,
  verifiedPurchase: r.verified_purchase,
  status: r.status,
  createdAt: r.created_at
});

export class ReviewDatabase {
  public async getProductReviews(productId: string): Promise<Review[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query("SELECT * FROM reviews WHERE product_id = $1 AND status = 'APPROVED' ORDER BY created_at DESC;", [productId]);
    return res.rows.map(mapRowToReview);
  }

  public async addReview(review: Review): Promise<Review> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('submitting a product review');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO reviews (id, product_id, customer_id, customer_name, rating, title, comment, verified_purchase, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING;`,
      [review.id, review.productId, review.customerId, review.customerName, review.rating, review.title, review.comment, review.verifiedPurchase, review.status, review.createdAt]
    );

    // Recalculate product rating
    const avgRes = await pool.query(
      "SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE product_id = $1 AND status = 'APPROVED';",
      [review.productId]
    );
    if (avgRes.rows.length > 0) {
      const count = parseInt(avgRes.rows[0].count, 10);
      const avg = parseFloat(avgRes.rows[0].avg_rating) || 5.0;
      await pool.query('UPDATE products SET rating = $1, num_reviews = $2 WHERE id = $3;', [parseFloat(avg.toFixed(1)), count, review.productId]);
    }

    return review;
  }
}

export const reviewDb = new ReviewDatabase();
