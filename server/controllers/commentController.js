const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendCreated } = require('../utils/response');
const { Ticket, Comment, Notification, ActivityLog } = require('../models');

/* ---------- Helpers ---------- */

/**
 * Verify that the requesting user is involved in the ticket.
 * Returns the ticket document or throws ApiError.notFound.
 */
const verifyTicketAccess = async (ticketId, user) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw ApiError.notFound('Ticket not found');
  }

  const { role, _id: userId } = user;

  if (role === 'ADMIN') return ticket;

  if (role === 'STUDENT') {
    if (!ticket.createdBy.equals(userId)) {
      throw ApiError.notFound('Ticket not found');
    }
    return ticket;
  }

  // STAFF – must be assigned or ticket's category in their categories
  if (role === 'STAFF') {
    const isAssigned = ticket.assignedTo && ticket.assignedTo.equals(userId);
    const inCategory = user.categories.some((catId) =>
      catId.equals(ticket.category)
    );
    if (!isAssigned && !inCategory) {
      throw ApiError.notFound('Ticket not found');
    }
    return ticket;
  }

  throw ApiError.notFound('Ticket not found');
};

/* ---------- Handlers ---------- */

/**
 * POST /api/tickets/:ticketId/comments
 * Protected – create a comment on a ticket.
 */
const createComment = asyncHandler(async (req, res) => {
  const ticket = await verifyTicketAccess(req.params.ticketId, req.user);

  const comment = await Comment.create({
    ticket: ticket._id,
    author: req.user._id,
    message: req.body.message,
  });

  // Populate the author field on the returned comment
  await comment.populate('author', 'name email');

  /* ---------- Notifications ---------- */
  const notifications = [];

  if (req.user.role === 'STUDENT' && ticket.assignedTo) {
    // Student commented → notify assigned staff
    notifications.push({
      user: ticket.assignedTo,
      message: `New comment on ticket "${ticket.title}" by student`,
      ticket: ticket._id,
    });
  } else if (req.user.role === 'STAFF') {
    // Staff commented → notify ticket creator
    notifications.push({
      user: ticket.createdBy,
      message: `Staff replied on your ticket "${ticket.title}"`,
      ticket: ticket._id,
    });
  } else if (req.user.role === 'ADMIN') {
    // Admin commented → notify both parties
    if (ticket.assignedTo) {
      notifications.push({
        user: ticket.assignedTo,
        message: `Admin commented on ticket "${ticket.title}"`,
        ticket: ticket._id,
      });
    }
    notifications.push({
      user: ticket.createdBy,
      message: `Admin commented on your ticket "${ticket.title}"`,
      ticket: ticket._id,
    });
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  // Log activity
  await ActivityLog.create({
    ticket: ticket._id,
    action: 'Comment added',
    actor: req.user._id,
    meta: { commentId: comment._id },
  });

  sendCreated(res, comment, 'Comment created successfully');
});

module.exports = { createComment };
