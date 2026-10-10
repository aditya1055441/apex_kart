import { Pool } from 'pg';
import { config } from '../config';
import {
  seedUsers,
  seedStores,
  seedCategories,
  seedProducts,
  seedCoupons,
  seedReviews
} from './seed';

class DatabaseConnection {
  private pool: Pool | null = null;
  private isPostgresConnected: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  public async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  public getPool(): Pool | null {
    return this.pool;
  }

  public isConnected(): boolean {
    return this.isPostgresConnected;
  }

  public assertConnected(operation: string): void {
    if (!this.isPostgresConnected || !this.pool) {
      throw new Error(`Database connection is mandatory for ${operation}. PostgreSQL is currently disconnected.`);
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isPostgresConnected = false;
    }
  }

  private async init(): Promise<void> {
    try {
      const isCloudDatabase =
        config.databaseUrl.includes('render.com') ||
        config.databaseUrl.includes('sslmode=require') ||
        (!config.databaseUrl.includes('localhost') &&
          !config.databaseUrl.includes('127.0.0.1') &&
          !config.databaseUrl.includes('@postgres:'));

      this.pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: isCloudDatabase ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000
      });

      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('[DB] PostgreSQL connected successfully (Cloud/SSL active:', isCloudDatabase, ')');

      // 1. Ensure all tables exist in PostgreSQL
      await this.ensureTablesExist(client);

      // 2. Check and seed initial data if empty
      await this.syncSeedsToPostgres(client);

      client.release();
    } catch (err: any) {
      this.isPostgresConnected = false;
      console.warn('[DB WARNING] PostgreSQL connection failed. Operating in fallback read-only mode:', err.message);
    }
  }

  private async ensureTablesExist(client: any): Promise<void> {
    try {
      console.log('[DB] Ensuring PostgreSQL tables and schema exist...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50) NOT NULL,
            dob VARCHAR(50),
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
            store_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stores (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            logo TEXT,
            banner TEXT,
            gstin VARCHAR(50),
            pan VARCHAR(50),
            bank_account JSONB NOT NULL DEFAULT '{}'::jsonb,
            kyc_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
            kyc_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            kyc_notes TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
            commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
            balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
            total_reviews INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            image TEXT,
            parent_id VARCHAR(255) REFERENCES categories(id) ON DELETE SET NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            commission_rate NUMERIC(5, 2) DEFAULT 10.00
        );

        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(255) PRIMARY KEY,
            store_id VARCHAR(255) NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
            store_name VARCHAR(255) NOT NULL,
            category_id VARCHAR(255) NOT NULL REFERENCES categories(id),
            category_name VARCHAR(255) NOT NULL,
            brand VARCHAR(100),
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            short_description TEXT,
            base_price NUMERIC(10, 2) NOT NULL,
            sale_price NUMERIC(10, 2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            images JSONB NOT NULL DEFAULT '[]'::jsonb,
            status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
            num_reviews INT NOT NULL DEFAULT 0,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS product_variants (
            id VARCHAR(255) PRIMARY KEY,
            product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            sku VARCHAR(100) UNIQUE NOT NULL,
            price NUMERIC(10, 2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
            image TEXT
        );

        CREATE TABLE IF NOT EXISTS addresses (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            address_line1 TEXT NOT NULL,
            address_line2 TEXT,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            postal_code VARCHAR(20) NOT NULL,
            country VARCHAR(100) NOT NULL DEFAULT 'India',
            is_default BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(255) PRIMARY KEY,
            order_number VARCHAR(100) UNIQUE NOT NULL,
            customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(50) NOT NULL,
            shipping_address JSONB NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            razorpay_order_id VARCHAR(100),
            razorpay_payment_id VARCHAR(100),
            subtotal NUMERIC(10, 2) NOT NULL,
            discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            coupon_code VARCHAR(50),
            tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            total_amount NUMERIC(10, 2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PLACED',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id VARCHAR(255) PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            store_id VARCHAR(255) NOT NULL REFERENCES stores(id),
            store_name VARCHAR(255) NOT NULL,
            product_id VARCHAR(255) NOT NULL REFERENCES products(id),
            variant_id VARCHAR(255) REFERENCES product_variants(id),
            product_title VARCHAR(255) NOT NULL,
            sku VARCHAR(100),
            price NUMERIC(10, 2) NOT NULL,
            quantity INT NOT NULL,
            image TEXT,
            subtotal NUMERIC(10, 2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            tracking_number VARCHAR(100),
            courier_name VARCHAR(100),
            return_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS coupons (
            id VARCHAR(255) PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            discount_type VARCHAR(20) NOT NULL,
            discount_value NUMERIC(10, 2) NOT NULL,
            min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            max_discount NUMERIC(10, 2),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            usage_count INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id VARCHAR(255) PRIMARY KEY,
            product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
            customer_name VARCHAR(255) NOT NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            title VARCHAR(255) NOT NULL,
            comment TEXT NOT NULL,
            verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
            status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payouts (
            id VARCHAR(255) PRIMARY KEY,
            store_id VARCHAR(255) NOT NULL REFERENCES stores(id),
            store_name VARCHAR(255) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            commission_deducted NUMERIC(12, 2) NOT NULL,
            net_payout NUMERIC(12, 2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            bank_account JSONB NOT NULL,
            transaction_ref VARCHAR(100),
            requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP WITH TIME ZONE,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS verification_otps (
            id VARCHAR(255) PRIMARY KEY,
            identifier VARCHAR(255) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            resend_count INT NOT NULL DEFAULT 1,
            last_resend_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_verification_otps_identifier ON verification_otps(identifier);
      `);
      console.log('[DB] Tables successfully verified in PostgreSQL.');
    } catch (e: any) {
      console.error('[DB ERROR] Error ensuring PostgreSQL tables:', e.message);
    }
  }

  private async syncSeedsToPostgres(client: any): Promise<void> {
    try {
      const prodCountRes = await client.query('SELECT COUNT(*) FROM products;');
      const prodCount = parseInt(prodCountRes.rows[0].count, 10);

      if (prodCount === 0) {
        console.log('[DB] No products found in PostgreSQL. Executing full seed dataset into PostgreSQL...');

        // 1. Seed Users
        for (const u of seedUsers) {
          await client.query(
            `INSERT INTO users (id, name, email, phone, dob, password_hash, role, store_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING;`,
            [u.id, u.name, u.email, u.phone, u.dob || null, u.passwordHash, u.role, u.storeId || null, u.createdAt, u.updatedAt]
          );
        }

        // 2. Seed Stores
        for (const s of seedStores) {
          await client.query(
            `INSERT INTO stores (id, user_id, name, slug, description, logo, banner, gstin, pan, bank_account, kyc_documents, kyc_status, status, commission_rate, balance, total_earnings, rating, total_reviews, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             ON CONFLICT (id) DO NOTHING;`,
            [
              s.id, s.userId, s.name, s.slug, s.description, s.logo, s.banner, s.gstin, s.pan,
              JSON.stringify(s.bankAccount), JSON.stringify(s.kycDocuments), s.kycStatus, s.status,
              s.commissionRate, s.balance, s.totalEarnings, s.rating, s.totalReviews, s.createdAt, s.updatedAt
            ]
          );
        }

        // 3. Seed Categories
        for (const c of seedCategories) {
          await client.query(
            `INSERT INTO categories (id, name, slug, description, image, is_active, commission_rate)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING;`,
            [c.id, c.name, c.slug, c.description, c.image, c.isActive, c.commissionRate || 10.0]
          );
        }

        // 4. Seed Products & Variants
        for (const p of seedProducts) {
          await client.query(
            `INSERT INTO products (id, store_id, store_name, category_id, category_name, brand, title, slug, description, short_description, base_price, sale_price, stock, images, status, rating, num_reviews, is_featured, tags, attributes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
             ON CONFLICT (id) DO NOTHING;`,
            [
              p.id, p.storeId, p.storeName, p.categoryId, p.categoryName, p.brand || '', p.title, p.slug,
              p.description, p.shortDescription, p.basePrice, p.salePrice, p.stock, JSON.stringify(p.images),
              p.status, p.rating, p.numReviews, p.isFeatured, JSON.stringify(p.tags), JSON.stringify(p.attributes),
              p.createdAt, p.updatedAt
            ]
          );

          for (const v of p.variants) {
            await client.query(
              `INSERT INTO product_variants (id, product_id, title, sku, price, stock, attributes, image)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING;`,
              [v.id, v.productId, v.title, v.sku, v.price, v.stock, JSON.stringify(v.attributes), v.image || null]
            );
          }
        }

        // 5. Seed Coupons
        for (const c of seedCoupons) {
          await client.query(
            `INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, expires_at, is_active, usage_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING;`,
            [c.id, c.code, c.description, c.discountType, c.discountValue, c.minOrderAmount, c.maxDiscount || null, c.expiresAt, c.isActive, c.usageCount]
          );
        }

        // 6. Seed Reviews
        for (const r of seedReviews) {
          await client.query(
            `INSERT INTO reviews (id, product_id, customer_id, customer_name, rating, title, comment, verified_purchase, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING;`,
            [r.id, r.productId, r.customerId, r.customerName, r.rating, r.title, r.comment, r.verifiedPurchase, r.status, r.createdAt]
          );
        }

        console.log('[DB] Seeding completed successfully in PostgreSQL!');
      }
    } catch (e: any) {
      console.error('[DB ERROR] Error seeding PostgreSQL tables:', e.message);
    }
  }
}

export const dbConnection = new DatabaseConnection();
