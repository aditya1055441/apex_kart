import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  sendOtp,
  verifyOtpAndLogin,
  getCurrentUser,
  getUserAddresses,
  addAddress,
  sendRegistrationCode,
  getRegistrationCodeStatus,
  verifyRegistrationCode,
  completeRegistration
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Standard Auth
router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);

// Multi-step verified registration (Email/Phone -> Random code -> Name & DOB -> Register)
router.post('/register/send-code', sendRegistrationCode);
router.get('/register/code-status', getRegistrationCodeStatus);
router.post('/register/verify-code', verifyRegistrationCode);
router.post('/register/complete', completeRegistration);

// Protected user routes
router.get('/me', authenticate, getCurrentUser);
router.get('/addresses', authenticate, getUserAddresses);
router.post('/addresses', authenticate, addAddress);

export default router;
