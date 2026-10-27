const mongoose = require('mongoose');

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
      default: 'OPEN',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastAssignedAt: { type: Date },
    imageUrl: {
      type: String,
    },
    slaDeadline: {
      type: Date,
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    reopenCount: {
      type: Number,
      default: 0,
    },
    statusHistory: [statusHistoryEntrySchema],
  },
  { timestamps: true }
);

// Indexes
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ slaDeadline: 1 });
ticketSchema.index({ createdBy: 1, category: 1, location: 1, status: 1 });
ticketSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);
