import { Payout } from '../types';
import { dbConnection } from './connection';

export const mapRowToPayout = (p: any): Payout => ({
  id: p.id,
  storeId: p.store_id,
  storeName: p.store_name,
  amount: parseFloat(p.amount),
  commissionDeducted: parseFloat(p.commission_deducted) || 0,
  netPayout: parseFloat(p.net_payout),
  status: p.status,
  bankAccount: typeof p.bank_account === 'string' ? JSON.parse(p.bank_account) : (p.bank_account || {}),
  transactionRef: p.transaction_ref,
  requestedAt: p.requested_at,
  processedAt: p.processed_at,
  notes: p.notes
});

export class PayoutDatabase {
  public async createPayout(payout: Payout): Promise<Payout> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('requesting payout withdrawal');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO payouts (id, store_id, store_name, amount, commission_deducted, net_payout, status, bank_account, transaction_ref, requested_at, processed_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
      [payout.id, payout.storeId, payout.storeName, payout.amount, payout.commissionDeducted, payout.netPayout, payout.status, JSON.stringify(payout.bankAccount), payout.transactionRef || null, payout.requestedAt, payout.processedAt || null, payout.notes || null]
    );
    return payout;
  }

  public async getStorePayouts(storeId: string): Promise<Payout[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM payouts WHERE store_id = $1 ORDER BY requested_at DESC;', [storeId]);
    return res.rows.map(mapRowToPayout);
  }

  public async getAllPayouts(): Promise<Payout[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM payouts ORDER BY requested_at DESC;');
    return res.rows.map(mapRowToPayout);
  }

  public async updatePayoutStatus(
    id: string,
    status: Payout['status'],
    transactionRef?: string
  ): Promise<Payout | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('processing payout');
    const pool = dbConnection.getPool()!;

    const processedAt = status === 'PROCESSED' ? new Date().toISOString() : null;

    await pool.query(
      'UPDATE payouts SET status = $1, transaction_ref = COALESCE($2, transaction_ref), processed_at = COALESCE($3, processed_at) WHERE id = $4;',
      [status, transactionRef || null, processedAt, id]
    );

    const res = await pool.query('SELECT * FROM payouts WHERE id = $1;', [id]);
    if (res.rows.length === 0) return undefined;
    const p = mapRowToPayout(res.rows[0]);

    if (status === 'PROCESSED') {
      await pool.query('UPDATE stores SET balance = GREATEST(0, balance - $1) WHERE id = $2;', [p.amount, p.storeId]);
    }

    return p;
  }
}

export const payoutDb = new PayoutDatabase();
