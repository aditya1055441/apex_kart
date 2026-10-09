import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Multi-Vendor E-Commerce Backend Server running on port ${config.port}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`💳 Razorpay Key: ${config.razorpay.keyId}`);
  console.log(`📦 Health Endpoint: http://localhost:${config.port}/api/health`);
  console.log(`====================================================`);
});
