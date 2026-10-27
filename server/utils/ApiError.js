/**
 * Custom operational error class for consistent API error handling.
 * Extends native Error with HTTP status codes and structured error details.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message    - Human-readable error message
   * @param {Array}  errors     - Optional array of field-level error details
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /* ---------- Factory helpers ---------- */

  static badRequest(msg, errors) {
    return new ApiError(400, msg, errors);
  }

  static unauthorized(msg = 'Not authenticated') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Not authorized') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg, errors) {
    return new ApiError(409, msg, errors);
  }

  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg);
  }
}

module.exports = ApiError;
