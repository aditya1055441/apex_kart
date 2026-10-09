import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_for_ecommerce_marketplace_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:system@localhost:5432/ecommerce_marketplace',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TlHmBY5CY5RsrT',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'uhonCePTSwHWV7nvWpwHlhrU',
    isSandbox: process.env.RAZORPAY_SANDBOX !== 'false'
  },
  defaultCommissionRate: 10.0 // 10% marketplace commission
};
