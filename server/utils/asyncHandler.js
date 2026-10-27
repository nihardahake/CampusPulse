/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to the next error-handling middleware.
 *
 * Usage:
 *   router.get('/items', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function}  - Express-compatible middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
