const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authenticate incoming requests via JWT Bearer token.
 *
 * - Reads token from `Authorization: Bearer <token>`
 * - Verifies signature with JWT_SECRET
 * - Loads user from DB and checks isActive
 * - Attaches user document (without passwordHash) to `req.user`
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (jwtErr) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(decoded.userId).select('-passwordHash');

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Account has been deactivated');
  }

  req.user = user;
  next();
});

/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   router.delete('/users/:id', authenticate, authorize('ADMIN'), handler);
 *
 * @param  {...string} roles - Allowed roles (e.g. 'ADMIN', 'STAFF')
 * @returns {Function}       - Express middleware
 */
const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Not authorized to access this resource');
    }
    next();
  };
};

module.exports = { authenticate, authorize };
