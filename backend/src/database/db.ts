import { Pool } from 'pg';
import { config } from '../config';
import {
  User,
  Store,
  Category,
  Brand,
  Product,
  ProductVariant,
  CartItem,
  Address,
  Order,
  OrderItem,
  Coupon,
  Review,
  Payout,
  Notification
} from '../types';
import {
  seedUsers,
  seedStores,
  seedCategories,
  seedBrands,
  seedProducts,
  seedCoupons,
  seedReviews
} from './seed';

class Database {
  private pool: Pool | null = null;
  private isPostgresConnected: boolean = false;
  private initPromise: Promise<void> | null = null;

  // In-memory collections (mirroring PG schema when connected, or dummy catalog when disconnected)
  public users: Map<string, User> = new Map();
  public stores: Map<string, Store> = new Map();
  public categories: Map<string, Category> = new Map();
  public brands: Map<string, Brand> = new Map();
  public products: Map<string, Product> = new Map();
  public cartItems: Map<string, CartItem> = new Map();
  public addresses: Map<string, Address> = new Map();
  public orders: Map<string, Order> = new Map();
  public coupons: Map<string, Coupon> = new Map();
  public reviews: Map<string, Review> = new Map();
  public payouts: Map<string, Payout> = new Map();
  public notifications: Map<string, Notification> = new Map();

  constructor() {
    this.initPromise = this.initPostgres();
  }

  public async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private assertDbConnected(operation: string): void {
    if (!this.isPostgresConnected || !this.pool) {
      throw new Error(`Database connection is mandatory for ${operation}. PostgreSQL is currently disconnected.`);
    }
  }

  private async initPostgres() {
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

      // 1. Run SQL schema script to ensure tables exist in PostgreSQL
      await this.ensureTablesExist(client);

      // 2. Check and run SQL seed script to insert initial data into PostgreSQL
      await this.syncSeedsToPostgres(client);

      // 3. Load all database records into memory cache
      await this.loadFromPostgres(client);

      client.release();
    } catch (err: any) {
      this.isPostgresConnected = false;
      console.warn('[DB WARNING] PostgreSQL connection failed. Falling back to read-only dummy product catalog:', err.message);

      // When DB is NOT connected, load ONLY dummy products and categories into memory
      this.loadDummyProductsOnly();
    }
  }

  public loadDummyProductsOnly(): void {
    this.users.clear();
    this.stores.clear();
    this.orders.clear();
    this.payouts.clear();
    this.reviews.clear();
    this.addresses.clear();

    // Load only dummy products, categories, and brands from seed.ts for browsing
    this.products.clear();
    this.categories.clear();
    this.brands.clear();

    seedCategories.forEach(c => this.categories.set(c.id, { ...c }));
    seedBrands.forEach(b => this.brands.set(b.id, { ...b }));
    seedProducts.forEach(p => this.products.set(p.id, { ...p, variants: p.variants.map(v => ({ ...v })) }));

    console.log(`[DB FALLBACK] Loaded ${this.products.size} dummy products and ${this.categories.size} categories into memory. All CRUD operations are disabled without a database connection.`);
  }

  private async ensureTablesExist(client: any) {
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
      `);
      console.log('[DB] Tables successfully verified in PostgreSQL.');
    } catch (e: any) {
      console.error('[DB ERROR] Error ensuring PostgreSQL tables:', e.message);
    }
  }

  private async syncSeedsToPostgres(client: any) {
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

  private async loadFromPostgres(client: any) {
    try {
      // 1. Load users
      const usersRes = await client.query('SELECT * FROM users;');
      usersRes.rows.forEach((r: any) => {
        const user: User = {
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
        };
        this.users.set(user.id, user);
      });

      // 2. Load stores
      const storesRes = await client.query('SELECT * FROM stores;');
      storesRes.rows.forEach((r: any) => {
        const store: Store = {
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
          status: r.status,
          commissionRate: parseFloat(r.commission_rate) || 10.0,
          balance: parseFloat(r.balance) || 0,
          totalEarnings: parseFloat(r.total_earnings) || 0,
          rating: parseFloat(r.rating) || 5.0,
          totalReviews: parseInt(r.total_reviews, 10) || 0,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
        this.stores.set(store.id, store);
      });

      // 3. Load categories
      const catRes = await client.query('SELECT * FROM categories WHERE is_active = true;');
      catRes.rows.forEach((r: any) => {
        this.categories.set(r.id, {
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          image: r.image,
          parentId: r.parent_id,
          isActive: r.is_active,
          commissionRate: parseFloat(r.commission_rate) || 10.0
        });
      });

      // 4. Load products & variants
      const prodRes = await client.query('SELECT * FROM products;');
      const variantsRes = await client.query('SELECT * FROM product_variants;');

      const variantsByProduct = new Map<string, ProductVariant[]>();
      variantsRes.rows.forEach((v: any) => {
        const list = variantsByProduct.get(v.product_id) || [];
        list.push({
          id: v.id,
          productId: v.product_id,
          title: v.title,
          sku: v.sku,
          price: parseFloat(v.price),
          stock: parseInt(v.stock, 10),
          attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {}),
          image: v.image
        });
        variantsByProduct.set(v.product_id, list);
      });

      prodRes.rows.forEach((p: any) => {
        this.products.set(p.id, {
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
          variants: variantsByProduct.get(p.id) || [],
          createdAt: p.created_at,
          updatedAt: p.updated_at
        });
      });

      // 5. Load coupons from PostgreSQL
      const couponsRes = await client.query('SELECT * FROM coupons;');
      couponsRes.rows.forEach((c: any) => {
        this.coupons.set(c.code.toUpperCase(), {
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
      });

      // 6. Brands
      seedBrands.forEach(b => this.brands.set(b.id, { ...b }));

      console.log(`[DB] Successfully loaded from PostgreSQL: ${this.products.size} products, ${this.categories.size} categories, ${this.stores.size} stores, ${this.coupons.size} coupons, ${this.users.size} users.`);
    } catch (e: any) {
      console.error('[DB ERROR] Error loading PostgreSQL records:', e.message);
    }
  }

  public getPostgresStatus(): boolean {
    return this.isPostgresConnected;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isPostgresConnected = false;
    }
  }

  // --- User Repository ---
  public async findUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureReady();
    if (!this.isPostgresConnected) {
      return undefined; // Users cannot be queried without database connection
    }

    const memoryUser = Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    if (memoryUser) return memoryUser;

    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1);', [email]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const user: User = {
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
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err: any) {
        console.error('findUserByEmail PostgreSQL error:', err.message);
      }
    }

    return undefined;
  }

  public async findUserById(id: string): Promise<User | undefined> {
    await this.ensureReady();
    if (!this.isPostgresConnected) {
      return undefined;
    }

    const memoryUser = this.users.get(id);
    if (memoryUser) return memoryUser;

    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM users WHERE id = $1;', [id]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          const user: User = {
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
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err: any) {
        console.error('findUserById PostgreSQL error:', err.message);
      }
    }

    return undefined;
  }

  public async createUser(user: User): Promise<User> {
    await this.ensureReady();
    this.assertDbConnected('user registration');

    try {
      await this.pool!.query(
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
      this.users.set(user.id, user);
      console.log(`[DB] Successfully inserted user ${user.email} into PostgreSQL table 'users'`);
    } catch (err: any) {
      console.error('Error inserting user into PostgreSQL:', err.message);
      throw err;
    }

    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating user');

    const existing = await this.findUserById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    try {
      await this.pool!.query(
        `UPDATE users SET name = $1, email = $2, phone = $3, dob = $4, role = $5, store_id = $6, updated_at = $7 WHERE id = $8;`,
        [updated.name, updated.email, updated.phone, updated.dob || null, updated.role, updated.storeId || null, updated.updatedAt, id]
      );
      this.users.set(id, updated);
    } catch (err: any) {
      console.error('Error updating user in PostgreSQL:', err.message);
      throw err;
    }

    return updated;
  }

  public async getAllUsers(): Promise<User[]> {
    await this.ensureReady();
    this.assertDbConnected('listing users');

    const res = await this.pool!.query('SELECT * FROM users ORDER BY created_at DESC;');
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      dob: r.dob,
      role: r.role,
      storeId: r.store_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    } as User));
  }

  // --- Store Repository ---
  public async findStoreById(id: string): Promise<Store | undefined> {
    await this.ensureReady();
    return this.stores.get(id);
  }

  public async findStoreByUserId(userId: string): Promise<Store | undefined> {
    await this.ensureReady();
    return Array.from(this.stores.values()).find(s => s.userId === userId);
  }

  public async getAllStores(): Promise<Store[]> {
    await this.ensureReady();
    return Array.from(this.stores.values());
  }

  public async createStore(store: Store): Promise<Store> {
    await this.ensureReady();
    this.assertDbConnected('store registration');

    try {
      await this.pool!.query(
        `INSERT INTO stores (id, user_id, name, slug, description, logo, banner, gstin, pan, bank_account, kyc_documents, kyc_status, status, commission_rate, balance, total_earnings, rating, total_reviews, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (id) DO NOTHING;`,
        [
          store.id, store.userId, store.name, store.slug, store.description, store.logo, store.banner, store.gstin, store.pan,
          JSON.stringify(store.bankAccount), JSON.stringify(store.kycDocuments), store.kycStatus, store.status,
          store.commissionRate, store.balance, store.totalEarnings, store.rating, store.totalReviews, store.createdAt, store.updatedAt
        ]
      );
      this.stores.set(store.id, store);
    } catch (e: any) {
      console.error('Error inserting store in PostgreSQL:', e.message);
      throw e;
    }
    return store;
  }

  public async updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating store');

    const existing = this.stores.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    try {
      await this.pool!.query(
        `UPDATE stores SET name = $1, description = $2, logo = $3, banner = $4, gstin = $5, pan = $6,
         bank_account = $7, kyc_status = $8, status = $9, commission_rate = $10, balance = $11,
         total_earnings = $12, rating = $13, total_reviews = $14, updated_at = $15 WHERE id = $16;`,
        [
          updated.name, updated.description, updated.logo, updated.banner, updated.gstin, updated.pan,
          JSON.stringify(updated.bankAccount), updated.kycStatus, updated.status, updated.commissionRate,
          updated.balance, updated.totalEarnings, updated.rating, updated.totalReviews, updated.updatedAt, id
        ]
      );
      this.stores.set(id, updated);
    } catch (e: any) {
      console.error('Error updating store in PostgreSQL:', e.message);
      throw e;
    }
    return updated;
  }

  // --- Category & Brand Repository ---
  public async getAllCategories(): Promise<Category[]> {
    await this.ensureReady();
    return Array.from(this.categories.values()).filter(c => c.isActive);
  }

  public async getCategoryById(id: string): Promise<Category | undefined> {
    await this.ensureReady();
    return this.categories.get(id);
  }

  public async createCategory(cat: Category): Promise<Category> {
    await this.ensureReady();
    this.assertDbConnected('creating category');

    try {
      await this.pool!.query(
        `INSERT INTO categories (id, name, slug, description, image, is_active, commission_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING;`,
        [cat.id, cat.name, cat.slug, cat.description, cat.image, cat.isActive, cat.commissionRate || 10.0]
      );
      this.categories.set(cat.id, cat);
    } catch (e: any) {
      console.error('Error creating category in PostgreSQL:', e.message);
      throw e;
    }
    return cat;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating category');

    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };

    try {
      await this.pool!.query(
        `UPDATE categories SET name = $1, description = $2, image = $3, is_active = $4, commission_rate = $5 WHERE id = $6;`,
        [updated.name, updated.description, updated.image, updated.isActive, updated.commissionRate, id]
      );
      this.categories.set(id, updated);
    } catch (e: any) {
      console.error('Error updating category in PostgreSQL:', e.message);
      throw e;
    }
    return updated;
  }

  public async getAllBrands(): Promise<Brand[]> {
    await this.ensureReady();
    return Array.from(this.brands.values()).filter(b => b.isActive);
  }

  // --- Product Repository (Read-only catalog works even when DB is disconnected) ---
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
    await this.ensureReady();
    let result = Array.from(this.products.values());

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

    // Sorting
    if (filters?.sortBy === 'price_asc') {
      result.sort((a, b) => a.salePrice - b.salePrice);
    } else if (filters?.sortBy === 'price_desc') {
      result.sort((a, b) => b.salePrice - a.salePrice);
    } else if (filters?.sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      // default: newest first
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  public async getProductById(id: string): Promise<Product | undefined> {
    await this.ensureReady();
    return this.products.get(id);
  }

  public async createProduct(product: Product): Promise<Product> {
    await this.ensureReady();
    this.assertDbConnected('adding product');

    try {
      await this.pool!.query(
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
        await this.pool!.query(
          `INSERT INTO product_variants (id, product_id, title, sku, price, stock, attributes, image)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING;`,
          [v.id, v.productId, v.title, v.sku, v.price, v.stock, JSON.stringify(v.attributes), v.image || null]
        );
      }
      this.products.set(product.id, product);
    } catch (e: any) {
      console.error('Error creating product in PostgreSQL:', e.message);
      throw e;
    }
    return product;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating product');

    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    try {
      await this.pool!.query(
        `UPDATE products SET title = $1, description = $2, short_description = $3, base_price = $4,
         sale_price = $5, stock = $6, status = $7, is_featured = $8, updated_at = $9 WHERE id = $10;`,
        [
          updated.title, updated.description, updated.shortDescription, updated.basePrice,
          updated.salePrice, updated.stock, updated.status, updated.isFeatured, updated.updatedAt, id
        ]
      );
      this.products.set(id, updated);
    } catch (e: any) {
      console.error('Error updating product in PostgreSQL:', e.message);
      throw e;
    }
    return updated;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    await this.ensureReady();
    this.assertDbConnected('deleting product');

    try {
      await this.pool!.query('DELETE FROM products WHERE id = $1;', [id]);
      return this.products.delete(id);
    } catch (e: any) {
      console.error('Error deleting product in PostgreSQL:', e.message);
      throw e;
    }
  }

  // --- Cart Repository ---
  public async getCart(userId: string): Promise<CartItem[]> {
    await this.ensureReady();
    return Array.from(this.cartItems.values()).filter(c => c.userId === userId);
  }

  public async addToCart(item: CartItem): Promise<CartItem> {
    await this.ensureReady();
    const existing = Array.from(this.cartItems.values()).find(
      c => c.userId === item.userId && c.productId === item.productId && c.variantId === item.variantId
    );

    if (existing) {
      existing.quantity += item.quantity;
      this.cartItems.set(existing.id, existing);
      return existing;
    }

    this.cartItems.set(item.id, item);
    return item;
  }

  public async updateCartQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    await this.ensureReady();
    const item = this.cartItems.get(id);
    if (!item) return undefined;
    if (quantity <= 0) {
      this.cartItems.delete(id);
      return undefined;
    }
    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }

  public async removeCartItem(id: string): Promise<boolean> {
    await this.ensureReady();
    return this.cartItems.delete(id);
  }

  public async clearCart(userId: string): Promise<void> {
    await this.ensureReady();
    for (const [id, item] of this.cartItems.entries()) {
      if (item.userId === userId) {
        this.cartItems.delete(id);
      }
    }
  }

  // --- Address Repository ---
  public async getUserAddresses(userId: string): Promise<Address[]> {
    await this.ensureReady();
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM addresses WHERE user_id = $1;', [userId]);
        return res.rows.map((r: any) => ({
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
        }));
      } catch (e: any) {
        console.error('Error fetching addresses from PostgreSQL:', e.message);
      }
    }
    return Array.from(this.addresses.values()).filter(a => a.userId === userId);
  }

  public async createAddress(address: Address): Promise<Address> {
    await this.ensureReady();
    this.assertDbConnected('saving shipping address');

    try {
      if (address.isDefault) {
        await this.pool!.query('UPDATE addresses SET is_default = false WHERE user_id = $1;', [address.userId]);
      }
      await this.pool!.query(
        `INSERT INTO addresses (id, user_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [address.id, address.userId, address.fullName, address.phone, address.addressLine1, address.addressLine2 || null, address.city, address.state, address.postalCode, address.country, address.isDefault]
      );
      this.addresses.set(address.id, address);
    } catch (e: any) {
      console.error('Error inserting address in PostgreSQL:', e.message);
      throw e;
    }
    return address;
  }

  // --- Coupon Repository ---
  public async getCouponByCode(code: string): Promise<Coupon | undefined> {
    await this.ensureReady();
    const coupon = this.coupons.get(code.toUpperCase());
    if (!coupon || !coupon.isActive) return undefined;
    if (new Date(coupon.expiresAt) < new Date()) return undefined;
    return coupon;
  }

  public async incrementCouponUsage(code: string): Promise<void> {
    await this.ensureReady();
    const coupon = this.coupons.get(code.toUpperCase());
    if (coupon) {
      coupon.usageCount += 1;
      this.coupons.set(code.toUpperCase(), coupon);
    }
  }

  public async getAllCoupons(): Promise<Coupon[]> {
    await this.ensureReady();
    return Array.from(this.coupons.values());
  }

  public async createCoupon(coupon: Coupon): Promise<Coupon> {
    await this.ensureReady();
    this.assertDbConnected('creating promotional coupon');

    try {
      await this.pool!.query(
        `INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, expires_at, is_active, usage_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING;`,
        [coupon.id, coupon.code, coupon.description, coupon.discountType, coupon.discountValue, coupon.minOrderAmount, coupon.maxDiscount || null, coupon.expiresAt, coupon.isActive, coupon.usageCount]
      );
      this.coupons.set(coupon.code.toUpperCase(), coupon);
    } catch (e: any) {
      console.error('Error inserting coupon in PostgreSQL:', e.message);
      throw e;
    }
    return coupon;
  }

  // --- Order Repository ---
  public async createOrder(order: Order): Promise<Order> {
    await this.ensureReady();
    this.assertDbConnected('placing an order');

    try {
      await this.pool!.query(
        `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, subtotal, discount, coupon_code, tax, shipping_fee, total_amount, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
        [
          order.id, order.orderNumber, order.customerId, order.customerName, order.customerEmail, order.customerPhone,
          JSON.stringify(order.shippingAddress), order.paymentMethod, order.paymentStatus, order.razorpayOrderId || null,
          order.razorpayPaymentId || null, order.subtotal, order.discount, order.couponCode || null, order.tax,
          order.shippingFee, order.totalAmount, order.status, order.createdAt, order.updatedAt
        ]
      );

      for (const item of order.items) {
        await this.pool!.query(
          `INSERT INTO order_items (id, order_id, store_id, store_name, product_id, variant_id, product_title, sku, price, quantity, image, subtotal, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
          [
            item.id, order.id, item.storeId, item.storeName, item.productId, item.variantId || null,
            item.productTitle, item.sku || null, item.price, item.quantity, item.image, item.subtotal, item.status
          ]
        );
      }

      this.orders.set(order.id, order);

      // Adjust inventory and store balance
      for (const item of order.items) {
        const prod = this.products.get(item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          if (prod.stock === 0) prod.status = 'OUT_OF_STOCK';
          this.products.set(prod.id, prod);
        }

        const store = this.stores.get(item.storeId);
        if (store) {
          const itemGross = item.subtotal;
          const commission = (itemGross * store.commissionRate) / 100;
          const sellerShare = itemGross - commission;
          store.balance += sellerShare;
          store.totalEarnings += sellerShare;
          this.stores.set(store.id, store);
        }
      }
    } catch (err: any) {
      console.error('Error inserting order in PostgreSQL:', err.message);
      throw err;
    }

    return order;
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    await this.ensureReady();
    return this.orders.get(id);
  }

  public async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    await this.ensureReady();
    return Array.from(this.orders.values())
      .filter(o => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getOrdersForStore(storeId: string): Promise<{ order: Order; items: OrderItem[] }[]> {
    await this.ensureReady();
    const results: { order: Order; items: OrderItem[] }[] = [];
    for (const order of this.orders.values()) {
      const storeItems = order.items.filter(item => item.storeId === storeId);
      if (storeItems.length > 0) {
        results.push({ order, items: storeItems });
      }
    }
    return results.sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());
  }

  public async getAllOrders(): Promise<Order[]> {
    await this.ensureReady();
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ): Promise<Order | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating order status');

    const order = this.orders.get(orderId);
    if (!order) return undefined;
    order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();

    try {
      await this.pool!.query(
        'UPDATE orders SET status = $1, payment_status = COALESCE($2, payment_status), updated_at = $3 WHERE id = $4;',
        [status, paymentStatus || null, order.updatedAt, orderId]
      );
      this.orders.set(orderId, order);
    } catch (e: any) {
      console.error('Error updating order status in PostgreSQL:', e.message);
      throw e;
    }
    return order;
  }

  public async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    status: OrderItem['status'],
    trackingInfo?: { trackingNumber?: string; courierName?: string; returnReason?: string }
  ): Promise<OrderItem | undefined> {
    await this.ensureReady();
    this.assertDbConnected('updating shipment fulfillment status');

    const order = this.orders.get(orderId);
    if (!order) return undefined;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return undefined;

    item.status = status;
    if (trackingInfo?.trackingNumber) item.trackingNumber = trackingInfo.trackingNumber;
    if (trackingInfo?.courierName) item.courierName = trackingInfo.courierName;
    if (trackingInfo?.returnReason) item.returnReason = trackingInfo.returnReason;

    const allDelivered = order.items.every(i => i.status === 'DELIVERED');
    if (allDelivered) order.status = 'DELIVERED';

    const allShipped = order.items.every(i => i.status === 'SHIPPED' || i.status === 'DELIVERED');
    if (allShipped && order.status !== 'DELIVERED') order.status = 'SHIPPED';

    order.updatedAt = new Date().toISOString();

    try {
      await this.pool!.query(
        'UPDATE order_items SET status = $1, tracking_number = $2, courier_name = $3, return_reason = $4 WHERE id = $5;',
        [status, item.trackingNumber || null, item.courierName || null, item.returnReason || null, itemId]
      );
      this.orders.set(orderId, order);
    } catch (e: any) {
      console.error('Error updating item status in PostgreSQL:', e.message);
      throw e;
    }
    return item;
  }

  // --- Reviews Repository ---
  public async getProductReviews(productId: string): Promise<Review[]> {
    await this.ensureReady();
    return Array.from(this.reviews.values())
      .filter(r => r.productId === productId && r.status === 'APPROVED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async addReview(review: Review): Promise<Review> {
    await this.ensureReady();
    this.assertDbConnected('submitting a product review');

    try {
      await this.pool!.query(
        `INSERT INTO reviews (id, product_id, customer_id, customer_name, rating, title, comment, verified_purchase, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING;`,
        [review.id, review.productId, review.customerId, review.customerName, review.rating, review.title, review.comment, review.verifiedPurchase, review.status, review.createdAt]
      );

      this.reviews.set(review.id, review);

      const prodReviews = Array.from(this.reviews.values()).filter(
        r => r.productId === review.productId && r.status === 'APPROVED'
      );
      const avgRating = prodReviews.reduce((sum, r) => sum + r.rating, 0) / (prodReviews.length || 1);

      const product = this.products.get(review.productId);
      if (product) {
        product.rating = parseFloat(avgRating.toFixed(1));
        product.numReviews = prodReviews.length;
        this.products.set(product.id, product);
      }
    } catch (e: any) {
      console.error('Error adding review in PostgreSQL:', e.message);
      throw e;
    }

    return review;
  }

  // --- Payout Repository ---
  public async createPayout(payout: Payout): Promise<Payout> {
    await this.ensureReady();
    this.assertDbConnected('requesting payout withdrawal');

    try {
      await this.pool!.query(
        `INSERT INTO payouts (id, store_id, store_name, amount, commission_deducted, net_payout, status, bank_account, transaction_ref, requested_at, processed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [payout.id, payout.storeId, payout.storeName, payout.amount, payout.commissionDeducted, payout.netPayout, payout.status, JSON.stringify(payout.bankAccount), payout.transactionRef || null, payout.requestedAt, payout.processedAt || null, payout.notes || null]
      );
      this.payouts.set(payout.id, payout);
    } catch (e: any) {
      console.error('Error creating payout in PostgreSQL:', e.message);
      throw e;
    }
    return payout;
  }

  public async getStorePayouts(storeId: string): Promise<Payout[]> {
    await this.ensureReady();
    return Array.from(this.payouts.values()).filter(p => p.storeId === storeId);
  }

  public async getAllPayouts(): Promise<Payout[]> {
    await this.ensureReady();
    return Array.from(this.payouts.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public async updatePayoutStatus(
    id: string,
    status: Payout['status'],
    transactionRef?: string
  ): Promise<Payout | undefined> {
    await this.ensureReady();
    this.assertDbConnected('processing payout');

    const p = this.payouts.get(id);
    if (!p) return undefined;
    p.status = status;
    if (transactionRef) p.transactionRef = transactionRef;
    if (status === 'PROCESSED') {
      p.processedAt = new Date().toISOString();
      const store = this.stores.get(p.storeId);
      if (store) {
        store.balance = Math.max(0, store.balance - p.amount);
        this.stores.set(store.id, store);
      }
    }

    try {
      await this.pool!.query(
        'UPDATE payouts SET status = $1, transaction_ref = $2, processed_at = $3 WHERE id = $4;',
        [status, transactionRef || null, p.processedAt || null, id]
      );
      this.payouts.set(id, p);
    } catch (e: any) {
      console.error('Error updating payout in PostgreSQL:', e.message);
      throw e;
    }
    return p;
  }

  // --- Notification Repository ---
  public async createNotification(notification: Notification): Promise<Notification> {
    await this.ensureReady();
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public async getUserNotifications(userId: string): Promise<Notification[]> {
    await this.ensureReady();
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    await this.ensureReady();
    const n = this.notifications.get(id);
    if (n) {
      n.isRead = true;
      this.notifications.set(id, n);
    }
  }
}

export const db = new Database();
