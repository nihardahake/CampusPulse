const mongoose = require('mongoose');
const { Ticket, Category, User, Comment, ActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess, sendCreated } = require('../utils/response');
const { findDuplicate } = require('../services/duplicateDetectionService');
const { autoAssignTicket, reassignTicket } = require('../services/assignmentService');
const { executeTransition } = require('../services/ticketStateMachine');
const { notify } = require('../services/notificationService');
const { uploadToCloudinary } = require('../middleware/upload');

const access = (ticket, user) => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STUDENT') return String(ticket.createdBy?._id || ticket.createdBy) === String(user._id);
  return String(ticket.assignedTo?._id || ticket.assignedTo || '') === String(user._id) || (user.categories || []).some((id) => String(id._id || id) === String(ticket.category?._id || ticket.category));
};
const loadTicket = async (id, user) => {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Ticket not found');
  const t = await Ticket.findById(id).populate('category').populate('createdBy', 'name email').populate('assignedTo', 'name email');
  if (!t || !access(t, user)) throw ApiError.notFound('Ticket not found');
  return t;
};

exports.createTicket = asyncHandler(async (req, res) => {
  const { title, description, category: categoryId, location } = req.body;
  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.badRequest('Select a valid category');
  const duplicate = await findDuplicate(req.user._id, categoryId, location);
  if (duplicate) return res.status(409).json({ success: false, data: { ticketId: duplicate._id }, message: 'You already reported this issue in this location within the last 24 hours.' });
  let imageUrl;
  if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);
  const ticket = new Ticket({ title, description, category: categoryId, location, createdBy: req.user._id, imageUrl, slaDeadline: new Date(Date.now() + category.slaHours * 3600000) });
  const staff = await autoAssignTicket(ticket, categoryId);
  await ticket.save();
  await ActivityLog.create({ ticket: ticket._id, action: 'Ticket created', actor: req.user._id });
  if (staff) await ActivityLog.create({ ticket: ticket._id, action: 'Ticket auto-assigned', meta: { assignedTo: staff._id } });
  if (staff) await notify([staff._id], `New ticket assigned: ${ticket.title}`, ticket._id);
  else {
    const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
    await notify(admins.map((u) => u._id), `Unassigned ticket requires attention: ${ticket.title}`, ticket._id);
  }
  sendCreated(res, await ticket.populate(['category', 'assignedTo']), 'Ticket created');
});

exports.getTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, category, priority, q, assignedTo, overdue, sort } = req.query;
  const query = {};
  if (req.user.role === 'STUDENT') query.createdBy = req.user._id;
  if (req.user.role === 'STAFF') query.$or = [{ assignedTo: req.user._id }, { category: { $in: req.user.categories } }];
  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (assignedTo && req.user.role === 'ADMIN') query.assignedTo = assignedTo;
  if (q) query.$text = { $search: q };
  if (overdue === 'true') { query.slaDeadline = { $lt: new Date() }; query.status = { $nin: ['RESOLVED', 'CLOSED'] }; }
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const [tickets, total] = await Promise.all([Ticket.find(query).populate('category', 'name slaHours').populate('createdBy', 'name').populate('assignedTo', 'name').sort(sort || '-createdAt').skip((Number(page) - 1) * safeLimit).limit(safeLimit), Ticket.countDocuments(query)]);
  if (req.user.role === 'STAFF') {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    tickets.sort((a, b) => rank[a.priority] - rank[b.priority] || new Date(a.slaDeadline) - new Date(b.slaDeadline));
  }
  sendSuccess(res, { tickets, pagination: { page: Number(page), limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } });
});
exports.getTicketById = asyncHandler(async (req, res) => {
  const ticket = await loadTicket(req.params.id, req.user);
  const [comments, history] = await Promise.all([Comment.find({ ticket: ticket._id }).populate('author', 'name role').sort('createdAt'), ActivityLog.find({ ticket: ticket._id }).populate('actor', 'name role').sort('createdAt')]);
  sendSuccess(res, { ticket, comments, history });
});
exports.getSimilarTickets = asyncHandler(async (req, res) => {
  const { category, location } = req.query;
  const tickets = await Ticket.find({ category, location: new RegExp(`^${String(location || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), status: { $nin: ['CLOSED', 'RESOLVED'] } }).select('title status priority createdAt').limit(5);
  sendSuccess(res, tickets);
});
exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await loadTicket(req.params.id, req.user);
  // loadTicket populates assignedTo, so compare the referenced user's ID.
  if (req.user.role === 'STAFF' && String(ticket.assignedTo?._id || ticket.assignedTo || '') !== String(req.user._id)) throw ApiError.notFound('Ticket not found');
  await executeTransition(ticket, req.body.status, req.user, req.body.note);
  sendSuccess(res, ticket, 'Ticket status updated');
});
exports.assignTicket = asyncHandler(async (req, res) => {
  const ticket = await loadTicket(req.params.id, req.user);
  const staff = await reassignTicket(ticket, req.body.assignedTo, req.user);
  await ticket.save();
  await notify([staff._id, ticket.createdBy], `Ticket “${ticket.title}” was assigned to ${staff.name}`, ticket._id);
  await ActivityLog.create({ ticket: ticket._id, action: 'Ticket assigned', actor: req.user._id, meta: { assignedTo: staff._id } });
  sendSuccess(res, ticket, 'Ticket assigned');
});
