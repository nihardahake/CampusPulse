const router = require('express').Router();
const ticketController = require('../controllers/ticketController');
const commentController = require('../controllers/commentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  createTicketSchema,
  ticketQuerySchema,
  updateStatusSchema,
  assignTicketSchema,
} = require('../validators/ticketValidator');
const { createCommentSchema } = require('../validators/commentValidator');

// POST / - Create a new ticket (students only, with optional image upload)
router.post(
  '/',
  authenticate,
  authorize('STUDENT'),
  upload.single('image'),
  validate(createTicketSchema),
  ticketController.createTicket
);

// GET / - Get tickets (filtered by query params)
router.get('/', authenticate, validate(ticketQuerySchema), ticketController.getTickets);

// GET /similar - Find similar tickets (must come BEFORE /:id)
router.get('/similar', authenticate, ticketController.getSimilarTickets);

// GET /:id - Get a single ticket by ID
router.get('/:id', authenticate, ticketController.getTicketById);

// PATCH /:id/status - Update ticket status
router.patch(
  '/:id/status',
  authenticate,
  validate(updateStatusSchema),
  ticketController.updateTicketStatus
);

// PATCH /:id/assign - Assign ticket to staff (admin only)
router.patch(
  '/:id/assign',
  authenticate,
  authorize('ADMIN'),
  validate(assignTicketSchema),
  ticketController.assignTicket
);

// POST /:id/comments - Add a comment to a ticket
router.post(
  '/:ticketId/comments',
  authenticate,
  validate(createCommentSchema),
  commentController.createComment
);

module.exports = router;
