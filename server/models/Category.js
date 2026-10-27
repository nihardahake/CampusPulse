const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
  },
  slaHours: {
    type: Number,
    required: [true, 'SLA hours is required'],
    min: [1, 'SLA hours must be at least 1'],
  },
  description: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
module.exports = mongoose.model('Category', categorySchema);
