import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { generateDevToken } from '../../middleware/auth0';
import { createOtp, verifyOtp, sendOtp } from './otp.service';

export const syncUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { auth0Id, name, email, picture } = req.body;
    const sub = (req as any).user?.auth0Id || auth0Id;

    if (!sub) {
      return res.status(400).json({ success: false, error: 'auth0Id or valid token is required' });
    }

    const user = await AuthService.syncAuth0User({
      auth0Id: sub,
      name: (req as any).user?.name || name,
      email: (req as any).user?.email || email,
      picture,
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const createGuestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const guest = await AuthService.createGuestUser(name || 'Guest');
    res.json({ success: true, data: guest });
  } catch (err) {
    next(err);
  }
};

export const getMeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user?.id && !user?.auth0Id) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    let profile = null;
    if (user.id) {
      profile = await AuthService.getUserProfile(user.id);
    } else if (user.auth0Id) {
      profile = await AuthService.syncAuth0User({
        auth0Id: user.auth0Id,
        name: user.name,
        email: user.email,
      });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const devTokenHandler = async (req: Request, res: Response) => {
  const { id = 'dev-user-1', name = 'Dev User', email = 'dev@splitit.app' } = req.body;
  const token = generateDevToken({ id, name, email });
  res.json({ success: true, token });
};

// ── Phone OTP handlers ───────────────────────────────────────────────────────

export const requestOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit Indian mobile number.',
      });
    }

    const cleanPhone = String(phone).replace(/\s/g, '');
    const otp = createOtp(cleanPhone);
    await sendOtp(cleanPhone, otp);

    res.json({
      success: true,
      message: `OTP sent to +91-${cleanPhone}`,
      // Include OTP in dev for testing purposes
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp, name } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'phone and otp are required.' });
    }

    const cleanPhone = String(phone).replace(/\s/g, '');
    const result = verifyOtp(cleanPhone, String(otp));

    if (!result.valid) {
      return res.status(401).json({ success: false, error: result.reason });
    }

    // Find or create user by phone
    const { user, token } = await AuthService.findOrCreateByPhone(cleanPhone, name);

    res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
};
