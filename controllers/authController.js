const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorResponse } = require('../middleware/errorHandler');
const { logAction } = require('../utils/auditLogger');

/**
 * Generate a signed JWT token for a user.
 * @param {Object} user - Mongoose user document
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Strip sensitive fields and return a plain user object.
 * @param {Object} user - Mongoose user document
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department, studentId } = req.body;

    // Check if a user with that email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new ErrorResponse('A user with this email already exists', 400));
    }

    // Build user payload
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'student',
      phone: phone || undefined,
      department: department || undefined,
      studentId: studentId || undefined,
    };

    const user = await User.create(userData);

    // Log registration
    await logAction(user._id, 'register', 'User', user._id, { email: user.email }, req.ip);

    const token = generateToken(user);
    const sanitized = sanitizeUser(user);

    res.status(201).json({
      success: true,
      token,
      data: sanitized,
      user: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if user account is active
    if (user.isActive === false) {
      return next(new ErrorResponse('Your account has been deactivated. Please contact the administrator.', 403));
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Update lastLogin timestamp
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Log login action
    await logAction(user._id, 'login', 'User', user._id, { email: user.email }, req.ip);

    const token = generateToken(user);
    const sanitized = sanitizeUser(user);

    res.status(200).json({
      success: true,
      token,
      data: sanitized,
      user: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('department', 'name code');

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user profile (name, phone, avatar only)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    // Only allow these fields to be updated
    const allowedFields = ['name', 'phone', 'avatar'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return next(new ErrorResponse('No valid fields provided for update', 400));
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    await logAction(req.user.id, 'update_profile', 'User', req.user.id, updates, req.ip);

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ErrorResponse('Please provide current password and new password', 400));
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse('New password must be at least 6 characters', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    await logAction(req.user.id, 'change_password', 'User', req.user.id, {}, req.ip);

    // Issue a new token so the user stays logged in
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: { token },
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
