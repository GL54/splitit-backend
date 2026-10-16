import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { config } from '../config';

export interface AuthenticatedUser {
  id?: string;
  auth0Id?: string;
  email?: string;
  name?: string;
  isGuest: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Dev secret for testing when Auth0 credentials are not set
const DEV_SECRET = 'splitit-dev-jwt-secret-2026';

export const generateDevToken = (payload: {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}) => {
  return jwt.sign({ ...payload, sub: `auth0|${payload.id}`, isGuest: false }, DEV_SECRET, {
    expiresIn: '7d',
  });
};

function applyDevUser(req: Request, verified: any) {
  req.user = {
    id: verified.id || verified.sub,
    auth0Id: verified.sub,
    email: verified.email,
    name: verified.name || 'User',
    isGuest: false,
  };
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const guestId = req.headers['x-guest-id'] as string;
  const guestName = req.headers['x-guest-name'] as string;

  // 1. Check if token is provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // OTP / dev login issues an HS256 token. Accept it even when Auth0 is configured,
    // otherwise saving a UPI ID returns 401 after phone login.
    const decodedHeader: any = jwt.decode(token, { complete: true });
    const alg = decodedHeader?.header?.alg;
    if (!decodedHeader?.header?.kid || alg === 'HS256') {
      try {
        const verified: any = jwt.verify(token, DEV_SECRET);
        applyDevUser(req, verified);
        return next();
      } catch {
        if (!config.auth0.domain) {
          return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
        }
      }
    }

    // If Auth0 domain is configured, verify against JWKS
    if (config.auth0.domain && config.auth0.audience) {
      try {
        const client = jwksRsa({
          jwksUri: `https://${config.auth0.domain}/.well-known/jwks.json`,
          cache: true,
          rateLimit: true,
        });

        const decodedHeader: any = jwt.decode(token, { complete: true });
        if (!decodedHeader || !decodedHeader.header.kid) {
          return res.status(401).json({ success: false, error: 'Invalid token header' });
        }

        const key = await client.getSigningKey(decodedHeader.header.kid);
        const signingKey = key.getPublicKey();

        const verified: any = jwt.verify(token, signingKey, {
          audience: config.auth0.audience,
          issuer: `https://${config.auth0.domain}/`,
          algorithms: ['RS256'],
        });

        req.user = {
          auth0Id: verified.sub,
          email: verified.email,
          name: verified.name || verified.nickname || 'User',
          isGuest: false,
        };
        return next();
      } catch (err) {
        console.error('Auth0 token verification failed:', err);
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Auth0 token' });
      }
    } else {
      // Dev mode: verify with dev secret or decode
      try {
        const verified: any = jwt.verify(token, DEV_SECRET);
        req.user = {
          id: verified.id,
          auth0Id: verified.sub,
          email: verified.email,
          name: verified.name,
          isGuest: false,
        };
        return next();
      } catch {
        // Fallback: decode directly for flexible local testing
        const decoded: any = jwt.decode(token);
        if (decoded) {
          req.user = {
            id: decoded.id || decoded.sub,
            auth0Id: decoded.sub,
            email: decoded.email,
            name: decoded.name || 'User',
            isGuest: false,
          };
          return next();
        }
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      }
    }
  }

  // 2. Fallback to Guest Session if header provided
  if (guestId) {
    req.user = {
      id: guestId,
      name: guestName || 'Guest',
      isGuest: true,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Provide Authorization Bearer token or X-Guest-Id header.',
  });
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const guestId = req.headers['x-guest-id'] as string;
  const guestName = req.headers['x-guest-name'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.decode(token);
      if (decoded) {
        req.user = {
          id: decoded.id || decoded.sub,
          auth0Id: decoded.sub,
          email: decoded.email,
          name: decoded.name || 'User',
          isGuest: false,
        };
      }
    } catch {
      // Continue without user
    }
  } else if (guestId) {
    req.user = {
      id: guestId,
      name: guestName || 'Guest',
      isGuest: true,
    };
  }

  next();
};
