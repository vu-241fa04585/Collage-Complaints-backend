const User = require('../models/User');
const { ErrorResponse } = require('../middleware/errorHandler');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('department', 'name code')
      .lean();

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all staff/faculty for assignment options
 * @route   GET /api/users/staff
 * @access  Private (Admin, Department Head)
 */
const getStaffList = async (req, res, next) => {
  try {
    const { department } = req.query;
    const query = {
      role: { $in: ['faculty', 'department_head'] },
      isActive: true,
    };
    if (department) query.department = department;

    const staff = await User.find(query)
      .populate('department', 'name code')
      .select('name email role employeeId')
      .lean();

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserProfile,
  getStaffList,
};

