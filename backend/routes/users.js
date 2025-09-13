const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query: expressQuery, param, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { protect, restrictTo } = require('../middleware/auth');
const { 
  AppError, 
  catchAsync, 
  createValidationError, 
  createNotFoundError,
  createConflictError 
} = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Validation rules
const createUserValidation = [
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

const updateUserValidation = [
  body('employee_id')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Employee ID must be between 3 and 50 characters'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
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
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
];

const userIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
];

// Helper function to check validation errors
const checkValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw createValidationError(errorMessages);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    department_id = '',
    is_active = '',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchPattern = `%${search}%`;

  // Build WHERE clause
  let whereConditions = ['u.deleted_at IS NULL'];
  let queryParams = [];
  let paramCount = 1;

  if (search) {
    whereConditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount + 1} OR u.employee_id ILIKE $${paramCount + 2})`);
    queryParams.push(searchPattern, searchPattern, searchPattern);
    paramCount += 3;
  }

  if (role) {
    whereConditions.push(`u.role = $${paramCount}`);
    queryParams.push(role);
    paramCount++;
  }

  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  if (is_active !== '') {
    whereConditions.push(`u.is_active = $${paramCount}`);
    queryParams.push(is_active === 'true');
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Validate sort parameters
  const validSortFields = ['name', 'email', 'employee_id', 'role', 'created_at', 'last_login'];
  const validSortOrders = ['asc', 'desc'];
  
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM users u
     WHERE ${whereClause}`,
    queryParams
  );

  const totalUsers = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalUsers / parseInt(limit));

  // Get users with pagination
  queryParams.push(parseInt(limit), offset);
  const usersResult = await query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.phone, u.is_active, u.last_login, u.created_at,
            d.name as department_name, g.name as geofence_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     LEFT JOIN geofences g ON u.geofence_id = g.id AND g.deleted_at IS NULL
     WHERE ${whereClause}
     ORDER BY u.${sortField} ${sortOrder}
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: usersResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalUsers,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      users: usersResult.rows,
    },
  });
}));

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin or Own Profile
router.get('/:id', userIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const userId = parseInt(req.params.id);

  // Allow users to view their own profile or admins to view any profile
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return next(new AppError('You can only access your own profile', 403));
  }

  const result = await query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.phone, u.avatar_url, u.is_active, 
            u.last_login, u.created_at, u.updated_at,
            d.id as department_id, d.name as department_name,
            g.id as geofence_id, g.name as geofence_name, g.latitude, g.longitude, g.radius_meters
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     LEFT JOIN geofences g ON u.geofence_id = g.id AND g.deleted_at IS NULL
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
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

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
router.post('/', restrictTo('admin'), createUserValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const {
    employee_id,
    name,
    email,
    password,
    role,
    department_id,
    geofence_id,
    phone
  } = req.body;

  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE (email = $1 OR employee_id = $2) AND deleted_at IS NULL',
    [email, employee_id]
  );

  if (existingUser.rows.length > 0) {
    return next(createConflictError('User with this email or employee ID already exists'));
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
     RETURNING id, employee_id, name, email, role, department_id, geofence_id, phone, is_active, created_at`,
    [employee_id, name, email, password_hash, role, department_id, geofence_id, phone]
  );

  const newUser = result.rows[0];

  logger.logAuth('user_created', req.user.id, {
    created_user_id: newUser.id,
    employee_id: newUser.employee_id,
    role: newUser.role,
  });

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: newUser,
    },
  });
}));

// @desc    Update user
// @route   PATCH /api/users/:id
// @access  Private/Admin
router.patch('/:id', restrictTo('admin'), userIdValidation, updateUserValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const userId = parseInt(req.params.id);
  const updateData = req.body;

  // Check if user exists
  const existingUser = await query(
    'SELECT id, employee_id, email FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (existingUser.rows.length === 0) {
    return next(createNotFoundError('User'));
  }

  const currentUser = existingUser.rows[0];

  // Check for duplicate email or employee_id if they're being updated
  if (updateData.email || updateData.employee_id) {
    const duplicateCheck = await query(
      'SELECT id FROM users WHERE (email = $1 OR employee_id = $2) AND id != $3 AND deleted_at IS NULL',
      [updateData.email || currentUser.email, updateData.employee_id || currentUser.employee_id, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return next(createConflictError('User with this email or employee ID already exists'));
    }
  }

  // Validate department exists if provided
  if (updateData.department_id) {
    const department = await query(
      'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL',
      [updateData.department_id]
    );
    if (department.rows.length === 0) {
      return next(createNotFoundError('Department'));
    }
  }

  // Validate geofence exists if provided
  if (updateData.geofence_id) {
    const geofence = await query(
      'SELECT id FROM geofences WHERE id = $1 AND deleted_at IS NULL',
      [updateData.geofence_id]
    );
    if (geofence.rows.length === 0) {
      return next(createNotFoundError('Geofence'));
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  const allowedFields = ['employee_id', 'name', 'email', 'role', 'department_id', 'geofence_id', 'phone', 'is_active'];
  
  for (const field of allowedFields) {
    if (updateData.hasOwnProperty(field)) {
      updateFields.push(`${field} = $${paramCount}`);
      updateValues.push(updateData[field]);
      paramCount++;
    }
  }

  if (updateFields.length === 0) {
    return next(createValidationError('No valid fields provided for update'));
  }

  updateValues.push(userId);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, employee_id, name, email, role, department_id, geofence_id, phone, is_active, updated_at`,
    updateValues
  );

  logger.logAuth('user_updated', req.user.id, {
    updated_user_id: userId,
    updated_fields: Object.keys(updateData),
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: result.rows[0],
    },
  });
}));

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', restrictTo('admin'), userIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const userId = parseInt(req.params.id);

  // Prevent admin from deleting themselves
  if (req.user.id === userId) {
    return next(new AppError('You cannot delete your own account', 400));
  }

  // Check if user exists
  const existingUser = await query(
    'SELECT id, employee_id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (existingUser.rows.length === 0) {
    return next(createNotFoundError('User'));
  }

  // Soft delete user
  await query(
    'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1',
    [userId]
  );

  logger.logAuth('user_deleted', req.user.id, {
    deleted_user_id: userId,
    employee_id: existingUser.rows[0].employee_id,
  });

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
  });
}));

// @desc    Restore deleted user
// @route   PATCH /api/users/:id/restore
// @access  Private/Admin
router.patch('/:id/restore', restrictTo('admin'), userIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const userId = parseInt(req.params.id);

  // Check if user exists and is deleted
  const existingUser = await query(
    'SELECT id, employee_id FROM users WHERE id = $1 AND deleted_at IS NOT NULL',
    [userId]
  );

  if (existingUser.rows.length === 0) {
    return next(createNotFoundError('Deleted user'));
  }

  // Restore user
  const result = await query(
    `UPDATE users SET deleted_at = NULL, is_active = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, employee_id, name, email, role, is_active`,
    [userId]
  );

  logger.logAuth('user_restored', req.user.id, {
    restored_user_id: userId,
    employee_id: existingUser.rows[0].employee_id,
  });

  res.status(200).json({
    status: 'success',
    message: 'User restored successfully',
    data: {
      user: result.rows[0],
    },
  });
}));

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
router.get('/stats/overview', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE is_active = true) as active_users,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
      COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
      COUNT(*) FILTER (WHERE role = 'manager') as manager_users,
      COUNT(*) FILTER (WHERE role = 'employee') as employee_users,
      COUNT(*) FILTER (WHERE last_login >= CURRENT_DATE - INTERVAL '7 days') as recent_logins
    FROM users 
    WHERE deleted_at IS NULL
  `);

  const departmentStats = await query(`
    SELECT 
      d.name as department_name,
      COUNT(u.id) as user_count
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name
    ORDER BY user_count DESC
  `);

  res.status(200).json({
    status: 'success',
    data: {
      overview: stats.rows[0],
      departmentBreakdown: departmentStats.rows,
    },
  });
}));

module.exports = router;