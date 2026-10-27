const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema,
  createStaffSchema,
  updateStaffSchema,
} = require('../validators/adminValidators');

// ─── Categories ──────────────────────────────────────────────────────────────

// GET /categories - Accessible to all authenticated users
router.get('/categories', authenticate, adminController.getCategories);

// POST /categories - Admin only
router.post(
  '/categories',
  authenticate,
  authorize('ADMIN'),
  validate(createCategorySchema),
  adminController.createCategory
);

// PATCH /categories/:id - Admin only
router.patch(
  '/categories/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateCategorySchema),
  adminController.updateCategory
);

// DELETE /categories/:id - Admin only
router.delete(
  '/categories/:id',
  authenticate,
  authorize('ADMIN'),
  adminController.deleteCategory
);

// ─── Staff Management ───────────────────────────────────────────────────────

// POST /staff - Create staff member (admin only)
router.post(
  '/staff',
  authenticate,
  authorize('ADMIN'),
  validate(createStaffSchema),
  adminController.createStaff
);

// GET /staff - List all staff (admin only)
router.get('/staff', authenticate, authorize('ADMIN'), adminController.getStaff);

// PATCH /staff/:id - Update staff member (admin only)
router.patch(
  '/staff/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateStaffSchema),
  adminController.updateStaff
);

// ─── Analytics ──────────────────────────────────────────────────────────────

router.get('/analytics/summary', authenticate, authorize('ADMIN'), adminController.getDashboardSummary);
router.get('/analytics/by-status', authenticate, authorize('ADMIN'), adminController.getTicketsByStatus);
router.get('/analytics/by-category', authenticate, authorize('ADMIN'), adminController.getTicketsByCategory);
router.get('/analytics/by-priority', authenticate, authorize('ADMIN'), adminController.getTicketsByPriority);
router.get('/analytics/resolution-time', authenticate, authorize('ADMIN'), adminController.getAvgResolutionTime);
router.get('/analytics/sla-breach-rate', authenticate, authorize('ADMIN'), adminController.getSLABreachRate);
router.get('/analytics/staff-workload', authenticate, authorize('ADMIN'), adminController.getStaffWorkload);
router.get('/analytics/tickets-per-day', authenticate, authorize('ADMIN'), adminController.getTicketsPerDay);

// ─── Jobs ───────────────────────────────────────────────────────────────────

// POST /jobs/run-sla-check - Manually trigger SLA check (admin only)
router.post('/jobs/run-sla-check', authenticate, authorize('ADMIN'), adminController.runSlaCheck);

module.exports = router;
