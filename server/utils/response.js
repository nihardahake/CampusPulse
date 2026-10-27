/**
 * Consistent JSON response helpers.
 * Every successful response follows the shape:
 *   { success: true, data, message }
 */

/**
 * Send a generic success response.
 * @param {import('express').Response} res
 * @param {*}      data       - Payload (null if nothing to return)
 * @param {string} message    - Human-readable message
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ success: true, data, message });
};

/**
 * Convenience wrapper for 201 Created responses.
 */
const sendCreated = (res, data = null, message = 'Created successfully') => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send a paginated success response.
 * Adds a `pagination` object alongside `data`.
 * @param {import('express').Response} res
 * @param {Array}  data       - Page items
 * @param {Object} pagination - { page, limit, total, pages }
 * @param {string} message
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({ success: true, data, pagination, message });
};

module.exports = { sendSuccess, sendCreated, sendPaginated };
