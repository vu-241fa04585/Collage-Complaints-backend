const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStaff,
  getDepartmentDashboard,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getAllDepartments);
router.get('/:id', protect, getDepartmentById);
router.post('/', protect, authorize('admin'), createDepartment);
router.patch('/:id', protect, authorize('admin', 'department_head'), updateDepartment);
router.delete('/:id', protect, authorize('admin'), deleteDepartment);
router.get('/:id/staff', protect, getDepartmentStaff);
router.get('/:id/dashboard', protect, authorize('faculty', 'department_head', 'admin'), getDepartmentDashboard);

module.exports = router;

