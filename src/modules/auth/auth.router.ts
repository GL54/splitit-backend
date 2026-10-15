import { Router } from 'express';
import {
  syncUserHandler,
  createGuestHandler,
  getMeHandler,
  devTokenHandler,
  requestOtpHandler,
  verifyOtpHandler,
} from './auth.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth0';

export const authRouter = Router();

authRouter.post('/sync', optionalAuth, syncUserHandler);
authRouter.post('/guest', createGuestHandler);
authRouter.get('/me', requireAuth, getMeHandler);
authRouter.post('/dev-token', devTokenHandler);

// ── Phone OTP Auth ──────────────────────────────────────────────────────────
authRouter.post('/otp/request', requestOtpHandler);   // POST { phone: "9876543210" }
authRouter.post('/otp/verify', verifyOtpHandler);     // POST { phone, otp }
