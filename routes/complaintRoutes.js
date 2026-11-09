const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const { uploadAttachments } = require('../middleware/upload');
const { complaintValidation, feedbackValidation } = require('../middleware/validate');

// Student complaints
router.post(
  '/',
  protect,
  authorize('student', 'admin'),
  uploadAttachments,
  complaintValidation,
  createComplaint
);
router.get('/my', protect, authorize('student'), getMyComplaints);

// Staff / Department complaints
router.get(
  '/department',
  protect,
  authorize('faculty', 'department_head', 'admin'),
  getDepartmentComplaints
);

// Individual complaint operations
router.get('/:id', protect, getComplaintById);
router.get('/:id/history', protect, getComplaintHistory);
router.post('/:id/comments', protect, addComment);

// Staff actions
router.patch(
  '/:id/accept',
  protect,
  authorize('faculty', 'department_head', 'admin'),
  acceptComplaint
);
router.patch(
  '/:id/status',
  protect,
  authorize('faculty', 'department_head', 'admin'),
  updateComplaintStatus
);
router.patch(
  '/:id/resolve',
  protect,
  authorize('faculty', 'department_head', 'admin'),
  uploadAttachments,
  resolveComplaint
);
router.patch(
  '/:id/forward',
  protect,
  authorize('faculty', 'department_head', 'admin'),
  forwardComplaint
);

// Student actions
router.post(
  '/:id/feedback',
  protect,
  authorize('student'),
  feedbackValidation,
  submitFeedback
);
router.patch(
  '/:id/reopen',
  protect,
  authorize('student'),
  reopenComplaint
);

module.exports = router;

