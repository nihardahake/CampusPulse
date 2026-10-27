const { Ticket } = require('../models');
async function findDuplicate(studentId, categoryId, location, now = new Date()) {
  return Ticket.findOne({ createdBy: studentId, category: categoryId, location: new RegExp(`^${String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), status: { $nin: ['CLOSED', 'RESOLVED'] }, createdAt: { $gte: new Date(now.getTime() - 86400000) } }).select('_id');
}
module.exports = { findDuplicate };
