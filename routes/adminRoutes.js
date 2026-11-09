const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAllComplaints,
  assignComplaint,
  getAnalytics,
  getManagementDashboard,
  getReports,
  downloadReport,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getAuditLogs,
  getEscalations,
  getSLAConfig,
  updateSLAConfig,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Dashboard & stats
router.get('/dashboard', protect, authorize('admin', 'management'), getDashboard);
router.get('/management-dashboard', protect, authorize('admin', 'management'), getManagementDashboard);
router.get('/analytics', protect, authorize('admin', 'management'), getAnalytics);
router.get('/performance', protect, authorize('admin', 'management'), getAnalytics);
router.get('/reports', protect, authorize('admin', 'management'), getReports);
router.get('/reports/download', protect, authorize('admin', 'management'), downloadReport);

// Complaints & escalations
router.get('/complaints', protect, authorize('admin', 'department_head', 'management'), getAllComplaints);
router.patch('/complaints/:id/assign', protect, authorize('admin', 'department_head'), assignComplaint);
router.get('/escalations', protect, authorize('admin', 'department_head'), getEscalations);

// User management
router.get('/users', protect, authorize('admin'), getUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.patch('/users/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);

// Audit logs & SLA
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.get('/sla-config', protect, authorize('admin'), getSLAConfig);
router.put('/sla-config', protect, authorize('admin'), updateSLAConfig);

module.exports = router;

