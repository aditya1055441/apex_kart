import { dbConnection } from './connection';
import { userDb } from './user.db';
import { storeDb } from './store.db';
import { categoryDb } from './category.db';
import { productDb } from './product.db';
import { orderDb } from './order.db';
import { couponDb } from './coupon.db';
import { reviewDb } from './review.db';
import { payoutDb } from './payout.db';
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

export class Database {
  public cartItems: Map<string, CartItem> = new Map();
  public notifications: Map<string, Notification> = new Map();

  public ensureReady(): Promise<void> {
    return dbConnection.ensureReady();
  }

  public getPostgresStatus(): boolean {
    return dbConnection.isConnected();
  }

  public close(): Promise<void> {
    return dbConnection.close();
  }

  // --- User Repository ---
  public findUserByEmail(email: string): Promise<User | undefined> {
    return userDb.findUserByEmail(email);
  }

  public findUserById(id: string): Promise<User | undefined> {
    return userDb.findUserById(id);
  }

  public findUserByPhone(phone: string): Promise<User | undefined> {
    return userDb.findUserByPhone(phone);
  }

  public createUser(user: User): Promise<User> {
    return userDb.createUser(user);
  }

  public updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    return userDb.updateUser(id, updates);
  }

  public getAllUsers(): Promise<User[]> {
    return userDb.getAllUsers();
  }

  public getUserAddresses(userId: string): Promise<Address[]> {
    return userDb.getUserAddresses(userId);
  }

  public createAddress(address: Address): Promise<Address> {
    return userDb.createAddress(address);
  }

  // --- Store Repository ---
  public findStoreById(id: string): Promise<Store | undefined> {
    return storeDb.findStoreById(id);
  }

  public findStoreByUserId(userId: string): Promise<Store | undefined> {
    return storeDb.findStoreByUserId(userId);
  }

  public getAllStores(): Promise<Store[]> {
    return storeDb.getAllStores();
  }

  public createStore(store: Store): Promise<Store> {
    return storeDb.createStore(store);
  }

  public updateStore(id: string, updates: Partial<Store>): Promise<Store | undefined> {
    return storeDb.updateStore(id, updates);
  }

  // --- Category & Brand Repository ---
  public getAllCategories(): Promise<Category[]> {
    return categoryDb.getAllCategories();
  }

  public getCategoryById(id: string): Promise<Category | undefined> {
    return categoryDb.getCategoryById(id);
  }

  public createCategory(cat: Category): Promise<Category> {
    return categoryDb.createCategory(cat);
  }

  public updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    return categoryDb.updateCategory(id, updates);
  }

  public getAllBrands(): Promise<Brand[]> {
    return categoryDb.getAllBrands();
  }

  // --- Product Repository ---
  public getProducts(filters?: {
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
    return productDb.getProducts(filters);
  }

  public getProductById(id: string): Promise<Product | undefined> {
    return productDb.getProductById(id);
  }

  public createProduct(product: Product): Promise<Product> {
    return productDb.createProduct(product);
  }

  public updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    return productDb.updateProduct(id, updates);
  }

  public deleteProduct(id: string): Promise<boolean> {
    return productDb.deleteProduct(id);
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

  // --- Coupon Repository ---
  public getCouponByCode(code: string): Promise<Coupon | undefined> {
    return couponDb.getCouponByCode(code);
  }

  public incrementCouponUsage(code: string): Promise<void> {
    return couponDb.incrementCouponUsage(code);
  }

  public getAllCoupons(): Promise<Coupon[]> {
    return couponDb.getAllCoupons();
  }

  public createCoupon(coupon: Coupon): Promise<Coupon> {
    return couponDb.createCoupon(coupon);
  }

  // --- Order Repository ---
  public createOrder(order: Order): Promise<Order> {
    return orderDb.createOrder(order);
  }

  public getOrderById(id: string): Promise<Order | undefined> {
    return orderDb.getOrderById(id);
  }

  public findOrderByRazorpayOrderId(rzpOrderId: string): Promise<Order | undefined> {
    return orderDb.findOrderByRazorpayOrderId(rzpOrderId);
  }

  public getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return orderDb.getOrdersByCustomer(customerId);
  }

  public getOrdersForStore(storeId: string): Promise<{ order: Order; items: OrderItem[] }[]> {
    return orderDb.getOrdersForStore(storeId);
  }

  public getAllOrders(): Promise<Order[]> {
    return orderDb.getAllOrders();
  }

  public updateOrderStatus(
    orderId: string,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ): Promise<Order | undefined> {
    return orderDb.updateOrderStatus(orderId, status, paymentStatus);
  }

  public updateOrderItemStatus(
    orderId: string,
    itemId: string,
    status: OrderItem['status'],
    trackingInfo?: { trackingNumber?: string; courierName?: string; returnReason?: string }
  ): Promise<OrderItem | undefined> {
    return orderDb.updateOrderItemStatus(orderId, itemId, status, trackingInfo);
  }

  // --- Review Repository ---
  public getProductReviews(productId: string): Promise<Review[]> {
    return reviewDb.getProductReviews(productId);
  }

  public addReview(review: Review): Promise<Review> {
    return reviewDb.addReview(review);
  }

  // --- Payout Repository ---
  public createPayout(payout: Payout): Promise<Payout> {
    return payoutDb.createPayout(payout);
  }

  public getStorePayouts(storeId: string): Promise<Payout[]> {
    return payoutDb.getStorePayouts(storeId);
  }

  public getAllPayouts(): Promise<Payout[]> {
    return payoutDb.getAllPayouts();
  }

  public updatePayoutStatus(
    id: string,
    status: Payout['status'],
    transactionRef?: string
  ): Promise<Payout | undefined> {
    return payoutDb.updatePayoutStatus(id, status, transactionRef);
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
export * from './connection';
export * from './user.db';
export * from './store.db';
export * from './category.db';
export * from './product.db';
export * from './order.db';
export * from './coupon.db';
export * from './review.db';
export * from './payout.db';
export * from './otp.db';
