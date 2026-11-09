const mongoose = require('mongoose');

// ── Sub-schemas ──────────────────────────────────────────────────────────────
const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

const evidenceSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────────────
const complaintSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      unique: true,
      trim: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'classroom',
          'laboratory',
          'internet_wifi',
          'hostel',
          'transportation',
          'library',
          'canteen',
          'drinking_water_sanitation',
          'academic',
          'faculty_related',
          'examination',
          'ragging_harassment',
          'infrastructure',
          'other'
        ],
        message: '{VALUE} is not a valid category'
      }
    },
    subcategory: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: {
        values: ['critical', 'high', 'medium', 'low'],
        message: '{VALUE} is not a valid priority'
      },
      default: 'medium'
    },
    status: {
      type: String,
      enum: {
        values: [
          'submitted',
          'assigned',
          'in_progress',
          'resolved',
          'closed',
          'reopened',
          'escalated'
        ],
        message: '{VALUE} is not a valid status'
      },
      default: 'submitted'
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isConfidential: {
      type: Boolean,
      default: false
    },
    attachments: [attachmentSchema],
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    dueDate: {
      type: Date
    },
    resolvedDate: {
      type: Date
    },
    resolutionComments: {
      type: String,
      trim: true,
      maxlength: [5000, 'Resolution comments cannot exceed 5000 characters']
    },
    resolutionEvidence: [evidenceSchema],
    reopenCount: {
      type: Number,
      default: 0
    },
    maxReopenAllowed: {
      type: Number,
      default: 2
    },
    escalationLevel: {
      type: Number,
      default: 0
    },
    linkedComplaints: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
complaintSchema.index({ student: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ assignedDepartment: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ assignedStaff: 1, status: 1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────

/**
 * Returns true when the complaint's due date has passed and it is not yet
 * resolved or closed.
 */
complaintSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  const terminalStatuses = ['resolved', 'closed'];
  if (terminalStatuses.includes(this.status)) return false;
  return new Date() > this.dueDate;
});

// ── Pre-save hook: generate tracking ID ──────────────────────────────────────
complaintSchema.pre('save', async function (next) {
  if (this.trackingId) return next();

  try {
    // Lazy-require to avoid circular dependency issues at module-load time
    const Counter = mongoose.model('Counter');
    const year = new Date().getFullYear();
    const seq = await Counter.getNextSequence('complaint_tracking_id');
    const padded = String(seq).padStart(4, '0');
    this.trackingId = `CGR-${year}-${padded}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
