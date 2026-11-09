const { body, validationResult } = require('express-validator');

/**
 * Middleware that checks for validation errors from express-validator chains.
 * If errors exist, returns 400 with a consistent error response.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

/**
 * Validation chain for user registration.
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),

  body('role')
    .optional()
    .isIn(['student', 'faculty', 'department_head', 'admin', 'super_admin'])
    .withMessage(
      'Role must be one of: student, faculty, department_head, admin, super_admin'
    ),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('department')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),

  handleValidationErrors,
];

/**
 * Validation chain for user login.
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

/**
 * Validation chain for creating/updating a complaint.
 */
const complaintValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Complaint title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Complaint description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn([
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
      'other',
    ])
    .withMessage('Invalid complaint category'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be one of: low, medium, high, critical'),

  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory must be under 100 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be under 200 characters'),

  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean value'),

  handleValidationErrors,
];

/**
 * Validation chain for submitting feedback on a resolved complaint.
 */
const feedbackValidation = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('comments')
    .trim()
    .notEmpty()
    .withMessage('Feedback comments are required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comments must be between 5 and 1000 characters'),

  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  complaintValidation,
  feedbackValidation,
  handleValidationErrors,
};
