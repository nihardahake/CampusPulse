const ApiError = require('../utils/ApiError');
const config = require('../config');

/**
 * Global Express error-handling middleware.
 *
 * Handles:
 *  - ApiError instances (operational errors)
 *  - Mongoose ValidationError (field-level validation failures)
 *  - Mongoose CastError (invalid ObjectId, etc.)
 *  - MongoDB duplicate-key errors (code 11000)
 *  - Everything else → 500
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log in development for easier debugging
  if (config.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  /* --- Known operational error --- */
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  /* --- Mongoose validation error --- */
  if (err.name === 'ValidationError' && err.errors) {
    const fieldErrors = Object.keys(err.errors).map((field) => ({
      field,
      message: err.errors[field].message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fieldErrors,
    });
  }

  /* --- Mongoose CastError (e.g. invalid ObjectId) --- */
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      errors: [],
    });
  }

  /* --- MongoDB duplicate-key error --- */
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'unknown';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${duplicateField}`,
      errors: [{ field: duplicateField, message: 'Already exists' }],
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 3 MB' : 'Invalid image upload', errors: [] });
  }

  /* --- Fallback: unexpected / programmer error --- */
  const payload = {
    success: false,
    message: 'Internal server error',
    errors: [],
  };

  // Include stack trace in development only
  if (config.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }

  return res.status(500).json(payload);
};

module.exports = errorHandler;
