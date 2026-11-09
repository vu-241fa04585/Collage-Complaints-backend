/**
 * Custom error response class with HTTP status code support.
 * Extends the native Error class.
 */
class ErrorResponse extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Centralized error handler middleware.
 * Handles Mongoose errors, JWT errors, custom ErrorResponse, and unknown errors.
 * Always returns consistent JSON: { success: false, error: message }
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: '${value}' for field '${field}'. Please use another value.`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    const message = `Validation failed: ${messages.join('. ')}`;
    error = new ErrorResponse(message, 400);
  }

  // JWT invalid token
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new ErrorResponse(message, 401);
  }

  // JWT expired token
  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired. Please log in again.';
    error = new ErrorResponse(message, 401);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size exceeds the 10MB limit.';
    error = new ErrorResponse(message, 400);
  }

  // Multer unexpected file field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Too many files uploaded. Maximum is 5 files.';
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
  });
};

module.exports = { ErrorResponse, errorHandler };
