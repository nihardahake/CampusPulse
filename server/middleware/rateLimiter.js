const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login / auth endpoints.
 * 10 requests per 15-minute window.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts, try again in 15 minutes',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General-purpose rate limiter.
 * 100 requests per 15-minute window.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, generalLimiter };
