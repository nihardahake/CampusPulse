const { ActivityLog } = require('../models');

/**
 * Record an activity log entry for a ticket.
 *
 * @param  {string}      ticketId - ObjectId of the related ticket
 * @param  {string}      action   - Description of the action (e.g. 'STATUS_CHANGE')
 * @param  {string|null} [actorId=null] - ObjectId of the acting user; null for system actions
 * @param  {object}      [meta={}]      - Arbitrary metadata to store with the log entry
 * @returns {Promise<import('mongoose').Document>} The created ActivityLog document
 */
async function logActivity(ticketId, action, actorId = null, meta = {}) {
  const log = await ActivityLog.create({
    ticket: ticketId,
    action,
    actor: actorId,
    meta,
  });
  return log;
}

module.exports = {
  logActivity,
};
