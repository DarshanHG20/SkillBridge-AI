import rateLimit from 'express-rate-limit';

const skipInTest = () => process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { detail: 'Too many requests from this IP. Please slow down.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { detail: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

export const tutorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { detail: 'Rate limit exceeded for AI Tutor. Please slow down.' },
});

export default {
  apiLimiter,
  authLimiter,
  tutorLimiter,
};
