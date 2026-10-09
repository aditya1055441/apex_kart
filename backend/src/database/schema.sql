-- PostgreSQL Database Schema for Multi-Vendor E-Commerce Marketplace

-- Users Table
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

-- Stores / Vendors Table
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

-- Categories Table
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

-- Products Table
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

-- Product Variants
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

-- Addresses Table
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

-- Orders Table
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

-- Order Items Table
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

-- Coupons Table
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

-- Reviews Table
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

-- Payouts Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store ON order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
