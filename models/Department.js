const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [150, 'Department name cannot exceed 150 characters']
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Department code cannot exceed 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    categories: [
      {
        type: String,
        trim: true
      }
    ],
    slaSettings: {
      critical: { type: Number, default: 4 },   // hours
      high:     { type: Number, default: 24 },   // hours
      medium:   { type: Number, default: 72 },   // hours
      low:      { type: Number, default: 168 }   // hours
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ categories: 1 });

module.exports = mongoose.model('Department', departmentSchema);
