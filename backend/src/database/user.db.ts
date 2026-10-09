import { User, Address } from '../types';
import { dbConnection } from './connection';

export const mapRowToUser = (r: any): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  dob: r.dob,
  passwordHash: r.password_hash,
  role: r.role,
  storeId: r.store_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export const mapRowToAddress = (r: any): Address => ({
  id: r.id,
  userId: r.user_id,
  fullName: r.full_name,
  phone: r.phone,
  addressLine1: r.address_line1,
  addressLine2: r.address_line2,
  city: r.city,
  state: r.state,
  postalCode: r.postal_code,
  country: r.country,
  isDefault: r.is_default
});

export class UserDatabase {
  public async findUserByEmail(email: string): Promise<User | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1);', [email]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : undefined;
  }

  public async findUserById(id: string): Promise<User | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM users WHERE id = $1;', [id]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : undefined;
  }

  public async findUserByPhone(phone: string): Promise<User | undefined> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return undefined;

    const res = await pool.query('SELECT * FROM users WHERE phone = $1;', [phone]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : undefined;
  }

  public async createUser(user: User): Promise<User> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('user registration');
    const pool = dbConnection.getPool()!;

    await pool.query(
      `INSERT INTO users (id, name, email, phone, dob, password_hash, role, store_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         dob = EXCLUDED.dob,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         store_id = EXCLUDED.store_id,
         updated_at = EXCLUDED.updated_at;`,
      [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.dob || null,
        user.passwordHash,
        user.role,
        user.storeId || null,
        user.createdAt,
        user.updatedAt
      ]
    );
    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('updating user');
    const pool = dbConnection.getPool()!;

    const existing = await this.findUserById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    await pool.query(
      `UPDATE users SET name = $1, email = $2, phone = $3, dob = $4, role = $5, store_id = $6, updated_at = $7 WHERE id = $8;`,
      [updated.name, updated.email, updated.phone, updated.dob || null, updated.role, updated.storeId || null, updated.updatedAt, id]
    );
    return updated;
  }

  public async getAllUsers(): Promise<User[]> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('listing users');
    const pool = dbConnection.getPool()!;

    const res = await pool.query('SELECT * FROM users ORDER BY created_at DESC;');
    return res.rows.map(mapRowToUser);
  }

  public async getUserAddresses(userId: string): Promise<Address[]> {
    await dbConnection.ensureReady();
    const pool = dbConnection.getPool();
    if (!pool || !dbConnection.isConnected()) return [];

    const res = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC;', [userId]);
    return res.rows.map(mapRowToAddress);
  }

  public async createAddress(address: Address): Promise<Address> {
    await dbConnection.ensureReady();
    dbConnection.assertConnected('saving shipping address');
    const pool = dbConnection.getPool()!;

    if (address.isDefault) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1;', [address.userId]);
    }
    await pool.query(
      `INSERT INTO addresses (id, user_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [address.id, address.userId, address.fullName, address.phone, address.addressLine1, address.addressLine2 || null, address.city, address.state, address.postalCode, address.country, address.isDefault]
    );
    return address;
  }
}

export const userDb = new UserDatabase();
