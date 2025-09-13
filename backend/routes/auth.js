const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { 
  createSendToken, 
  protect, 
  refreshToken, 
  logout, 
  authRateLimit 
} = require('../middleware/auth');
const { 
  AppError, 
  catchAsync, 
  createValidationError, 
  createAuthError, 
  createNotFoundError 
} = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const registerValidation = [
  body('employee_id')
    .isLength({ min: 3, max: 50 })
    .withMessage('Employee ID must be between 3 and 50 characters'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('role')
    .optional()
    .isIn(['admin', 'employee', 'manager'])
    .withMessage('Role must be admin, employee, or manager'),
  body('department_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Department ID must be a positive integer'),
  body('geofence_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geofence ID must be a positive integer'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
];

// Helper function to check validation errors
const checkValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw createValidationError(errorMessages);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (but should be restricted in production)
router.post('/register', authRateLimit, registerValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const {
    employee_id,
    name,
    email,
    password,
    role = 'employee',
    department_id,
    geofence_id,
    phone
  } = req.body;

  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1 OR employee_id = $2',
    [email, employee_id]
  );

  if (existingUser.rows.length > 0) {
    return next(new AppError('User with this email or employee ID already exists', 409));
  }

  // Validate department exists if provided
  if (department_id) {
    const department = await query(
      'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL',
      [department_id]
    );
    if (department.rows.length === 0) {
      return next(createNotFoundError('Department'));
    }
  }

  // Validate geofence exists if provided
  if (geofence_id) {
    const geofence = await query(
      'SELECT id FROM geofences WHERE id = $1 AND deleted_at IS NULL',
      [geofence_id]
    );
    if (geofence.rows.length === 0) {
      return next(createNotFoundError('Geofence'));
    }
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, geofence_id, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, employee_id, name, email, role, department_id, geofence_id, phone, created_at`,
    [employee_id, name, email, password_hash, role, department_id, geofence_id, phone]
  );

  const newUser = result.rows[0];

  logger.logAuth('register', newUser.id, {
    employee_id: newUser.employee_id,
    role: newUser.role,
    department_id: newUser.department_id,
  });

  createSendToken(newUser, 201, res, 'User registered successfully');
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authRateLimit, loginValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const { email, password } = req.body;

  // Check if user exists and get password
  const result = await query(
    `SELECT id, employee_id, name, email, password_hash, role, department_id, geofence_id, is_active
     FROM users 
     WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );

  if (result.rows.length === 0) {
    logger.logAuth('login_failed', null, { email, reason: 'user_not_found' });
    return next(createAuthError('Invalid email or password'));
  }

  const user = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    logger.logAuth('login_failed', user.id, { reason: 'account_inactive' });
    return next(createAuthError('Account is inactive. Please contact administrator.'));
  }

  // Check password
  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordCorrect) {
    logger.logAuth('login_failed', user.id, { reason: 'invalid_password' });
    return next(createAuthError('Invalid email or password'));
  }

  // Update last login
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  logger.logAuth('login_success', user.id, {
    employee_id: user.employee_id,
    role: user.role,
  });

  createSendToken(user, 200, res, 'Login successful');
}));

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', refreshToken);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, catchAsync(async (req, res, next) => {
  const result = await query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at,
            d.name as department_name, g.name as geofence_name, g.latitude, g.longitude, g.radius_meters
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN geofences g ON u.geofence_id = g.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return next(createNotFoundError('User'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: result.rows[0],
    },
  });
}));

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
router.patch('/profile', protect, [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
], catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const { name, phone } = req.body;
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (name) {
    updateFields.push(`name = $${paramCount}`);
    updateValues.push(name);
    paramCount++;
  }

  if (phone) {
    updateFields.push(`phone = $${paramCount}`);
    updateValues.push(phone);
    paramCount++;
  }

  if (updateFields.length === 0) {
    return next(createValidationError('No valid fields provided for update'));
  }

  updateValues.push(req.user.id);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, employee_id, name, email, role, phone, updated_at`,
    updateValues
  );

  logger.logAuth('profile_updated', req.user.id, { updatedFields: Object.keys(req.body) });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: result.rows[0],
    },
  });
}));

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
router.patch('/change-password', protect, changePasswordValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const { currentPassword, newPassword } = req.body;

  // Get current password hash
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );

  const user = result.rows[0];

  // Verify current password
  const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordCorrect) {
    return next(createAuthError('Current password is incorrect'));
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, req.user.id]
  );

  logger.logAuth('password_changed', req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
  });
}));

// @desc    Check authentication status
// @route   GET /api/auth/status
// @access  Public
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authentication service is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;