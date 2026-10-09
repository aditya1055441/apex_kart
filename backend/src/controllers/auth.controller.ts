import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { config } from '../config';
import { User, Address } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

// In-memory OTP store for phone/email verification
const otpStore = new Map<string, { code: string; expiresAt: number; verified?: boolean }>();

export const validatePasswordComplexity = (password?: string): { isValid: boolean; message?: string } => {
  if (!password || typeof password !== 'string' || !password.trim()) {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z)' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z)' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*...)' };
  }
  return { isValid: true };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, dob } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const pwdValidation = validatePasswordComplexity(password);
    if (!pwdValidation.isValid) {
      return res.status(400).json({ success: false, message: pwdValidation.message });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const assignedRole = role === 'SELLER' ? 'SELLER' : 'CUSTOMER';
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser: User = {
      id: `u-${uuidv4().substring(0, 8)}`,
      name,
      email,
      phone,
      dob: dob || undefined,
      passwordHash,
      role: assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, storeId: user.storeId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phoneOrEmail } = req.body;
    if (!phoneOrEmail) {
      return res.status(400).json({ success: false, message: 'Phone or email is required' });
    }

    // Generate 6 digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phoneOrEmail, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    console.log(`[OTP SERVICE] Generated OTP for ${phoneOrEmail}: ${code}`);

    return res.json({
      success: true,
      message: `OTP sent successfully to ${phoneOrEmail}`,
      otpDebug: config.nodeEnv === 'development' ? code : undefined
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyOtpAndLogin = async (req: Request, res: Response) => {
  try {
    const { phoneOrEmail, otp, name } = req.body;
    if (!phoneOrEmail || !otp) {
      return res.status(400).json({ success: false, message: 'Phone/email and OTP required' });
    }

    const record = otpStore.get(phoneOrEmail);
    if (!record || record.code !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // OTP Verified, remove it
    otpStore.delete(phoneOrEmail);

    let user = await db.findUserByEmail(phoneOrEmail);
    if (!user) {
      // Find by phone
      user = await db.findUserByPhone(phoneOrEmail);
    }

    if (!user) {
      // Create a quick customer user
      const isEmail = phoneOrEmail.includes('@');
      user = {
        id: `u-${uuidv4().substring(0, 8)}`,
        name: name || (isEmail ? phoneOrEmail.split('@')[0] : 'Customer'),
        email: isEmail ? phoneOrEmail : `${phoneOrEmail}@phone.marketplace.com`,
        phone: isEmail ? '+919999999999' : phoneOrEmail,
        passwordHash: await bcrypt.hash(uuidv4(), 10),
        role: 'CUSTOMER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.createUser(user);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, storeId: user.storeId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Verified successfully',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let store = undefined;
    if (user.storeId) {
      store = await db.findStoreById(user.storeId);
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      success: true,
      user: safeUser,
      store
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserAddresses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const addresses = await db.getUserAddresses(req.user!.id);
    return res.json({ success: true, addresses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

    if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({ success: false, message: 'All mandatory address fields required' });
    }

    const newAddress: Address = {
      id: `addr-${uuidv4().substring(0, 8)}`,
      userId: req.user!.id,
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country: country || 'India',
      isDefault: Boolean(isDefault)
    };

    const saved = await db.createAddress(newAddress);
    return res.status(201).json({ success: true, address: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const sendRegistrationCode = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, message: 'Email or mobile number is required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const isEmail = cleanId.includes('@');

    // Check if account already exists
    let existingUser = await db.findUserByEmail(cleanId);
    if (!existingUser) {
      existingUser = await db.findUserByPhone(cleanId);
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this ' + (isEmail ? 'email address' : 'mobile number') + ' already exists. Please sign in instead.'
      });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanId, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      verified: false
    });

    console.log(`[VERIFICATION SERVICE] Sent random registration code ${code} to ${cleanId}`);

    return res.json({
      success: true,
      message: `Verification code sent to ${cleanId}`,
      debugCode: code
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyRegistrationCode = async (req: Request, res: Response) => {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code) {
      return res.status(400).json({ success: false, message: 'Identifier and verification code are required' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const record = otpStore.get(cleanId);

    if (!record || record.code !== code.trim() || Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    record.verified = true;
    otpStore.set(cleanId, record);

    return res.json({
      success: true,
      message: 'Code verified successfully. Please enter your name and date of birth.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const completeRegistration = async (req: Request, res: Response) => {
  try {
    const { identifier, code, fullName, dob, password, role } = req.body;

    if (!identifier || !fullName || !dob) {
      return res.status(400).json({ success: false, message: 'Identifier, full name, and date of birth are required' });
    }

    if (fullName.includes('@')) {
      return res.status(400).json({ success: false, message: 'Full name cannot be an email address' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const record = otpStore.get(cleanId);

    if (!record || (!record.verified && record.code !== code)) {
      return res.status(400).json({ success: false, message: 'Please verify the code sent to your email or mobile number first' });
    }

    const existing = (await db.findUserByEmail(cleanId)) || (await db.findUserByPhone(cleanId));
    if (existing) {
      return res.status(400).json({ success: false, message: 'Account already exists' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const pwdValidation = validatePasswordComplexity(password);
    if (!pwdValidation.isValid) {
      return res.status(400).json({ success: false, message: pwdValidation.message });
    }

    const isEmail = cleanId.includes('@');
    const assignedRole = role === 'SELLER' ? 'SELLER' : 'CUSTOMER';
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser: User = {
      id: `u-${uuidv4().substring(0, 8)}`,
      name: fullName.trim(),
      email: isEmail ? cleanId : `${cleanId}@phone.marketplace.com`,
      phone: isEmail ? '+919999999999' : cleanId,
      dob: dob.trim(),
      passwordHash,
      role: assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.createUser(newUser);
    otpStore.delete(cleanId);

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Registration completed successfully!',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
