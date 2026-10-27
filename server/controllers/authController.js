const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess, sendCreated } = require('../utils/response');
const { User } = require('../models');
const config = require('../config');

/* ---------- Helpers ---------- */

/**
 * Generate a signed JWT for the given user.
 * @param {Object} user - Mongoose user document
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

/* ---------- Handlers ---------- */

/**
 * POST /api/auth/register
 * Public – STUDENT self-registration only.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check for existing email
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create student user
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'STUDENT',
  });

  const token = generateToken(user);

  sendCreated(res, { user: user.toJSON(), token }, 'Registration successful');
});

/**
 * POST /api/auth/login
 * Public – authenticate any active user.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user (include passwordHash for comparison)
  const user = await User.findOne({ email });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account has been deactivated');
  }

  const token = generateToken(user);

  sendSuccess(res, { user: user.toJSON(), token }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Protected – return the currently authenticated user profile.
 */
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user);
});

module.exports = { register, login, getMe };
