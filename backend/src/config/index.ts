import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Locate local .env file (for local development)
const envFilePath = fs.existsSync(path.resolve(process.cwd(), '.env'))
  ? path.resolve(process.cwd(), '.env')
  : (fs.existsSync(path.resolve(process.cwd(), 'backend/.env'))
      ? path.resolve(process.cwd(), 'backend/.env')
      : path.resolve(__dirname, '../../.env'));

// Parse local .env file into a dictionary if present
const envFile = fs.existsSync(envFilePath) ? dotenv.parse(fs.readFileSync(envFilePath)) : {};

/**
 * Checks process.env first (injected by Render server or OS environment).
 * If null, undefined, or empty, picks the value from the local .env file.
 */
const getEnv = (key: string, fallback: string = ''): string => {
  const value = process.env[key] || envFile[key] || fallback;
  if (!process.env[key] && value) {
    process.env[key] = value;
  }
  return value;
};

export const config = {
  // Server environment
  port: parseInt(getEnv('PORT', '5000'), 10),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Authentication & Security
  jwtSecret: getEnv('JWT_SECRET', 'super_secret_jwt_key_for_ecommerce_marketplace_2026'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),

  // PostgreSQL Database Connection
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://postgres:system@localhost:5432/ecommerce_marketplace'),
  corsOrigin: getEnv('CORS_ORIGIN', '*'),

  // Active Email Service: 'GmailSMTP' | 'Resend'
  emailService: getEnv('EMAIL_SERVICE', 'GmailSMTP'),

  // Gmail SMTP with Nodemailer
  gmail: {
    user: getEnv('GMAIL_USER'),
    appPassword: getEnv('GMAIL_APP_PASSWORD')
  },

  // Razorpay Payment Gateway
  razorpay: {
    keyId: getEnv('RAZORPAY_KEY_ID'),
    keySecret: getEnv('RAZORPAY_KEY_SECRET'),
    isSandbox: getEnv('RAZORPAY_SANDBOX') !== 'false'
  },

  // Resend API (Alternative Provider)
  resend: {
    apiKey: getEnv('RESEND_API_KEY'),
    fromEmail: getEnv('EMAIL_FROM') || getEnv('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
  },

  // Marketplace Economics
  defaultCommissionRate: 10.0 // 10% marketplace commission
};
