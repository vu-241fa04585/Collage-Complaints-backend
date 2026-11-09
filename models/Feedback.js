const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      unique: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    rating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comments cannot exceed 2000 characters']
    },
    serviceQuality: {
      type: Number,
      min: [1, 'Service quality rating must be at least 1'],
      max: [5, 'Service quality rating cannot exceed 5']
    },
    responseTime: {
      type: Number,
      min: [1, 'Response time rating must be at least 1'],
      max: [5, 'Response time rating cannot exceed 5']
    },
    satisfaction: {
      type: Number,
      min: [1, 'Satisfaction rating must be at least 1'],
      max: [5, 'Satisfaction rating cannot exceed 5']
    }
  },
  {
    timestamps: true
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
feedbackSchema.index({ student: 1 });
feedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
