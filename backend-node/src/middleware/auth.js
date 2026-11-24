import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/User.js';

export function createAccessToken(subject, role, expiresInMinutes = config.jwtAccessExpiresMinutes) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: String(subject),
      role,
      type: 'access',
      iat: now,
      exp: now + expiresInMinutes * 60,
    },
    config.jwtSecret,
    { algorithm: 'HS256' }
  );
}

export function createRefreshToken(subject, role, expiresInDays = config.jwtRefreshExpiresDays) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: String(subject),
      role,
      type: 'refresh',
      iat: now,
      exp: now + expiresInDays * 24 * 60 * 60,
    },
    config.jwtSecret,
    { algorithm: 'HS256' }
  );
}

export function decodeToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

export async function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ detail: 'Authentication token required' });
  }
  try {
    const payload = decodeToken(token);
    if (payload.type !== 'access') {
      return res.status(401).json({ detail: 'Invalid token type: expected access token' });
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ detail: 'Invalid token subject identifier' });
    }
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({ detail: 'User belonging to this token no longer exists' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'User account has been deactivated. Contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Authentication token has expired. Please log in again.' });
    }
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = decodeToken(token);
    if (payload.type === 'access') {
      const userId = Number(payload.sub);
      if (Number.isInteger(userId) && userId > 0) {
        const user = await User.findOne({ id: userId });
        if (user && user.is_active) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore invalid optional tokens
    req.user = null;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication required' });
  }
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Administrative privileges required to access this resource.' });
  }
  next();
}

export default {
  createAccessToken,
  createRefreshToken,
  decodeToken,
  authenticate,
  optionalAuth,
  requireAdmin,
};
