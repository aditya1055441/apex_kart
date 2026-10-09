import { Pool } from 'pg';
import { config } from '../config';
import {
  User,
  Store,
  Category,
  Brand,
  Product,
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
  seedReviews,
  seedAddresses
} from './seed';

class Database {
  private pool: Pool | null = null;
  private isPostgresConnected: boolean = false;

  // In-memory collections (mirroring PG schema for instant fast access)
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
    this.seedInMemory();
    this.initPostgres();
  }

  private seedInMemory() {
    seedUsers.forEach(u => this.users.set(u.id, { ...u }));
    seedStores.forEach(s => this.stores.set(s.id, { ...s }));
    seedCategories.forEach(c => this.categories.set(c.id, { ...c }));
    seedBrands.forEach(b => this.brands.set(b.id, { ...b }));
    seedProducts.forEach(p => this.products.set(p.id, { ...p, variants: p.variants.map(v => ({ ...v })) }));
    seedCoupons.forEach(c => this.coupons.set(c.code.toUpperCase(), { ...c }));
    seedReviews.forEach(r => this.reviews.set(r.id, { ...r }));
    seedAddresses.forEach(a => this.addresses.set(a.id, { ...a }));
  }

  private async initPostgres() {
    try {
      this.pool = new Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 3000
      });

      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('Successfully connected to PostgreSQL database:', config.databaseUrl);

      // Check if users table is empty; if so, populate initial seed data into PostgreSQL
      await this.syncSeedsToPostgres(client);
      await this.loadFromPostgres(client);

      client.release();
    } catch (err: any) {
      this.isPostgresConnected = false;
      console.log('PostgreSQL direct connection not available, operating with in-memory persistent store:', err.message);
    }
  }

  private async syncSeedsToPostgres(client: any) {
    try {
      const res = await client.query('SELECT COUNT(*) FROM users;');
      const count = parseInt(res.rows[0].count, 10);
      if (count === 0) {
        console.log('Seeding initial marketplace data into PostgreSQL...');

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

        // 4. Seed Products
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

        console.log('Seeding completed successfully in PostgreSQL!');
      }
    } catch (e: any) {
      console.error('Error seeding PostgreSQL tables:', e.message);
    }
  }

  private async loadFromPostgres(client: any) {
    try {
      // Load all users from PostgreSQL into memory
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
    } catch (e: any) {
      console.error('Error loading PostgreSQL records:', e.message);
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
    const memoryUser = Array.from(this.users.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    if (memoryUser) return memoryUser;

    if (this.isPostgresConnected && this.pool) {
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
    const memoryUser = this.users.get(id);
    if (memoryUser) return memoryUser;

    if (this.isPostgresConnected && this.pool) {
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
    this.users.set(user.id, user);

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
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
        console.log(`[DB] Successfully inserted user ${user.email} into PostgreSQL table 'users'`);
      } catch (err: any) {
        console.error('Error inserting user into PostgreSQL:', err.message);
      }
    }

    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = await this.findUserById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE users SET name = $1, email = $2, phone = $3, dob = $4, role = $5, store_id = $6, updated_at = $7 WHERE id = $8;`,
          [updated.name, updated.email, updated.phone, updated.dob || null, updated.role, updated.storeId || null, updated.updatedAt, id]
        );
      } catch (err: any) {
        console.error('Error updating user in PostgreSQL:', err.message);
      }
    }

    return updated;
  }

  public async getAllUsers(): Promise<User[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC;');
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
      } catch (err: any) {
        console.error('getAllUsers PostgreSQL error:', err.message);
      }
    }
    return Array.from(this.users.values()).map(({ passwordHash, ...rest }) => rest as User);
  }

  // --- Store Repository ---
  public async findStoreById(id: string): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  public async findStoreByUserId(userId: string): Promise<Store | undefined> {
    return Array.from(this.stores.values()).find(s => s.userId === userId);
  }

  public async getAllStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  public async createStore(store: Store): Promise<Store> {
    this.stores.set(store.id, store);
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO stores (id, user_id, name, slug, description, logo, banner, gstin, pan, bank_account, kyc_documents, kyc_status, status, commission_rate, balance, total_earnings, rating, total_reviews, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
           ON CONFLICT (id) DO NOTHING;`,
          [
            store.id, store.userId, store.name, store.slug, store.description, store.logo, store.banner, store.gstin, store.pan,
            JSON.stringify(store.bankAccount), JSON.stringify(store.kycDocuments), store.kycStatus, store.status,
            store.commissionRate, store.balance, store.totalEarnings, store.rating, store.totalReviews, store.createdAt, store.updatedAt
          ]
        );
      } catch (e: any) {
        console.error('Error inserting store in PostgreSQL:', e.message);
      }
    }
    return store;
  }

  public async updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined> {
    const existing = this.stores.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.stores.set(id, updated);
    return updated;
  }

  // --- Category & Brand Repository ---
  public async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(c => c.isActive);
  }

  public async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  public async createCategory(cat: Category): Promise<Category> {
    this.categories.set(cat.id, cat);
    return cat;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.categories.set(id, updated);
    return updated;
  }

  public async getAllBrands(): Promise<Brand[]> {
    return Array.from(this.brands.values()).filter(b => b.isActive);
  }

  // --- Product Repository ---
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
    return this.products.get(id);
  }

  public async createProduct(product: Product): Promise<Product> {
    this.products.set(product.id, product);
    return product;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.products.set(id, updated);
    return updated;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // --- Cart Repository ---
  public async getCart(userId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(c => c.userId === userId);
  }

  public async addToCart(item: CartItem): Promise<CartItem> {
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
    return this.cartItems.delete(id);
  }

  public async clearCart(userId: string): Promise<void> {
    for (const [id, item] of this.cartItems.entries()) {
      if (item.userId === userId) {
        this.cartItems.delete(id);
      }
    }
  }

  // --- Address Repository ---
  public async getUserAddresses(userId: string): Promise<Address[]> {
    return Array.from(this.addresses.values()).filter(a => a.userId === userId);
  }

  public async createAddress(address: Address): Promise<Address> {
    if (address.isDefault) {
      Array.from(this.addresses.values())
        .filter(a => a.userId === address.userId)
        .forEach(a => (a.isDefault = false));
    }
    this.addresses.set(address.id, address);
    return address;
  }

  // --- Coupon Repository ---
  public async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const coupon = this.coupons.get(code.toUpperCase());
    if (!coupon || !coupon.isActive) return undefined;
    if (new Date(coupon.expiresAt) < new Date()) return undefined;
    return coupon;
  }

  public async incrementCouponUsage(code: string): Promise<void> {
    const coupon = this.coupons.get(code.toUpperCase());
    if (coupon) {
      coupon.usageCount += 1;
      this.coupons.set(code.toUpperCase(), coupon);
    }
  }

  public async getAllCoupons(): Promise<Coupon[]> {
    return Array.from(this.coupons.values());
  }

  public async createCoupon(coupon: Coupon): Promise<Coupon> {
    this.coupons.set(coupon.code.toUpperCase(), coupon);
    return coupon;
  }

  // --- Order Repository ---
  public async createOrder(order: Order): Promise<Order> {
    this.orders.set(order.id, order);

    // Adjust inventory
    for (const item of order.items) {
      const prod = this.products.get(item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        if (prod.stock === 0) prod.status = 'OUT_OF_STOCK';
        if (item.variantId) {
          const variant = prod.variants.find(v => v.id === item.variantId);
          if (variant) {
            variant.stock = Math.max(0, variant.stock - item.quantity);
          }
        }
        this.products.set(prod.id, prod);
      }

      // Update store sales balance
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

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
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
          await this.pool.query(
            `INSERT INTO order_items (id, order_id, store_id, store_name, product_id, variant_id, product_title, sku, price, quantity, image, subtotal, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
            [
              item.id, order.id, item.storeId, item.storeName, item.productId, item.variantId || null,
              item.productTitle, item.sku || null, item.price, item.quantity, item.image, item.subtotal, item.status
            ]
          );
        }
      } catch (err: any) {
        console.error('Error inserting order in PostgreSQL:', err.message);
      }
    }

    return order;
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  public async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getOrdersForStore(storeId: string): Promise<{ order: Order; items: OrderItem[] }[]> {
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
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ): Promise<Order | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    this.orders.set(orderId, order);
    return order;
  }

  public async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    status: OrderItem['status'],
    trackingInfo?: { trackingNumber?: string; courierName?: string; returnReason?: string }
  ): Promise<OrderItem | undefined> {
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
    this.orders.set(orderId, order);
    return item;
  }

  // --- Reviews Repository ---
  public async getProductReviews(productId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.productId === productId && r.status === 'APPROVED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async addReview(review: Review): Promise<Review> {
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

    return review;
  }

  // --- Payout Repository ---
  public async createPayout(payout: Payout): Promise<Payout> {
    this.payouts.set(payout.id, payout);
    return payout;
  }

  public async getStorePayouts(storeId: string): Promise<Payout[]> {
    return Array.from(this.payouts.values()).filter(p => p.storeId === storeId);
  }

  public async getAllPayouts(): Promise<Payout[]> {
    return Array.from(this.payouts.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public async updatePayoutStatus(
    id: string,
    status: Payout['status'],
    transactionRef?: string
  ): Promise<Payout | undefined> {
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
    this.payouts.set(id, p);
    return p;
  }

  // --- Notification Repository ---
  public async createNotification(notification: Notification): Promise<Notification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    const n = this.notifications.get(id);
    if (n) {
      n.isRead = true;
      this.notifications.set(id, n);
    }
  }
}

export const db = new Database();
