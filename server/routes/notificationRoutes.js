const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// GET / - Get all notifications for the authenticated user
router.get('/', authenticate, notificationController.getNotifications);

// PATCH /read-all - Mark all notifications as read (must come BEFORE /:id/read)
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

// PATCH /:id/read - Mark a single notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

module.exports = router;
