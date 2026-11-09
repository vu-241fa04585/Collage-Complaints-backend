const Complaint = require('../models/Complaint');
const ComplaintHistory = require('../models/ComplaintHistory');
const Feedback = require('../models/Feedback');
const Department = require('../models/Department');
const { ErrorResponse } = require('../middleware/errorHandler');
const { generateTrackingId } = require('../utils/generateTrackingId');
const { routeComplaint } = require('../utils/complaintRouter');
const { createNotification, createBulkNotifications } = require('../utils/notificationService');
const { sendComplaintConfirmation, sendStatusUpdate, sendEscalationNotification } = require('../utils/emailService');
const { logAction } = require('../utils/auditLogger');

// ---------- Valid status transitions ----------
const STATUS_TRANSITIONS = {
  submitted: ['assigned', 'in_progress', 'rejected'],
  assigned: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'escalated', 'forwarded'],
  resolved: ['closed', 'reopened'],
  reopened: ['assigned', 'in_progress'],
  escalated: ['assigned', 'in_progress'],
  forwarded: ['assigned', 'in_progress'],
  rejected: [],
  closed: [],
};

// ---------- Default SLA days by priority ----------
const DEFAULT_SLA_DAYS = {
  low: 10,
  medium: 7,
  high: 3,
  urgent: 1,
};

/**
 * Calculate the due date for a complaint based on priority & department SLA.
 */
const calculateDueDate = (priority, departmentSLA) => {
  let days = DEFAULT_SLA_DAYS[priority] || 7;

  if (departmentSLA && departmentSLA[priority]) {
    days = departmentSLA[priority];
  }

  const due = new Date();
  due.setDate(due.getDate() + days);
  return due;
};

/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  Private (student)
 */
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, subcategory, priority, location } = req.body;

    // Generate unique tracking ID
    const trackingId = await generateTrackingId();

    // Auto-route to appropriate department
    const routing = await routeComplaint(category, subcategory);

    // Fetch department for SLA settings
    let dueDate;
    if (routing && routing.departmentId) {
      const dept = await Department.findById(routing.departmentId);
      dueDate = calculateDueDate(priority || 'medium', dept ? dept.slaSettings : null);
    } else {
      dueDate = calculateDueDate(priority || 'medium', null);
    }

    // Build attachments array from uploaded files
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        });
      }
    }

    const complaintData = {
      trackingId,
      title,
      description,
      category,
      subcategory: subcategory || undefined,
      priority: priority || 'medium',
      location: location || undefined,
      student: req.user.id,
      assignedDepartment: routing ? routing.departmentId : undefined,
      assignedStaff: routing ? routing.headId : undefined,
      status: routing && routing.departmentId ? 'assigned' : 'submitted',
      dueDate,
      attachments,
    };

    const complaint = await Complaint.create(complaintData);

    // Create initial history entry
    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'created',
      performedBy: req.user.id,
      status: complaint.status,
      comments: `Complaint "${title}" created with tracking ID ${trackingId}`,
    });

    // Notify department staff
    if (routing && routing.headId) {
      await createNotification({
        recipient: routing.headId,
        type: 'new_complaint',
        title: 'New Complaint Assigned',
        message: `A new complaint "${title}" (${trackingId}) has been assigned to your department.`,
        relatedComplaint: complaint._id,
      });
    }

    // Send confirmation email to the student (fire-and-forget)
    sendComplaintConfirmation(req.user.email || req.user.id, complaint).catch(() => {});

    await logAction(req.user.id, 'create_complaint', 'Complaint', complaint._id, { trackingId }, req.ip);

    // Populate before returning
    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('assignedDepartment', 'name code')
      .populate('assignedStaff', 'name email');

    res.status(201).json({
      success: true,
      data: populatedComplaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all complaints for logged-in student
 * @route   GET /api/complaints/my
 * @access  Private (student)
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const {
      status,
      category,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = { student: req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { trackingId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('assignedDepartment', 'name code')
        .populate('assignedStaff', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email studentId')
      .populate('assignedDepartment', 'name code')
      .populate('assignedStaff', 'name email')
      .lean();

    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Authorization: students can only see their own complaints
    if (
      req.user.role === 'student' &&
      complaint.student._id.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to view this complaint', 403));
    }

    // Attach history
    const history = await ComplaintHistory.find({ complaint: complaint._id })
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    complaint.history = history;

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update complaint status
 * @route   PATCH /api/complaints/:id/status
 * @access  Private (faculty, department_head, admin)
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, comments } = req.body;

    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Validate status transition
    const allowed = STATUS_TRANSITIONS[complaint.status] || [];
    if (!allowed.includes(status)) {
      return next(
        new ErrorResponse(
          `Cannot transition from "${complaint.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}`,
          400
        )
      );
    }

    const previousStatus = complaint.status;
    complaint.status = status;

    if (status === 'resolved') {
      complaint.resolvedDate = new Date();
    }

    await complaint.save();

    // Create history entry
    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'status_change',
      performedBy: req.user.id,
      previousStatus,
      status,
      comments: comments || `Status changed from ${previousStatus} to ${status}`,
    });

    // Notify the student
    await createNotification({
      recipient: complaint.student,
      type: 'status_update',
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.title}" (${complaint.trackingId}) has been updated to "${status}".`,
      relatedComplaint: complaint._id,
    });

    sendStatusUpdate(complaint.student, complaint, status).catch(() => {});

    await logAction(
      req.user.id,
      'update_status',
      'Complaint',
      complaint._id,
      { previousStatus, newStatus: status },
      req.ip
    );

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Submit feedback for a resolved / closed complaint
 * @route   POST /api/complaints/:id/feedback
 * @access  Private (student)
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { rating, comments } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return next(new ErrorResponse('Please provide a rating between 1 and 5', 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Ensure complaint belongs to the student
    if (complaint.student.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to provide feedback for this complaint', 403));
    }

    // Ensure complaint is resolved or closed
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return next(new ErrorResponse('Feedback can only be submitted for resolved or closed complaints', 400));
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ complaint: complaint._id });
    if (existingFeedback) {
      return next(new ErrorResponse('Feedback has already been submitted for this complaint', 400));
    }

    const feedback = await Feedback.create({
      complaint: complaint._id,
      student: req.user.id,
      rating,
      comments: comments || '',
      assignedStaff: complaint.assignedStaff || undefined,
      department: complaint.assignedDepartment || undefined,
    });

    // Create history entry
    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'feedback_submitted',
      performedBy: req.user.id,
      status: complaint.status,
      comments: `Feedback submitted with rating ${rating}/5`,
    });

    await logAction(req.user.id, 'submit_feedback', 'Feedback', feedback._id, { rating }, req.ip);

    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reopen a resolved / closed complaint
 * @route   PATCH /api/complaints/:id/reopen
 * @access  Private (student)
 */
const reopenComplaint = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    if (complaint.student.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to reopen this complaint', 403));
    }

    if (!['resolved', 'closed'].includes(complaint.status)) {
      return next(new ErrorResponse('Only resolved or closed complaints can be reopened', 400));
    }

    const maxReopenAllowed = complaint.maxReopenAllowed || 3;
    if ((complaint.reopenCount || 0) >= maxReopenAllowed) {
      return next(
        new ErrorResponse(
          `This complaint has already been reopened the maximum allowed times (${maxReopenAllowed})`,
          400
        )
      );
    }

    const previousStatus = complaint.status;
    complaint.status = 'reopened';
    complaint.reopenCount = (complaint.reopenCount || 0) + 1;
    complaint.resolvedDate = undefined;
    await complaint.save();

    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'reopened',
      performedBy: req.user.id,
      previousStatus,
      status: 'reopened',
      comments: reason || 'Complaint reopened by student',
    });

    // Notify assigned staff
    if (complaint.assignedStaff) {
      await createNotification({
        recipient: complaint.assignedStaff,
        type: 'complaint_reopened',
        title: 'Complaint Reopened',
        message: `Complaint "${complaint.title}" (${complaint.trackingId}) has been reopened by the student.`,
        relatedComplaint: complaint._id,
      });
    }

    await logAction(req.user.id, 'reopen_complaint', 'Complaint', complaint._id, { previousStatus }, req.ip);

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get complaint history timeline
 * @route   GET /api/complaints/:id/history
 * @access  Private
 */
const getComplaintHistory = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Authorization check for students
    if (
      req.user.role === 'student' &&
      complaint.student.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to view this complaint history', 403));
    }

    const history = await ComplaintHistory.find({ complaint: req.params.id })
      .populate('performedBy', 'name role avatar')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add a comment to a complaint
 * @route   POST /api/complaints/:id/comments
 * @access  Private
 */
const addComment = async (req, res, next) => {
  try {
    const { comments } = req.body;

    if (!comments || !comments.trim()) {
      return next(new ErrorResponse('Please provide a comment', 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Students can only comment on their own complaints
    if (
      req.user.role === 'student' &&
      complaint.student.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized to comment on this complaint', 403));
    }

    const historyEntry = await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'comment',
      performedBy: req.user.id,
      status: complaint.status,
      comments,
    });

    // Notify the other party
    const recipientId =
      req.user.role === 'student' ? complaint.assignedStaff : complaint.student;

    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        type: 'new_comment',
        title: 'New Comment on Complaint',
        message: `A new comment was added to complaint "${complaint.title}" (${complaint.trackingId}).`,
        relatedComplaint: complaint._id,
      });
    }

    const populated = await ComplaintHistory.findById(historyEntry._id)
      .populate('performedBy', 'name role avatar')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get complaints for the staff member's department
 * @route   GET /api/complaints/department
 * @access  Private (faculty, department_head)
 */
const getDepartmentComplaints = async (req, res, next) => {
  try {
    const {
      status,
      category,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    // Get the staff member's department
    const staffUser = await (require('../models/User')).findById(req.user.id);
    if (!staffUser || !staffUser.department) {
      return next(new ErrorResponse('You are not assigned to any department', 400));
    }

    const query = { assignedDepartment: staffUser.department };

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { trackingId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('student', 'name email studentId')
        .populate('assignedDepartment', 'name code')
        .populate('assignedStaff', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Staff accepts a complaint (sets status to in_progress)
 * @route   PATCH /api/complaints/:id/accept
 * @access  Private (faculty, department_head)
 */
const acceptComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    // Must be in an acceptable state
    if (!['submitted', 'assigned', 'reopened', 'escalated', 'forwarded'].includes(complaint.status)) {
      return next(new ErrorResponse(`Cannot accept a complaint with status "${complaint.status}"`, 400));
    }

    const previousStatus = complaint.status;
    complaint.status = 'in_progress';
    complaint.assignedStaff = req.user.id;
    await complaint.save();

    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'accepted',
      performedBy: req.user.id,
      previousStatus,
      status: 'in_progress',
      comments: req.body.comments || 'Complaint accepted and work is in progress',
    });

    // Notify student
    await createNotification({
      recipient: complaint.student,
      type: 'status_update',
      title: 'Complaint Accepted',
      message: `Your complaint "${complaint.title}" (${complaint.trackingId}) has been accepted and is now in progress.`,
      relatedComplaint: complaint._id,
    });

    await logAction(req.user.id, 'accept_complaint', 'Complaint', complaint._id, { previousStatus }, req.ip);

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Staff resolves a complaint
 * @route   PATCH /api/complaints/:id/resolve
 * @access  Private (faculty, department_head)
 */
const resolveComplaint = async (req, res, next) => {
  try {
    const { resolutionComments } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    if (!['in_progress'].includes(complaint.status)) {
      return next(new ErrorResponse(`Cannot resolve a complaint with status "${complaint.status}"`, 400));
    }

    // Process resolution evidence attachments
    const evidence = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        evidence.push({
          filename: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        });
      }
    }

    const previousStatus = complaint.status;
    complaint.status = 'resolved';
    complaint.resolvedDate = new Date();
    complaint.resolutionComments = resolutionComments || '';
    if (evidence.length > 0) {
      complaint.resolutionEvidence = evidence;
    }
    await complaint.save();

    await ComplaintHistory.create({
      complaint: complaint._id,
      action: 'resolved',
      performedBy: req.user.id,
      previousStatus,
      status: 'resolved',
      comments: resolutionComments || 'Complaint has been resolved',
      attachments: evidence,
    });

    // Notify student
    await createNotification({
      recipient: complaint.student,
      type: 'complaint_resolved',
      title: 'Complaint Resolved',
      message: `Your complaint "${complaint.title}" (${complaint.trackingId}) has been resolved. Please review and provide feedback.`,
      relatedComplaint: complaint._id,
    });

    sendStatusUpdate(complaint.student, complaint, 'resolved').catch(() => {});

    await logAction(req.user.id, 'resolve_complaint', 'Complaint', complaint._id, { resolutionComments }, req.ip);

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Forward or escalate complaint to another department
 * @route   PATCH /api/complaints/:id/forward
 * @access  Private (faculty, department_head, admin)
 */
const forwardComplaint = async (req, res, next) => {
  try {
    const { departmentId, staffId, reason, escalate } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return next(new ErrorResponse('Complaint not found', 404));
    }

    if (['closed', 'rejected'].includes(complaint.status)) {
      return next(new ErrorResponse('Cannot forward a closed or rejected complaint', 400));
    }

    if (!departmentId && !escalate) {
      return next(new ErrorResponse('Please provide a department to forward to, or set escalate to true', 400));
    }

    const previousStatus = complaint.status;
    const previousDepartment = complaint.assignedDepartment;

    if (escalate) {
      complaint.status = 'escalated';
      complaint.isEscalated = true;
      complaint.escalatedAt = new Date();
    } else {
      complaint.status = 'forwarded';
    }

    if (departmentId) {
      // Verify department exists
      const dept = await Department.findById(departmentId);
      if (!dept) {
        return next(new ErrorResponse('Target department not found', 404));
      }
      complaint.assignedDepartment = departmentId;
      complaint.assignedStaff = staffId || dept.head || undefined;
    }

    if (staffId) {
      complaint.assignedStaff = staffId;
    }

    await complaint.save();

    const actionType = escalate ? 'escalated' : 'forwarded';

    await ComplaintHistory.create({
      complaint: complaint._id,
      action: actionType,
      performedBy: req.user.id,
      previousStatus,
      status: complaint.status,
      comments: reason || `Complaint ${actionType} to another department`,
      metadata: {
        fromDepartment: previousDepartment,
        toDepartment: complaint.assignedDepartment,
      },
    });

    // Notify the new assignee
    if (complaint.assignedStaff) {
      await createNotification({
        recipient: complaint.assignedStaff,
        type: actionType === 'escalated' ? 'escalation' : 'complaint_forwarded',
        title: `Complaint ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`,
        message: `Complaint "${complaint.title}" (${complaint.trackingId}) has been ${actionType} to you.`,
        relatedComplaint: complaint._id,
      });
    }

    // Notify the student
    await createNotification({
      recipient: complaint.student,
      type: 'status_update',
      title: `Complaint ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`,
      message: `Your complaint "${complaint.title}" (${complaint.trackingId}) has been ${actionType}.`,
      relatedComplaint: complaint._id,
    });

    if (escalate) {
      sendEscalationNotification(complaint).catch(() => {});
    }

    await logAction(req.user.id, `${actionType}_complaint`, 'Complaint', complaint._id, { reason }, req.ip);

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaintStatus,
  submitFeedback,
  reopenComplaint,
  getComplaintHistory,
  addComment,
  getDepartmentComplaints,
  acceptComplaint,
  resolveComplaint,
  forwardComplaint,
};
