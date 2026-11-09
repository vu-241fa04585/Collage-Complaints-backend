const Department = require('../models/Department');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { ErrorResponse } = require('../middleware/errorHandler');
const { logAction } = require('../utils/auditLogger');

/**
 * @desc    Get all active departments
 * @route   GET /api/departments
 * @access  Private
 */
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'name email phone')
      .populate('staff', 'name email role')
      .sort({ name: 1 })
      .lean();

    // Attach complaints count
    const departmentsWithStats = await Promise.all(
      departments.map(async (dept) => {
        const totalComplaints = await Complaint.countDocuments({ assignedDepartment: dept._id });
        const pendingComplaints = await Complaint.countDocuments({
          assignedDepartment: dept._id,
          status: { $nin: ['resolved', 'closed'] },
        });
        return {
          ...dept,
          totalComplaints,
          pendingComplaints,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: departmentsWithStats.length,
      data: departmentsWithStats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single department by ID
 * @route   GET /api/departments/:id
 * @access  Private
 */
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'name email phone')
      .populate('staff', 'name email role')
      .lean();

    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new department
 * @route   POST /api/departments
 * @access  Private (Admin)
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, head, staff, categories, slaSettings } = req.body;

    const existing = await Department.findOne({
      $or: [{ code: code.toUpperCase() }, { name: { $regex: `^${name}$`, $options: 'i' } }],
    });

    if (existing) {
      return next(new ErrorResponse('Department with this name or code already exists', 400));
    }

    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
      head: head || undefined,
      staff: staff || [],
      categories: categories || [],
      slaSettings: slaSettings || undefined,
    });

    await logAction(req.user.id, 'create_department', 'Department', department._id, { name, code }, req.ip);

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update department
 * @route   PATCH /api/departments/:id
 * @access  Private (Admin, Department Head)
 */
const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }

    const { name, description, head, staff, categories, slaSettings, isActive } = req.body;

    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (head !== undefined) department.head = head || null;
    if (staff !== undefined) department.staff = staff;
    if (categories !== undefined) department.categories = categories;
    if (slaSettings !== undefined) department.slaSettings = slaSettings;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    await logAction(req.user.id, 'update_department', 'Department', department._id, req.body, req.ip);

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete department (soft delete)
 * @route   DELETE /api/departments/:id
 * @access  Private (Admin)
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }

    department.isActive = false;
    await department.save();

    await logAction(req.user.id, 'delete_department', 'Department', department._id, { name: department.name }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get staff members in a department
 * @route   GET /api/departments/:id/staff
 * @access  Private
 */
const getDepartmentStaff = async (req, res, next) => {
  try {
    const staff = await User.find({
      department: req.params.id,
      role: { $in: ['faculty', 'department_head'] },
      isActive: true,
    })
      .select('name email role employeeId phone')
      .lean();

    // Attach active assigned complaints count for each staff
    const staffWithWorkload = await Promise.all(
      staff.map(async (s) => {
        const assignedComplaints = await Complaint.countDocuments({
          assignedStaff: s._id,
          status: { $nin: ['resolved', 'closed'] },
        });
        const resolvedComplaints = await Complaint.countDocuments({
          assignedStaff: s._id,
          status: { $in: ['resolved', 'closed'] },
        });
        return {
          ...s,
          assignedCount: assignedComplaints,
          resolvedCount: resolvedComplaints,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: staffWithWorkload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get Department specific dashboard
 * @route   GET /api/departments/:id/dashboard
 * @access  Private (Department Head, Faculty, Admin)
 */
const getDepartmentDashboard = async (req, res, next) => {
  try {
    const departmentId = req.params.id;
    const department = await Department.findById(departmentId);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }

    const total = await Complaint.countDocuments({ assignedDepartment: departmentId });
    const pending = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: { $in: ['submitted', 'assigned'] },
    });
    const inProgress = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: 'in_progress',
    });
    const resolved = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: { $in: ['resolved', 'closed'] },
    });
    const overdue = await Complaint.countDocuments({
      assignedDepartment: departmentId,
      status: { $nin: ['resolved', 'closed'] },
      dueDate: { $lt: new Date() },
    });

    const recentComplaints = await Complaint.find({ assignedDepartment: departmentId })
      .populate('student', 'name studentId')
      .populate('assignedStaff', 'name')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // Workload of staff
    const staff = await User.find({
      department: departmentId,
      role: { $in: ['faculty', 'department_head'] },
      isActive: true,
    })
      .select('name email')
      .lean();

    const staffWorkload = await Promise.all(
      staff.map(async (s) => {
        const count = await Complaint.countDocuments({
          assignedStaff: s._id,
          status: { $nin: ['resolved', 'closed'] },
        });
        const resolvedCount = await Complaint.countDocuments({
          assignedStaff: s._id,
          status: { $in: ['resolved', 'closed'] },
        });
        return {
          name: s.name,
          assigned: count,
          resolved: resolvedCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          code: department.code,
        },
        stats: {
          total,
          pending,
          inProgress,
          resolved,
          overdue,
        },
        recentComplaints,
        staffWorkload,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStaff,
  getDepartmentDashboard,
};

