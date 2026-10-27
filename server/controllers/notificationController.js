const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { Notification } = require('../models');

/**
 * GET /api/notifications
 * Protected – paginated list of notifications for the current user.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  const pages = Math.ceil(total / limit);

  sendPaginated(
    res,
    { notifications, unreadCount },
    { page, limit, total, pages }
  );
});

/**
 * PATCH /api/notifications/:id/read
 * Protected – mark a single notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification || !notification.user.equals(req.user._id)) {
    throw ApiError.notFound('Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  sendSuccess(res, notification, 'Notification marked as read');
});

/**
 * PATCH /api/notifications/read-all
 * Protected – mark all unread notifications as read for the current user.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  sendSuccess(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
