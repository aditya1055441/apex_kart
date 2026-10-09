import bcrypt from 'bcryptjs';
import { User, Store, Category, Brand, Product, Coupon, Review, Address } from '../types';

export const seedUsers: User[] = [
  {
    id: 'u-admin-1',
    name: 'Super Admin',
    email: 'admin@marketplace.com',
    phone: '+919876543210',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    role: 'ADMIN',
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString()
  },
  {
    id: 'u-seller-1',
    name: 'Apex Electronics',
    email: 'seller@apextech.com',
    phone: '+919876543211',
    passwordHash: bcrypt.hashSync('Seller@123', 10),
    role: 'SELLER',
    storeId: 'store-apex-1',
    createdAt: new Date('2026-01-05').toISOString(),
    updatedAt: new Date('2026-01-05').toISOString()
  },
  {
    id: 'u-seller-2',
    name: 'Urban Threads Studio',
    email: 'seller@urbanthreads.com',
    phone: '+919876543212',
    passwordHash: bcrypt.hashSync('Seller@123', 10),
    role: 'SELLER',
    storeId: 'store-urban-2',
    createdAt: new Date('2026-01-10').toISOString(),
    updatedAt: new Date('2026-01-10').toISOString()
  },
  {
    id: 'u-seller-3',
    name: 'HomeCraft Living',
    email: 'seller@homecraft.com',
    phone: '+919876543213',
    passwordHash: bcrypt.hashSync('Seller@123', 10),
    role: 'SELLER',
    storeId: 'store-homecraft-3',
    createdAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-01-15').toISOString()
  },
  {
    id: 'u-customer-1',
    name: 'Rahul Sharma',
    email: 'customer@gmail.com',
    phone: '+919812345678',
    passwordHash: bcrypt.hashSync('Customer@123', 10),
    role: 'CUSTOMER',
    createdAt: new Date('2026-02-01').toISOString(),
    updatedAt: new Date('2026-02-01').toISOString()
  }
];

export const seedStores: Store[] = [
  {
    id: 'store-apex-1',
    userId: 'u-seller-1',
    name: 'Apex Digital Hub',
    slug: 'apex-digital-hub',
    description: 'Authorized retailer for premium smartphones, audio gears, and smart wearables.',
    logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=400&fit=crop',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    bankAccount: {
      accountName: 'Apex Digital Hub Pvt Ltd',
      accountNumber: '918273645019',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank'
    },
    kycDocuments: {
      panCardUrl: 'https://placehold.co/600x400/png?text=PAN+Card',
      gstCertificateUrl: 'https://placehold.co/600x400/png?text=GST+Certificate'
    },
    kycStatus: 'APPROVED',
    status: 'ACTIVE',
    commissionRate: 8.5,
    balance: 45200.0,
    totalEarnings: 215400.0,
    rating: 4.8,
    totalReviews: 124,
    createdAt: new Date('2026-01-05').toISOString(),
    updatedAt: new Date('2026-01-05').toISOString()
  },
  {
    id: 'store-urban-2',
    userId: 'u-seller-2',
    name: 'Urban Threads Co.',
    slug: 'urban-threads-co',
    description: 'Contemporary streetwear, curated cotton wear, and minimalist daily fashion.',
    logo: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
    gstin: '27AABCT9988H1Z2',
    pan: 'AABCT9988H',
    bankAccount: {
      accountName: 'Urban Threads Apparel',
      accountNumber: '112233445566',
      ifsc: 'ICIC0005678',
      bankName: 'ICICI Bank'
    },
    kycDocuments: {
      panCardUrl: 'https://placehold.co/600x400/png?text=PAN+Card',
      gstCertificateUrl: 'https://placehold.co/600x400/png?text=GST+Certificate'
    },
    kycStatus: 'APPROVED',
    status: 'ACTIVE',
    commissionRate: 12.0,
    balance: 18900.0,
    totalEarnings: 98400.0,
    rating: 4.6,
    totalReviews: 89,
    createdAt: new Date('2026-01-10').toISOString(),
    updatedAt: new Date('2026-01-10').toISOString()
  },
  {
    id: 'store-homecraft-3',
    userId: 'u-seller-3',
    name: 'HomeCraft Essentials',
    slug: 'homecraft-essentials',
    description: 'Handcrafted artisan furniture, kitchenware, and modern interior decor items.',
    logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=400&fit=crop',
    gstin: '33AAACM4321K1Z9',
    pan: 'AAACM4321K',
    bankAccount: {
      accountName: 'HomeCraft Living LLP',
      accountNumber: '998877665544',
      ifsc: 'SBIN0008899',
      bankName: 'State Bank of India'
    },
    kycDocuments: {
      panCardUrl: 'https://placehold.co/600x400/png?text=PAN+Card',
      gstCertificateUrl: 'https://placehold.co/600x400/png?text=GST+Certificate'
    },
    kycStatus: 'APPROVED',
    status: 'ACTIVE',
    commissionRate: 10.0,
    balance: 31000.0,
    totalEarnings: 142000.0,
    rating: 4.9,
    totalReviews: 64,
    createdAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-01-15').toISOString()
  }
];

export const seedCategories: Category[] = [
  {
    id: 'cat-electronics',
    name: 'Electronics & Gadgets',
    slug: 'electronics',
    description: 'Smartphones, audio, smart watches, and computer accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&fit=crop',
    isActive: true,
    commissionRate: 8.0
  },
  {
    id: 'cat-fashion',
    name: 'Fashion & Apparel',
    slug: 'fashion',
    description: 'Men and women clothing, shoes, bags, and modern accessories',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&fit=crop',
    isActive: true,
    commissionRate: 12.0
  },
  {
    id: 'cat-home',
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Furniture, kitchen decor, modern lighting, and cozy essentials',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500&fit=crop',
    isActive: true,
    commissionRate: 10.0
  },
  {
    id: 'cat-footwear',
    name: 'Footwear & Sneakers',
    slug: 'footwear',
    description: 'Running sneakers, formal shoes, sandals, and sports gear',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&fit=crop',
    isActive: true,
    commissionRate: 11.0
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Personal Care',
    slug: 'beauty',
    description: 'Skincare, fragrances, grooming kits, and organic wellness',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&fit=crop',
    isActive: true,
    commissionRate: 10.0
  }
];

export const seedBrands: Brand[] = [
  { id: 'b-apple', name: 'Apple', slug: 'apple', logo: 'https://placehold.co/100x40/png?text=Apple', isActive: true },
  { id: 'b-sony', name: 'Sony', slug: 'sony', logo: 'https://placehold.co/100x40/png?text=Sony', isActive: true },
  { id: 'b-nike', name: 'Nike', slug: 'nike', logo: 'https://placehold.co/100x40/png?text=Nike', isActive: true },
  { id: 'b-zara', name: 'Zara', slug: 'zara', logo: 'https://placehold.co/100x40/png?text=Zara', isActive: true },
  { id: 'b-ikea', name: 'IKEA', slug: 'ikea', logo: 'https://placehold.co/100x40/png?text=IKEA', isActive: true }
];

export const seedProducts: Product[] = [
  {
    id: 'prod-headphones-pro',
    storeId: 'store-apex-1',
    storeName: 'Apex Digital Hub',
    categoryId: 'cat-electronics',
    categoryName: 'Electronics & Gadgets',
    brand: 'Sony',
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    slug: 'sony-wh1000xm5-wireless-headphones',
    description: 'Industry-leading noise cancellation with two processors and 8 microphones. Up to 30-hour battery life with quick charging. Crystal clear hands-free calling with 4 beamforming microphones.',
    shortDescription: 'Active Noise Canceling Bluetooth 5.2 Over-Ear Headphones with 30-hr battery.',
    basePrice: 29990,
    salePrice: 24990,
    stock: 45,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&fit=crop',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.9,
    numReviews: 248,
    isFeatured: true,
    tags: ['electronics', 'headphones', 'bluetooth', 'audio', 'anc'],
    attributes: [
      { key: 'Color', value: 'Silver / Black' },
      { key: 'Battery', value: '30 Hours' },
      { key: 'Connectivity', value: 'Bluetooth 5.2' }
    ],
    variants: [
      {
        id: 'var-hp-silver',
        productId: 'prod-headphones-pro',
        title: 'Silver Edition',
        sku: 'SNY-XM5-SLV',
        price: 24990,
        stock: 20,
        attributes: { Color: 'Silver' }
      },
      {
        id: 'var-hp-black',
        productId: 'prod-headphones-pro',
        title: 'Midnight Black',
        sku: 'SNY-XM5-BLK',
        price: 24990,
        stock: 25,
        attributes: { Color: 'Black' }
      }
    ],
    createdAt: new Date('2026-02-01').toISOString(),
    updatedAt: new Date('2026-02-01').toISOString()
  },
  {
    id: 'prod-smartwatch-ultra',
    storeId: 'store-apex-1',
    storeName: 'Apex Digital Hub',
    categoryId: 'cat-electronics',
    categoryName: 'Electronics & Gadgets',
    brand: 'Apple',
    title: 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium',
    slug: 'apple-watch-ultra-2-titanium',
    description: 'Rugged and capable smartwatch designed for endurance athletes, outdoor adventurers, and water sports enthusiasts. Aerospace-grade 49mm titanium case and precision dual-frequency GPS.',
    shortDescription: '49mm Titanium case with Sapphire front crystal and Precision dual-frequency GPS.',
    basePrice: 89900,
    salePrice: 79900,
    stock: 18,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&fit=crop',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.8,
    numReviews: 112,
    isFeatured: true,
    tags: ['smartwatch', 'apple', 'fitness', 'titanium', 'wearables'],
    attributes: [
      { key: 'Case Size', value: '49mm' },
      { key: 'Material', value: 'Titanium' },
      { key: 'Water Resistance', value: '100m' }
    ],
    variants: [
      {
        id: 'var-aw-orange',
        productId: 'prod-smartwatch-ultra',
        title: 'Orange Ocean Band',
        sku: 'APL-W-ORG',
        price: 79900,
        stock: 8,
        attributes: { Band: 'Ocean Orange' }
      },
      {
        id: 'var-aw-blue',
        productId: 'prod-smartwatch-ultra',
        title: 'Blue Alpine Loop',
        sku: 'APL-W-BLU',
        price: 79900,
        stock: 10,
        attributes: { Band: 'Alpine Blue' }
      }
    ],
    createdAt: new Date('2026-02-05').toISOString(),
    updatedAt: new Date('2026-02-05').toISOString()
  },
  {
    id: 'prod-sneakers-red',
    storeId: 'store-urban-2',
    storeName: 'Urban Threads Co.',
    categoryId: 'cat-footwear',
    categoryName: 'Footwear & Sneakers',
    brand: 'Nike',
    title: 'Nike Air Max 270 Performance Running Shoes',
    slug: 'nike-air-max-270-red',
    description: 'Nike Air Max 270 delivers unrivaled, all-day comfort. The sleek, running-inspired design roots you to Nike heritage with an oversized Max Air unit in the heel.',
    shortDescription: 'Breathable engineered mesh upper with oversized Max Air 270 heel unit.',
    basePrice: 13995,
    salePrice: 9995,
    stock: 60,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&fit=crop',
      'https://images.unsplash.com/photo-1551107696-a4b085a6d91a?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.7,
    numReviews: 320,
    isFeatured: true,
    tags: ['shoes', 'sneakers', 'nike', 'running', 'sportswear'],
    attributes: [
      { key: 'Upper Material', value: 'Engineered Mesh' },
      { key: 'Sole', value: 'Rubber Air Max' }
    ],
    variants: [
      {
        id: 'var-sneaker-uk8',
        productId: 'prod-sneakers-red',
        title: 'UK 8 / Crimson Red',
        sku: 'NKE-270-UK8',
        price: 9995,
        stock: 20,
        attributes: { Size: 'UK 8', Color: 'Crimson Red' }
      },
      {
        id: 'var-sneaker-uk9',
        productId: 'prod-sneakers-red',
        title: 'UK 9 / Crimson Red',
        sku: 'NKE-270-UK9',
        price: 9995,
        stock: 25,
        attributes: { Size: 'UK 9', Color: 'Crimson Red' }
      },
      {
        id: 'var-sneaker-uk10',
        productId: 'prod-sneakers-red',
        title: 'UK 10 / Crimson Red',
        sku: 'NKE-270-UK10',
        price: 9995,
        stock: 15,
        attributes: { Size: 'UK 10', Color: 'Crimson Red' }
      }
    ],
    createdAt: new Date('2026-02-10').toISOString(),
    updatedAt: new Date('2026-02-10').toISOString()
  },
  {
    id: 'prod-hoodie-cotton',
    storeId: 'store-urban-2',
    storeName: 'Urban Threads Co.',
    categoryId: 'cat-fashion',
    categoryName: 'Fashion & Apparel',
    brand: 'Zara',
    title: 'Oversized Heavyweight Organic Cotton Hoodie',
    slug: 'oversized-heavyweight-organic-hoodie',
    description: 'Crafted from 100% 450 GSM French Terry organic cotton. Relaxed, dropped shoulder silhouette with kangaroo pocket and double-lined hood.',
    shortDescription: '450 GSM luxury combed organic cotton pullover hoodie.',
    basePrice: 3499,
    salePrice: 2299,
    stock: 90,
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&fit=crop',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.6,
    numReviews: 95,
    isFeatured: false,
    tags: ['hoodie', 'apparel', 'streetwear', 'cotton', 'unisex'],
    attributes: [
      { key: 'Material', value: '100% Organic Cotton' },
      { key: 'Fit', value: 'Oversized' }
    ],
    variants: [
      {
        id: 'var-hd-m-beige',
        productId: 'prod-hoodie-cotton',
        title: 'Beige / Medium',
        sku: 'UBT-HD-M-BEG',
        price: 2299,
        stock: 30,
        attributes: { Size: 'M', Color: 'Oatmeal Beige' }
      },
      {
        id: 'var-hd-l-beige',
        productId: 'prod-hoodie-cotton',
        title: 'Beige / Large',
        sku: 'UBT-HD-L-BEG',
        price: 2299,
        stock: 35,
        attributes: { Size: 'L', Color: 'Oatmeal Beige' }
      }
    ],
    createdAt: new Date('2026-02-12').toISOString(),
    updatedAt: new Date('2026-02-12').toISOString()
  },
  {
    id: 'prod-armchair-velvet',
    storeId: 'store-homecraft-3',
    storeName: 'HomeCraft Essentials',
    categoryId: 'cat-home',
    categoryName: 'Home & Living',
    brand: 'IKEA',
    title: 'Mid-Century Velvet Lounge Armchair with Walnut Legs',
    slug: 'mid-century-velvet-lounge-armchair',
    description: 'Bring timeless retro aesthetics to your living room. Ergonomically contoured frame upholstered in plush water-repellent emerald velvet supported by kiln-dried solid walnut wood tapered legs.',
    shortDescription: 'Premium emerald velvet accent armchair with solid walnut wooden legs.',
    basePrice: 18999,
    salePrice: 14499,
    stock: 12,
    images: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.9,
    numReviews: 42,
    isFeatured: true,
    tags: ['furniture', 'armchair', 'living room', 'velvet', 'decor'],
    attributes: [
      { key: 'Material', value: 'Velvet Fabric & Solid Walnut Wood' },
      { key: 'Dimensions', value: '82cm x 76cm x 88cm' }
    ],
    variants: [
      {
        id: 'var-ac-emerald',
        productId: 'prod-armchair-velvet',
        title: 'Emerald Green',
        sku: 'HMC-CHR-EMR',
        price: 14499,
        stock: 6,
        attributes: { Color: 'Emerald Green' }
      },
      {
        id: 'var-ac-mustard',
        productId: 'prod-armchair-velvet',
        title: 'Mustard Yellow',
        sku: 'HMC-CHR-MST',
        price: 14499,
        stock: 6,
        attributes: { Color: 'Mustard Yellow' }
      }
    ],
    createdAt: new Date('2026-02-15').toISOString(),
    updatedAt: new Date('2026-02-15').toISOString()
  },
  {
    id: 'prod-ceramic-vases',
    storeId: 'store-homecraft-3',
    storeName: 'HomeCraft Essentials',
    categoryId: 'cat-home',
    categoryName: 'Home & Living',
    brand: 'IKEA',
    title: 'Nordic Minimalist Matte Ceramic Vase Set (3 Pieces)',
    slug: 'nordic-minimalist-matte-ceramic-vase-set',
    description: 'Hand-thrown matte terracotta and ceramic vase collection. Distinct geometric silhouettes designed to showcase dry florals or make a statement on your dining table.',
    shortDescription: 'Set of 3 artistic matte textured ceramic vases for modern interior styling.',
    basePrice: 2999,
    salePrice: 1999,
    stock: 40,
    images: [
      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&fit=crop',
      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&fit=crop'
    ],
    status: 'ACTIVE',
    rating: 4.8,
    numReviews: 68,
    isFeatured: false,
    tags: ['decor', 'ceramic', 'vase', 'interior', 'handmade'],
    attributes: [
      { key: 'Material', value: 'Stoneware Ceramic' },
      { key: 'Pieces', value: '3' }
    ],
    variants: [],
    createdAt: new Date('2026-02-18').toISOString(),
    updatedAt: new Date('2026-02-18').toISOString()
  }
];

export const seedCoupons: Coupon[] = [
  {
    id: 'cpn-welcome',
    code: 'WELCOME10',
    description: 'Get 10% off on your first order up to ₹1,000',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderAmount: 1000,
    maxDiscount: 1000,
    expiresAt: '2028-12-31T23:59:59.000Z',
    isActive: true,
    usageCount: 45
  },
  {
    id: 'cpn-flat500',
    code: 'FLAT500',
    description: 'Flat ₹500 off on shopping above ₹3,000',
    discountType: 'FLAT',
    discountValue: 500,
    minOrderAmount: 3000,
    expiresAt: '2028-12-31T23:59:59.000Z',
    isActive: true,
    usageCount: 28
  },
  {
    id: 'cpn-superdeal',
    code: 'FESTIVE20',
    description: 'Festive mega sale: 20% discount on all orders above ₹5,000',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderAmount: 5000,
    maxDiscount: 2500,
    expiresAt: '2028-12-31T23:59:59.000Z',
    isActive: true,
    usageCount: 19
  }
];

export const seedReviews: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-headphones-pro',
    customerId: 'u-customer-1',
    customerName: 'Rahul Sharma',
    rating: 5,
    title: 'Incredible Sound & Noise Cancellation!',
    comment: 'The noise cancellation is unmatched in train or flight environments. Soundstage is deep, and the battery lasts multiple workdays with ease. Highly recommended!',
    verifiedPurchase: true,
    status: 'APPROVED',
    createdAt: new Date('2026-02-20').toISOString()
  },
  {
    id: 'rev-2',
    productId: 'prod-sneakers-red',
    customerId: 'u-customer-1',
    customerName: 'Rahul Sharma',
    rating: 5,
    title: 'Ultra comfortable for all-day walks',
    comment: 'Fit is true to size (UK 9). Cushioning on the heel unit feels bouncy and lightweight. Look even better in person!',
    verifiedPurchase: true,
    status: 'APPROVED',
    createdAt: new Date('2026-02-24').toISOString()
  }
];

export const seedAddresses: Address[] = [
  {
    id: 'addr-1',
    userId: 'u-customer-1',
    fullName: 'Rahul Sharma',
    phone: '+919812345678',
    addressLine1: 'Flat 402, Green Glen Layout, Bellandur',
    addressLine2: 'Near Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    country: 'India',
    isDefault: true
  }
];
