import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../database/db';
import { UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    storeId?: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      role: UserRole;
      email: string;
      storeId?: string;
    };

    const user = await db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired user session' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      storeId: user.storeId
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Invalid token: ' + (err.message || 'Unauthorized') });
  }
};

export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const user = await db.findUserById(decoded.id);
      if (user) {
        req.user = {
          id: user.id,
          role: user.role,
          email: user.email,
          storeId: user.storeId
        };
      }
    }
  } catch (e) {
    // token verification failed or expired, proceed as guest
  }
  next();
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};
