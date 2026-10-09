export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob?: string;
  role: UserRole;
  storeId?: string;
  createdAt: string;
}

export interface BankAccount {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  gstin: string;
  pan: string;
  bankAccount: BankAccount;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycNotes?: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED';
  commissionRate: number;
  balance: number;
  totalEarnings: number;
  rating: number;
  totalReviews: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
}

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  categoryName: string;
  brand?: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  salePrice: number;
  stock: number;
  images: string[];
  status: 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK';
  rating: number;
  numReviews: number;
  isFeatured: boolean;
  tags: string[];
  attributes: { key: string; value: string }[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  storeId: string;
  storeName: string;
  attributes?: Record<string, string>;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  total: number;
}

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  sku?: string;
  price: number;
  quantity: number;
  image: string;
  subtotal: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED';
  trackingNumber?: string;
  courierName?: string;
  returnReason?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: 'RAZORPAY' | 'COD';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  subtotal: number;
  discount: number;
  couponCode?: string;
  tax: number;
  shippingFee: number;
  totalAmount: number;
  status: 'PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
}

export interface Payout {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  netPayout: number;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  bankAccount: BankAccount;
  transactionRef?: string;
  requestedAt: string;
  processedAt?: string;
}
