const mongoose = require('mongoose');

const complaintHistorySchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required']
    },
    previousStatus: {
      type: String,
      trim: true
    },
    newStatus: {
      type: String,
      trim: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: [
          'created',
          'assigned',
          'status_changed',
          'escalated',
          'commented',
          'reopened',
          'forwarded',
          'evidence_added',
          'closed'
        ],
        message: '{VALUE} is not a valid action'
      }
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed-by user reference is required']
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comments cannot exceed 2000 characters']
    },
    attachments: [
      {
        filename: { type: String, required: true },
        url: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
complaintHistorySchema.index({ complaint: 1, createdAt: -1 });
complaintHistorySchema.index({ performedBy: 1 });

module.exports = mongoose.model('ComplaintHistory', complaintHistorySchema);
