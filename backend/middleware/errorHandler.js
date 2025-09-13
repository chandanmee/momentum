const logger = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const handlePostgresError = (err) => {
  let message = 'Database error occurred';
  let statusCode = 500;

  // Handle specific PostgreSQL errors
  switch (err.code) {
    case '23505': // unique_violation
      message = 'Duplicate entry. This record already exists.';
      statusCode = 409;
      break;
    case '23503': // foreign_key_violation
      message = 'Referenced record does not exist.';
      statusCode = 400;
      break;
    case '23502': // not_null_violation
      message = `Required field '${err.column}' is missing.`;
      statusCode = 400;
      break;
    case '22001': // string_data_right_truncation
      message = 'Input data is too long for the field.';
      statusCode = 400;
      break;
    case '22P02': // invalid_text_representation
      message = 'Invalid data format provided.';
      statusCode = 400;
      break;
    case '42P01': // undefined_table
      message = 'Database table not found.';
      statusCode = 500;
      break;
    case '42703': // undefined_column
      message = 'Database column not found.';
      statusCode = 500;
      break;
    default:
      message = err.message || 'Database operation failed';
      statusCode = 500;
  }

  return new AppError(message, statusCode);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString(),
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logger.logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    // Handle PostgreSQL errors
    if (error.code && typeof error.code === 'string' && error.code.match(/^[0-9A-Z]{5}$/)) {
      error = handlePostgresError(error);
    }

    sendErrorProd(error, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Validation error helper
const createValidationError = (message, field = null) => {
  const error = new AppError(message, 400);
  if (field) {
    error.field = field;
  }
  return error;
};

// Authorization error helper
const createAuthError = (message = 'Not authorized') => {
  return new AppError(message, 401);
};

// Forbidden error helper
const createForbiddenError = (message = 'Access forbidden') => {
  return new AppError(message, 403);
};

// Not found error helper
const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

// Conflict error helper
const createConflictError = (message = 'Resource conflict') => {
  return new AppError(message, 409);
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFound,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
};