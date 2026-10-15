"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = exports.generateDevToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const config_1 = require("../config");
// Dev secret for testing when Auth0 credentials are not set
const DEV_SECRET = 'splitit-dev-jwt-secret-2026';
const generateDevToken = (payload) => {
    return jsonwebtoken_1.default.sign({ ...payload, sub: `auth0|${payload.id}`, isGuest: false }, DEV_SECRET, {
        expiresIn: '7d',
    });
};
exports.generateDevToken = generateDevToken;
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const guestId = req.headers['x-guest-id'];
    const guestName = req.headers['x-guest-name'];
    // 1. Check if token is provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // If Auth0 domain is configured, verify against JWKS
        if (config_1.config.auth0.domain && config_1.config.auth0.audience) {
            try {
                const client = (0, jwks_rsa_1.default)({
                    jwksUri: `https://${config_1.config.auth0.domain}/.well-known/jwks.json`,
                    cache: true,
                    rateLimit: true,
                });
                const decodedHeader = jsonwebtoken_1.default.decode(token, { complete: true });
                if (!decodedHeader || !decodedHeader.header.kid) {
                    return res.status(401).json({ success: false, error: 'Invalid token header' });
                }
                const key = await client.getSigningKey(decodedHeader.header.kid);
                const signingKey = key.getPublicKey();
                const verified = jsonwebtoken_1.default.verify(token, signingKey, {
                    audience: config_1.config.auth0.audience,
                    issuer: `https://${config_1.config.auth0.domain}/`,
                    algorithms: ['RS256'],
                });
                req.user = {
                    auth0Id: verified.sub,
                    email: verified.email,
                    name: verified.name || verified.nickname || 'User',
                    isGuest: false,
                };
                return next();
            }
            catch (err) {
                console.error('Auth0 token verification failed:', err);
                return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Auth0 token' });
            }
        }
        else {
            // Dev mode: verify with dev secret or decode
            try {
                const verified = jsonwebtoken_1.default.verify(token, DEV_SECRET);
                req.user = {
                    id: verified.id,
                    auth0Id: verified.sub,
                    email: verified.email,
                    name: verified.name,
                    isGuest: false,
                };
                return next();
            }
            catch {
                // Fallback: decode directly for flexible local testing
                const decoded = jsonwebtoken_1.default.decode(token);
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
exports.requireAuth = requireAuth;
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const guestId = req.headers['x-guest-id'];
    const guestName = req.headers['x-guest-name'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded) {
                req.user = {
                    id: decoded.id || decoded.sub,
                    auth0Id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name || 'User',
                    isGuest: false,
                };
            }
        }
        catch {
            // Continue without user
        }
    }
    else if (guestId) {
        req.user = {
            id: guestId,
            name: guestName || 'Guest',
            isGuest: true,
        };
    }
    next();
};
exports.optionalAuth = optionalAuth;
