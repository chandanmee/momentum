const express = require('express');
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

// Protect all routes
router.use(protect);

// Validation rules
const createDepartmentValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('manager_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a positive integer'),
];

const updateDepartmentValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('manager_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a positive integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
];

const departmentIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Department ID must be a positive integer'),
];

// Helper function to check validation errors
const checkValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw createValidationError(errorMessages);
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
router.get('/', catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    is_active = '',
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchPattern = `%${search}%`;

  // Build WHERE clause
  let whereConditions = ['d.deleted_at IS NULL'];
  let queryParams = [];
  let paramCount = 1;

  if (search) {
    whereConditions.push(`(d.name ILIKE $${paramCount} OR d.description ILIKE $${paramCount + 1})`);
    queryParams.push(searchPattern, searchPattern);
    paramCount += 2;
  }

  if (is_active !== '') {
    whereConditions.push(`d.is_active = $${paramCount}`);
    queryParams.push(is_active === 'true');
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Validate sort parameters
  const validSortFields = ['name', 'created_at', 'employee_count'];
  const validSortOrders = ['asc', 'desc'];
  
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM departments d
     WHERE ${whereClause}`,
    queryParams
  );

  const totalDepartments = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalDepartments / parseInt(limit));

  // Get departments with pagination
  queryParams.push(parseInt(limit), offset);
  const departmentsResult = await query(
    `SELECT d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at,
            m.name as manager_name, m.employee_id as manager_employee_id,
            COUNT(u.id) as employee_count
     FROM departments d
     LEFT JOIN users m ON d.manager_id = m.id AND m.deleted_at IS NULL
     LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at,
              m.name, m.employee_id
     ORDER BY ${sortField === 'employee_count' ? 'COUNT(u.id)' : 'd.' + sortField} ${sortOrder}
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: departmentsResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalDepartments,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      departments: departmentsResult.rows.map(dept => ({
        ...dept,
        employeeCount: parseInt(dept.employee_count)
      })),
    },
  });
}));

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
router.get('/:id', departmentIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const departmentId = parseInt(req.params.id);

  const result = await query(
    `SELECT d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at,
            d.manager_id, m.name as manager_name, m.employee_id as manager_employee_id, m.email as manager_email,
            COUNT(u.id) as employee_count
     FROM departments d
     LEFT JOIN users m ON d.manager_id = m.id AND m.deleted_at IS NULL
     LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
     WHERE d.id = $1 AND d.deleted_at IS NULL
     GROUP BY d.id, d.name, d.description, d.is_active, d.created_at, d.updated_at,
              d.manager_id, m.name, m.employee_id, m.email`,
    [departmentId]
  );

  if (result.rows.length === 0) {
    return next(createNotFoundError('Department'));
  }

  const department = result.rows[0];

  // Get department employees if admin/manager or if user belongs to this department
  let employees = [];
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.department_id === departmentId) {
    const employeesResult = await query(
      `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.is_active, u.last_login
       FROM users u
       WHERE u.department_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.name`,
      [departmentId]
    );
    employees = employeesResult.rows;
  }

  res.status(200).json({
    status: 'success',
    data: {
      department: {
        ...department,
        employeeCount: parseInt(department.employee_count),
        employees
      },
    },
  });
}));

// @desc    Create new department
// @route   POST /api/departments
// @access  Private/Admin
router.post('/', restrictTo('admin'), createDepartmentValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const {
    name,
    description,
    manager_id
  } = req.body;

  // Check if department with same name already exists
  const existingDepartment = await query(
    'SELECT id FROM departments WHERE name = $1 AND deleted_at IS NULL',
    [name]
  );

  if (existingDepartment.rows.length > 0) {
    return next(createConflictError('Department with this name already exists'));
  }

  // Validate manager exists if provided
  if (manager_id) {
    const manager = await query(
      'SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [manager_id]
    );
    if (manager.rows.length === 0) {
      return next(createNotFoundError('Manager'));
    }
    
    // Check if user has appropriate role to be a manager
    if (!['admin', 'manager'].includes(manager.rows[0].role)) {
      return next(new AppError('Selected user must have admin or manager role', 400));
    }
  }

  // Create department
  const result = await query(
    `INSERT INTO departments (name, description, manager_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, manager_id, is_active, created_at`,
    [name, description, manager_id]
  );

  const newDepartment = result.rows[0];

  logger.logActivity('department_created', req.user.id, {
    department_id: newDepartment.id,
    name: newDepartment.name,
    manager_id: manager_id
  });

  res.status(201).json({
    status: 'success',
    message: 'Department created successfully',
    data: {
      department: newDepartment,
    },
  });
}));

// @desc    Update department
// @route   PATCH /api/departments/:id
// @access  Private/Admin
router.patch('/:id', restrictTo('admin'), departmentIdValidation, updateDepartmentValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const departmentId = parseInt(req.params.id);
  const updateData = req.body;

  // Check if department exists
  const existingDepartment = await query(
    'SELECT id, name FROM departments WHERE id = $1 AND deleted_at IS NULL',
    [departmentId]
  );

  if (existingDepartment.rows.length === 0) {
    return next(createNotFoundError('Department'));
  }

  const currentDepartment = existingDepartment.rows[0];

  // Check for duplicate name if name is being updated
  if (updateData.name && updateData.name !== currentDepartment.name) {
    const duplicateCheck = await query(
      'SELECT id FROM departments WHERE name = $1 AND id != $2 AND deleted_at IS NULL',
      [updateData.name, departmentId]
    );

    if (duplicateCheck.rows.length > 0) {
      return next(createConflictError('Department with this name already exists'));
    }
  }

  // Validate manager exists if provided
  if (updateData.manager_id) {
    const manager = await query(
      'SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [updateData.manager_id]
    );
    if (manager.rows.length === 0) {
      return next(createNotFoundError('Manager'));
    }
    
    // Check if user has appropriate role to be a manager
    if (!['admin', 'manager'].includes(manager.rows[0].role)) {
      return next(new AppError('Selected user must have admin or manager role', 400));
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  const allowedFields = ['name', 'description', 'manager_id', 'is_active'];
  
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

  updateValues.push(departmentId);

  const result = await query(
    `UPDATE departments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, name, description, manager_id, is_active, updated_at`,
    updateValues
  );

  logger.logActivity('department_updated', req.user.id, {
    department_id: departmentId,
    updated_fields: Object.keys(updateData),
  });

  res.status(200).json({
    status: 'success',
    message: 'Department updated successfully',
    data: {
      department: result.rows[0],
    },
  });
}));

// @desc    Delete department (soft delete)
// @route   DELETE /api/departments/:id
// @access  Private/Admin
router.delete('/:id', restrictTo('admin'), departmentIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const departmentId = parseInt(req.params.id);

  // Check if department exists
  const existingDepartment = await query(
    'SELECT id, name FROM departments WHERE id = $1 AND deleted_at IS NULL',
    [departmentId]
  );

  if (existingDepartment.rows.length === 0) {
    return next(createNotFoundError('Department'));
  }

  // Check if department has employees
  const employeeCount = await query(
    'SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND deleted_at IS NULL',
    [departmentId]
  );

  const count = parseInt(employeeCount.rows[0].count);

  if (count > 0) {
    return next(new AppError(`Cannot delete department. It has ${count} employee(s). Please reassign employees first.`, 400));
  }

  // Soft delete department
  await query(
    'UPDATE departments SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1',
    [departmentId]
  );

  logger.logActivity('department_deleted', req.user.id, {
    department_id: departmentId,
    name: existingDepartment.rows[0].name,
  });

  res.status(200).json({
    status: 'success',
    message: 'Department deleted successfully',
  });
}));

// @desc    Restore deleted department
// @route   PATCH /api/departments/:id/restore
// @access  Private/Admin
router.patch('/:id/restore', restrictTo('admin'), departmentIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const departmentId = parseInt(req.params.id);

  // Check if department exists and is deleted
  const existingDepartment = await query(
    'SELECT id, name FROM departments WHERE id = $1 AND deleted_at IS NOT NULL',
    [departmentId]
  );

  if (existingDepartment.rows.length === 0) {
    return next(createNotFoundError('Deleted department'));
  }

  // Restore department
  const result = await query(
    `UPDATE departments SET deleted_at = NULL, is_active = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, description, manager_id, is_active`,
    [departmentId]
  );

  logger.logActivity('department_restored', req.user.id, {
    department_id: departmentId,
    name: existingDepartment.rows[0].name,
  });

  res.status(200).json({
    status: 'success',
    message: 'Department restored successfully',
    data: {
      department: result.rows[0],
    },
  });
}));

// @desc    Get department statistics
// @route   GET /api/departments/stats/overview
// @access  Private/Admin/Manager
router.get('/stats/overview', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_departments,
      COUNT(*) FILTER (WHERE is_active = true) as active_departments,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_departments,
      COUNT(*) FILTER (WHERE manager_id IS NOT NULL) as departments_with_managers
    FROM departments 
    WHERE deleted_at IS NULL
  `);

  const employeeDistribution = await query(`
    SELECT 
      d.id,
      d.name,
      COUNT(u.id) as employee_count,
      COUNT(u.id) FILTER (WHERE u.is_active = true) as active_employees,
      COUNT(u.id) FILTER (WHERE u.role = 'admin') as admin_count,
      COUNT(u.id) FILTER (WHERE u.role = 'manager') as manager_count,
      COUNT(u.id) FILTER (WHERE u.role = 'employee') as employee_count_role
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name
    ORDER BY employee_count DESC
  `);

  // Get recent activity (last 30 days)
  const recentActivity = await query(`
    SELECT 
      d.name as department_name,
      COUNT(p.id) as total_punches,
      COUNT(DISTINCT p.user_id) as active_users,
      AVG(CASE WHEN p.punch_out_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
        ELSE NULL END) as avg_hours_per_punch
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
    LEFT JOIN punches p ON u.id = p.user_id AND p.punch_in_time >= CURRENT_DATE - INTERVAL '30 days'
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name
    HAVING COUNT(p.id) > 0
    ORDER BY total_punches DESC
    LIMIT 10
  `);

  res.status(200).json({
    status: 'success',
    data: {
      overview: stats.rows[0],
      employeeDistribution: employeeDistribution.rows.map(dept => ({
        ...dept,
        employeeCount: parseInt(dept.employee_count),
        activeEmployees: parseInt(dept.active_employees),
        adminCount: parseInt(dept.admin_count),
        managerCount: parseInt(dept.manager_count),
        employeeCountRole: parseInt(dept.employee_count_role)
      })),
      recentActivity: recentActivity.rows.map(dept => ({
        ...dept,
        totalPunches: parseInt(dept.total_punches),
        activeUsers: parseInt(dept.active_users),
        avgHoursPerPunch: dept.avg_hours_per_punch ? parseFloat(dept.avg_hours_per_punch.toFixed(2)) : 0
      }))
    },
  });
}));

// @desc    Get department employees
// @route   GET /api/departments/:id/employees
// @access  Private
router.get('/:id/employees', departmentIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const departmentId = parseInt(req.params.id);
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    is_active = ''
  } = req.query;

  // Check if department exists
  const department = await query(
    'SELECT id, name FROM departments WHERE id = $1 AND deleted_at IS NULL',
    [departmentId]
  );

  if (department.rows.length === 0) {
    return next(createNotFoundError('Department'));
  }

  // Check access permissions
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.department_id !== departmentId) {
    return next(new AppError('You can only view employees from your own department', 403));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchPattern = `%${search}%`;

  // Build WHERE clause
  let whereConditions = ['u.department_id = $1', 'u.deleted_at IS NULL'];
  let queryParams = [departmentId];
  let paramCount = 2;

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

  if (is_active !== '') {
    whereConditions.push(`u.is_active = $${paramCount}`);
    queryParams.push(is_active === 'true');
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
    queryParams
  );

  const totalEmployees = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalEmployees / parseInt(limit));

  // Get employees with pagination
  queryParams.push(parseInt(limit), offset);
  const employeesResult = await query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.phone, u.is_active, u.last_login, u.created_at,
            g.name as geofence_name
     FROM users u
     LEFT JOIN geofences g ON u.geofence_id = g.id AND g.deleted_at IS NULL
     WHERE ${whereClause}
     ORDER BY u.name
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: employeesResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalEmployees,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      department: department.rows[0],
      employees: employeesResult.rows,
    },
  });
}));

module.exports = router;