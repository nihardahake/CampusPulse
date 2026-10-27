const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket reference is required'],
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for system-triggered actions
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
activityLogSchema.index({ ticket: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
