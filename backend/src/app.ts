import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import sellerRoutes from './routes/seller.routes';
import adminRoutes from './routes/admin.routes';
import reviewRoutes from './routes/review.routes';
import { authenticate, AuthenticatedRequest } from './middleware/auth';
import { db } from './database/db';

export const createApp = () => {
  const app = express();

  // Middlewares
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      postgresConnected: db.getPostgresStatus(),
      version: '1.0.0'
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reviews', reviewRoutes);

  // Notification routes
  app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    const notifications = await db.getUserNotifications(req.user!.id);
    res.json({ success: true, notifications });
  });

  app.put('/api/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    await db.markNotificationAsRead(req.params.id);
    res.json({ success: true, message: 'Notification marked as read' });
  });

  // Serve static frontend in production if built assets exist
  const frontendDistPath = path.join(__dirname, '../public');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[SERVER ERROR]', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

  return app;
};
