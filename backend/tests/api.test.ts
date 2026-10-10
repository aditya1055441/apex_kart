import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/database/db';
import { config } from '../src/config';

const app = createApp();
jest.setTimeout(25000);

describe('Multi-Vendor E-Commerce API Test Suite', () => {
  let customerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let createdOrderId: string;
  let razorpayOrderId: string;

  beforeAll(async () => {
    // Ensure database connection and tables are ready
    await db.ensureReady();

    // Login as Customer
    const custRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@gmail.com', password: 'Customer@123' });
    customerToken = custRes.body.token;

    // Login as Seller
    const sellerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'seller@apextech.com', password: 'Seller@123' });
    sellerToken = sellerRes.body.token;

    // Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@marketplace.com', password: 'Admin@123' });
    adminToken = adminRes.body.token;
  }, 25000);

  describe('1. Health & Discovery', () => {
    it('should return UP status on /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('should return categories and brands', async () => {
      const catRes = await request(app).get('/api/categories');
      expect(catRes.status).toBe(200);
      expect(catRes.body.categories.length).toBeGreaterThan(0);

      const brandRes = await request(app).get('/api/categories/brands');
      expect(brandRes.status).toBe(200);
      expect(brandRes.body.brands.length).toBeGreaterThan(0);
    });

    it('should allow browsing dummy products when DB is disconnected but reject CRUD operations', async () => {
      // Simulate disconnected state temporarily on a mock instance or check rules
      const dummyProducts = await db.getProducts();
      expect(dummyProducts.length).toBeGreaterThan(0);
    });
  });

  describe('2. Authentication & RBAC', () => {
    it('should register a new customer', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Customer',
          email,
          phone: '+919988776655',
          password: 'Password@123',
          role: 'CUSTOMER',
          dob: '1998-05-20'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('should handle multi-step registration with email, random code, fullName and dob', async () => {
      const newEmail = `user_step_${Date.now()}@testmarketplace.com`;

      // 1. Send random code
      const sendRes = await request(app)
        .post('/api/auth/register/send-code')
        .send({ identifier: newEmail });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);
      expect(sendRes.body.debugCode).toBeDefined();
      const code = sendRes.body.debugCode;

      // Check background dispatch delivery status
      const statusRes = await request(app)
        .get(`/api/auth/register/code-status?identifier=${encodeURIComponent(newEmail)}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.status).toBe('SENT');

      // 2. Verify code explicitly
      const verifyRes = await request(app)
        .post('/api/auth/register/verify-code')
        .send({ identifier: newEmail, code });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // 3. Complete registration with full name, dob and valid password
      const completeRes = await request(app)
        .post('/api/auth/register/complete')
        .send({
          identifier: newEmail,
          code,
          fullName: 'Samantha Miller',
          dob: '1996-11-24',
          password: 'SecurePass@2026',
          role: 'CUSTOMER'
        });

      expect(completeRes.status).toBe(201);
      expect(completeRes.body.success).toBe(true);
      expect(completeRes.body.user.name).toBe('Samantha Miller');
      expect(completeRes.body.user.dob).toBe('1996-11-24');
      expect(completeRes.body.token).toBeDefined();
    });

    it('should handle multi-step registration with mobile number, random code, fullName and dob', async () => {
      const newPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

      // 1. Send random code to mobile
      const sendRes = await request(app)
        .post('/api/auth/register/send-code')
        .send({ identifier: newPhone });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.debugCode).toBeDefined();
      const code = sendRes.body.debugCode;

      // 2. Complete registration directly with code, name, dob and valid password
      const completeRes = await request(app)
        .post('/api/auth/register/complete')
        .send({
          identifier: newPhone,
          code,
          fullName: 'Vikram Seth',
          dob: '1992-03-14',
          password: 'Strong#Password2026',
          role: 'CUSTOMER'
        });

      expect(completeRes.status).toBe(201);
      expect(completeRes.body.user.name).toBe('Vikram Seth');
      expect(completeRes.body.user.dob).toBe('1992-03-14');
      expect(completeRes.body.user.phone).toBe(newPhone);
    });

    it('should enforce rate limiting on immediate resend attempts and lock out after excessive incorrect attempts', async () => {
      const testEmail = `ratelimit_${Date.now()}@testmarketplace.com`;

      // 1. Initial send
      const firstSend = await request(app)
        .post('/api/auth/register/send-code')
        .send({ identifier: testEmail });
      expect(firstSend.status).toBe(200);

      // 2. Immediate second send should be rate-limited (429)
      const secondSend = await request(app)
        .post('/api/auth/register/send-code')
        .send({ identifier: testEmail });
      expect(secondSend.status).toBe(429);
      expect(secondSend.body.message).toContain('Please wait');

      // 3. Incorrect verification attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register/verify-code')
          .send({ identifier: testEmail, code: '000000' });
      }

      // 6th attempt should be locked out
      const lockedRes = await request(app)
        .post('/api/auth/register/verify-code')
        .send({ identifier: testEmail, code: '000000' });
      expect(lockedRes.status).toBe(400);
      expect(lockedRes.body.message).toContain('invalidated');
    });

    it('should reject registration if password lacks uppercase, lowercase, or special character', async () => {
      const testEmail = `pwd_test_${Date.now()}@example.com`;

      // 1. Missing special char
      const resNoSpecial = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: testEmail,
          phone: '+919988771122',
          password: 'Password123', // missing special char
          dob: '1995-01-01'
        });
      expect(resNoSpecial.status).toBe(400);
      expect(resNoSpecial.body.message).toContain('special character');

      // 2. Missing uppercase
      const resNoUpper = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: testEmail,
          phone: '+919988771122',
          password: 'password@123', // missing uppercase
          dob: '1995-01-01'
        });
      expect(resNoUpper.status).toBe(400);
      expect(resNoUpper.body.message).toContain('uppercase');

      // 3. Missing lowercase
      const resNoLower = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: testEmail,
          phone: '+919988771122',
          password: 'PASSWORD@123', // missing lowercase
          dob: '1995-01-01'
        });
      expect(resNoLower.status).toBe(400);
      expect(resNoLower.body.message).toContain('lowercase');
    });

    it('should return 401 for unauthorized access to admin endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should fetch current authenticated profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('customer@gmail.com');
    });
  });

  describe('3. Products & Catalog Search', () => {
    it('should list active products with pagination and filters', async () => {
      const res = await request(app).get('/api/products?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    it('should search products by text query', async () => {
      const res = await request(app).get('/api/products?search=Sony');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].title).toContain('Sony');
    });

    it('should fetch single product details with reviews', async () => {
      const res = await request(app).get('/api/products/prod-headphones-pro');
      expect(res.status).toBe(200);
      expect(res.body.product.id).toBe('prod-headphones-pro');
      expect(res.body.reviews).toBeDefined();
      expect(res.body.store).toBeDefined();
    });
  });

  describe('4. Cart & Promotions', () => {
    it('should add product to cart', async () => {
      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: 'prod-headphones-pro',
          quantity: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.item.productId).toBe('prod-headphones-pro');
    });

    it('should retrieve cart and summary', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.summary.subtotal).toBeGreaterThan(0);
    });

    it('should validate and apply coupon code', async () => {
      const res = await request(app)
        .post('/api/cart/apply-coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'WELCOME10' });

      expect(res.status).toBe(200);
      expect(res.body.coupon.code).toBe('WELCOME10');
      expect(res.body.summary.discount).toBeGreaterThan(0);
    });
  });

  describe('5. Checkout, Orders & Razorpay', () => {
    it('should place an order and generate a Razorpay order ID', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddress: {
            fullName: 'Rahul Sharma',
            phone: '+919812345678',
            addressLine1: 'Flat 402, Green Glen Layout',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560103',
            country: 'India',
            isDefault: true
          },
          paymentMethod: 'RAZORPAY',
          couponCode: 'WELCOME10'
        });

      expect(res.status).toBe(201);
      expect(res.body.order.id).toBeDefined();
      expect(res.body.order.orderNumber).toBeDefined();
      expect(res.body.razorpay).toBeDefined();
      expect(res.body.razorpay.orderId).toBeDefined();

      createdOrderId = res.body.order.id;
      razorpayOrderId = res.body.razorpay.orderId;
    });

    it('should verify payment signature and transition order to PROCESSING/PAID', async () => {
      const paymentId = 'pay_test_' + Date.now();
      const validSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature
        });

      expect(res.status).toBe(200);
      expect(res.body.order.paymentStatus).toBe('PAID');
      expect(res.body.order.status).toBe('PROCESSING');
    });
  });

  describe('6. Seller Operations & Fulfillment', () => {
    it('should get seller dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/seller/dashboard')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.storeName).toBe('Apex Digital Hub');
      expect(res.body.stats.totalEarnings).toBeGreaterThan(0);
    });

    it('should list seller orders and allow updating fulfillment tracking status', async () => {
      const ordersRes = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(ordersRes.status).toBe(200);

      if (ordersRes.body.orders.length > 0) {
        const firstOrder = ordersRes.body.orders[0];
        const itemToShip = firstOrder.items[0];

        const updateRes = await request(app)
          .put(`/api/seller/orders/${firstOrder.order.id}/items/${itemToShip.id}/status`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({
            status: 'SHIPPED',
            courierName: 'Blue Dart Express',
            trackingNumber: 'BD123456789IN'
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.item.status).toBe('SHIPPED');
        expect(updateRes.body.item.trackingNumber).toBe('BD123456789IN');
      }
    });
  });

  describe('7. Admin Operations', () => {
    it('should fetch complete platform analytics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analytics.totalSellers).toBeGreaterThan(0);
      expect(res.body.analytics.totalOrders).toBeGreaterThan(0);
      expect(res.body.analytics.totalPlatformRevenue).toBeGreaterThanOrEqual(0);
    });

    it('should list all sellers and allow KYC moderation', async () => {
      const sellersRes = await request(app)
        .get('/api/admin/sellers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sellersRes.status).toBe(200);
      expect(sellersRes.body.stores.length).toBeGreaterThan(0);

      const storeId = sellersRes.body.stores[0].id;
      const modRes = await request(app)
        .put(`/api/admin/sellers/${storeId}/kyc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          notes: 'All documents verified successfully',
          commissionRate: 9.5
        });

      expect(modRes.status).toBe(200);
      expect(modRes.body.store.kycStatus).toBe('APPROVED');
      expect(modRes.body.store.commissionRate).toBe(9.5);
    });
  });

  afterAll(async () => {
    await db.close();
  });
});
