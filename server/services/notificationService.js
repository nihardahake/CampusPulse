const { Notification, User } = require('../models');

/**
 * Create a notification document for a specific user.
 *
 * @param  {string} userId   - ObjectId of the recipient user
 * @param  {string} message  - Notification message text
 * @param  {string} [ticketId] - Related ticket ObjectId (optional)
 * @returns {Promise<import('mongoose').Document>} The created Notification
 */
async function createNotification(userId, message, ticketId) {
  const notification = await Notification.create({
    user: userId,
    message,
    ticket: ticketId || undefined,
  });
  return notification;
}

/**
 * Notify a single user. Currently delegates to `createNotification`.
 * Can be extended later to push via WebSocket, email, etc.
 *
 * @param  {string} userId   - ObjectId of the recipient user
 * @param  {string} message  - Notification message text
 * @param  {string} [ticketId] - Related ticket ObjectId (optional)
 * @returns {Promise<import('mongoose').Document>}
 */
async function notifyUser(userId, message, ticketId) {
  return createNotification(userId, message, ticketId);
}

/**
 * Send a notification to every ADMIN user in the system.
 *
 * @param  {string} message   - Notification message text
 * @param  {string} [ticketId] - Related ticket ObjectId (optional)
 * @returns {Promise<import('mongoose').Document[]>} Array of created Notifications
 */
async function notifyAdmins(message, ticketId) {
  const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();

  const notifications = await Promise.all(
    admins.map((admin) => createNotification(admin._id, message, ticketId))
  );

  return notifications;
}

/**
 * Notify all parties involved in a ticket (the creator and the assigned staff,
 * if one exists). Avoids duplicate notifications if creator === assignee.
 *
 * @param  {import('mongoose').Document} ticket  - Ticket document (needs createdBy & assignedTo)
 * @param  {string}                      message - Notification message text
 * @returns {Promise<import('mongoose').Document[]>} Array of created Notifications
 */
async function notifyTicketParties(ticket, message) {
  const recipientIds = new Set();

  // Always notify the ticket creator
  if (ticket.createdBy) {
    recipientIds.add(String(ticket.createdBy._id || ticket.createdBy));
  }

  // Notify the assigned staff member if present
  if (ticket.assignedTo) {
    recipientIds.add(String(ticket.assignedTo._id || ticket.assignedTo));
  }

  const notifications = await Promise.all(
    Array.from(recipientIds).map((uid) =>
      createNotification(uid, message, ticket._id)
    )
  );

  return notifications;
}

module.exports = {
  createNotification,
  notifyUser,
  notifyAdmins,
  notifyTicketParties,
  notify: (userIds, message, ticketId) => Promise.all([...new Set((userIds || []).filter(Boolean).map((id) => id.toString()))].map((userId) => createNotification(userId, message, ticketId))),
};
