const bcrypt = require('bcryptjs');
const { Ticket, User, Category } = require('../models');
const { sendSuccess, sendCreated } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { runSlaCheck } = require('../jobs/slaCheck');

const groupedCount = (field) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
];
const listBy = (field) => asyncHandler(async (_req, res) => {
  sendSuccess(res, await Ticket.aggregate(groupedCount(field)));
});

exports.getCategories = asyncHandler(async (_req, res) => {
  sendSuccess(res, await Category.find().sort('name'));
});
exports.createCategory = asyncHandler(async (req, res) => {
  sendCreated(res, await Category.create(req.body), 'Category created');
});
exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('Category not found');
  sendSuccess(res, category);
});
exports.deleteCategory = asyncHandler(async (req, res) => {
  if (await Ticket.exists({ category: req.params.id, status: { $nin: ['CLOSED'] } })) {
    throw ApiError.conflict('Category has active tickets');
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  sendSuccess(res, null, 'Category deleted');
});

exports.createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, categories = [] } = req.body;
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'STAFF',
    categories,
  });
  sendCreated(res, user, 'Staff created');
});
exports.getStaff = asyncHandler(async (_req, res) => {
  sendSuccess(res, await User.find({ role: 'STAFF' }).select('-passwordHash').populate('categories'));
});
exports.updateStaff = asyncHandler(async (req, res) => {
  const allowed = {};
  for (const key of ['name', 'isActive', 'categories']) {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  }
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'STAFF' },
    allowed,
    { new: true, runValidators: true }
  ).select('-passwordHash').populate('categories');
  if (!user) throw ApiError.notFound('Staff member not found');
  sendSuccess(res, user);
});

exports.getTicketsByStatus = listBy('status');
exports.getTicketsByPriority = listBy('priority');
exports.getTicketsByCategory = asyncHandler(async (_req, res) => {
  const data = await Ticket.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $project: { _id: '$category.name', count: 1 } },
    { $sort: { count: -1 } },
  ]);
  sendSuccess(res, data);
});
exports.getAvgResolutionTime = asyncHandler(async (_req, res) => {
  const data = await Ticket.aggregate([
    { $match: { resolvedAt: { $ne: null } } },
    { $group: { _id: '$category', hours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: '$category.name', hours: { $round: ['$hours', 1] } } },
  ]);
  sendSuccess(res, data);
});
exports.getSLABreachRate = asyncHandler(async (_req, res) => {
  const [total, breached] = await Promise.all([
    Ticket.countDocuments(),
    Ticket.countDocuments({ escalationLevel: { $gt: 0 } }),
  ]);
  sendSuccess(res, { total, breached, rate: total ? Math.round((breached / total) * 1000) / 10 : 0 });
});
exports.getStaffWorkload = asyncHandler(async (_req, res) => {
  const [workload, topResolvers] = await Promise.all([
    Ticket.aggregate([
      { $match: { status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'] }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', openTickets: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $project: { name: '$staff.name', openTickets: 1 } },
    ]),
    Ticket.aggregate([
      { $match: { status: { $in: ['RESOLVED', 'CLOSED'] }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', resolved: { $sum: 1 } } },
      { $sort: { resolved: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
      { $unwind: '$staff' },
      { $project: { name: '$staff.name', resolved: 1 } },
    ]),
  ]);
  sendSuccess(res, { workload, topResolvers });
});
exports.getTicketsPerDay = asyncHandler(async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  const data = await Ticket.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  sendSuccess(res, data);
});
exports.getDashboardSummary = asyncHandler(async (_req, res) => {
  const [total, active, resolved, overdue] = await Promise.all([
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] } }),
    Ticket.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } }),
    Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] }, slaDeadline: { $lt: new Date() } }),
  ]);
  sendSuccess(res, { total, active, resolved, overdue });
});
exports.runSlaCheck = asyncHandler(async (_req, res) => {
  sendSuccess(res, await runSlaCheck(), 'SLA check completed');
});
