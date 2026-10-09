export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN';
export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob?: string;
  passwordHash: string;
  role: UserRole;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface KycDocuments {
  panCardUrl?: string;
  gstCertificateUrl?: string;
  idProofUrl?: string;
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
  kycDocuments: KycDocuments;
  kycStatus: KycStatus;
  kycNotes?: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED';
  commissionRate: number; // in percent e.g. 10.0
  balance: number;
  totalEarnings: number;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId?: string | null;
  isActive: boolean;
  commissionRate?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  isActive: boolean;
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
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  userId?: string;
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

export type OrderStatus =
  | 'PLACED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type ItemFulfillmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

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
  status: ItemFulfillmentStatus;
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
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiresAt: string;
  isActive: boolean;
  usageCount: number;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
}

export interface Payout {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  commissionDeducted: number;
  netPayout: number;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  bankAccount: BankAccount;
  transactionRef?: string;
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'KYC' | 'PROMOTION' | 'PAYOUT' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
}
