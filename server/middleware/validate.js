const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

/**
 * Validation middleware factory for Zod schemas.
 *
 * Validates `req.body`, `req.query`, and `req.params` against the provided
 * Zod schema. On success the parsed (and potentially transformed/coerced)
 * values are written back onto `req`.
 *
 * @param {import('zod').ZodSchema} schema - Zod object schema with optional
 *   `body`, `query`, and `params` keys.
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Apply parsed values back (keeps originals if key was absent in schema)
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      // Convert Zod issues to a flat field-level error array
      const fieldErrors = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw ApiError.badRequest('Validation failed', fieldErrors);
    }

    // Re-throw non-Zod errors
    throw err;
  }
};

module.exports = validate;
