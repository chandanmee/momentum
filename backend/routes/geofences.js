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
const createGeofenceValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('radius_meters')
    .isInt({ min: 10, max: 10000 })
    .withMessage('Radius must be between 10 and 10,000 meters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address cannot exceed 255 characters'),
];

const updateGeofenceValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('radius_meters')
    .optional()
    .isInt({ min: 10, max: 10000 })
    .withMessage('Radius must be between 10 and 10,000 meters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address cannot exceed 255 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value'),
];

const geofenceIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Geofence ID must be a positive integer'),
];

// Helper function to check validation errors
const checkValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw createValidationError(errorMessages);
  }
};

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// @desc    Get all geofences
// @route   GET /api/geofences
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
  let whereConditions = ['g.deleted_at IS NULL'];
  let queryParams = [];
  let paramCount = 1;

  if (search) {
    whereConditions.push(`(g.name ILIKE $${paramCount} OR g.description ILIKE $${paramCount + 1} OR g.address ILIKE $${paramCount + 2})`);
    queryParams.push(searchPattern, searchPattern, searchPattern);
    paramCount += 3;
  }

  if (is_active !== '') {
    whereConditions.push(`g.is_active = $${paramCount}`);
    queryParams.push(is_active === 'true');
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Validate sort parameters
  const validSortFields = ['name', 'created_at', 'radius_meters'];
  const validSortOrders = ['asc', 'desc'];
  
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM geofences g
     WHERE ${whereClause}`,
    queryParams
  );

  const totalGeofences = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalGeofences / parseInt(limit));

  // Get geofences with pagination
  queryParams.push(parseInt(limit), offset);
  const geofencesResult = await query(
    `SELECT g.id, g.name, g.latitude, g.longitude, g.radius_meters, g.description, 
            g.address, g.is_active, g.created_at, g.updated_at,
            COUNT(u.id) as assigned_users_count
     FROM geofences g
     LEFT JOIN users u ON g.id = u.geofence_id AND u.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY g.id, g.name, g.latitude, g.longitude, g.radius_meters, g.description, 
              g.address, g.is_active, g.created_at, g.updated_at
     ORDER BY g.${sortField} ${sortOrder}
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: geofencesResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalGeofences,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      geofences: geofencesResult.rows.map(geofence => ({
        ...geofence,
        assignedUsersCount: parseInt(geofence.assigned_users_count)
      })),
    },
  });
}));

// @desc    Get single geofence
// @route   GET /api/geofences/:id
// @access  Private
router.get('/:id', geofenceIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const geofenceId = parseInt(req.params.id);

  const result = await query(
    `SELECT g.id, g.name, g.latitude, g.longitude, g.radius_meters, g.description, 
            g.address, g.is_active, g.created_at, g.updated_at,
            COUNT(u.id) as assigned_users_count
     FROM geofences g
     LEFT JOIN users u ON g.id = u.geofence_id AND u.deleted_at IS NULL
     WHERE g.id = $1 AND g.deleted_at IS NULL
     GROUP BY g.id, g.name, g.latitude, g.longitude, g.radius_meters, g.description, 
              g.address, g.is_active, g.created_at, g.updated_at`,
    [geofenceId]
  );

  if (result.rows.length === 0) {
    return next(createNotFoundError('Geofence'));
  }

  const geofence = result.rows[0];

  // Get assigned users if admin/manager
  let assignedUsers = [];
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    const usersResult = await query(
      `SELECT u.id, u.employee_id, u.name, u.email, d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
       WHERE u.geofence_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.name`,
      [geofenceId]
    );
    assignedUsers = usersResult.rows;
  }

  res.status(200).json({
    status: 'success',
    data: {
      geofence: {
        ...geofence,
        assignedUsersCount: parseInt(geofence.assigned_users_count),
        assignedUsers
      },
    },
  });
}));

// @desc    Create new geofence
// @route   POST /api/geofences
// @access  Private/Admin
router.post('/', restrictTo('admin'), createGeofenceValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const {
    name,
    latitude,
    longitude,
    radius_meters,
    description,
    address
  } = req.body;

  // Check if geofence with same name already exists
  const existingGeofence = await query(
    'SELECT id FROM geofences WHERE name = $1 AND deleted_at IS NULL',
    [name]
  );

  if (existingGeofence.rows.length > 0) {
    return next(createConflictError('Geofence with this name already exists'));
  }

  // Check for overlapping geofences (optional warning)
  const nearbyGeofences = await query(
    `SELECT id, name, latitude, longitude, radius_meters
     FROM geofences 
     WHERE deleted_at IS NULL AND is_active = true`,
    []
  );

  const overlappingGeofences = nearbyGeofences.rows.filter(geofence => {
    const distance = calculateDistance(
      latitude,
      longitude,
      parseFloat(geofence.latitude),
      parseFloat(geofence.longitude)
    );
    return distance < (radius_meters + geofence.radius_meters);
  });

  // Create geofence
  const result = await query(
    `INSERT INTO geofences (name, latitude, longitude, radius_meters, description, address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, latitude, longitude, radius_meters, description, address, is_active, created_at`,
    [name, latitude, longitude, radius_meters, description, address]
  );

  const newGeofence = result.rows[0];

  logger.logActivity('geofence_created', req.user.id, {
    geofence_id: newGeofence.id,
    name: newGeofence.name,
    location: { latitude, longitude },
    radius_meters,
    overlapping_count: overlappingGeofences.length
  });

  res.status(201).json({
    status: 'success',
    message: 'Geofence created successfully',
    data: {
      geofence: newGeofence,
      warnings: overlappingGeofences.length > 0 ? [
        `This geofence overlaps with ${overlappingGeofences.length} existing geofence(s): ${overlappingGeofences.map(g => g.name).join(', ')}`
      ] : []
    },
  });
}));

// @desc    Update geofence
// @route   PATCH /api/geofences/:id
// @access  Private/Admin
router.patch('/:id', restrictTo('admin'), geofenceIdValidation, updateGeofenceValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const geofenceId = parseInt(req.params.id);
  const updateData = req.body;

  // Check if geofence exists
  const existingGeofence = await query(
    'SELECT id, name FROM geofences WHERE id = $1 AND deleted_at IS NULL',
    [geofenceId]
  );

  if (existingGeofence.rows.length === 0) {
    return next(createNotFoundError('Geofence'));
  }

  const currentGeofence = existingGeofence.rows[0];

  // Check for duplicate name if name is being updated
  if (updateData.name && updateData.name !== currentGeofence.name) {
    const duplicateCheck = await query(
      'SELECT id FROM geofences WHERE name = $1 AND id != $2 AND deleted_at IS NULL',
      [updateData.name, geofenceId]
    );

    if (duplicateCheck.rows.length > 0) {
      return next(createConflictError('Geofence with this name already exists'));
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  const allowedFields = ['name', 'latitude', 'longitude', 'radius_meters', 'description', 'address', 'is_active'];
  
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

  updateValues.push(geofenceId);

  const result = await query(
    `UPDATE geofences SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount}
     RETURNING id, name, latitude, longitude, radius_meters, description, address, is_active, updated_at`,
    updateValues
  );

  logger.logActivity('geofence_updated', req.user.id, {
    geofence_id: geofenceId,
    updated_fields: Object.keys(updateData),
  });

  res.status(200).json({
    status: 'success',
    message: 'Geofence updated successfully',
    data: {
      geofence: result.rows[0],
    },
  });
}));

// @desc    Delete geofence (soft delete)
// @route   DELETE /api/geofences/:id
// @access  Private/Admin
router.delete('/:id', restrictTo('admin'), geofenceIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const geofenceId = parseInt(req.params.id);

  // Check if geofence exists
  const existingGeofence = await query(
    'SELECT id, name FROM geofences WHERE id = $1 AND deleted_at IS NULL',
    [geofenceId]
  );

  if (existingGeofence.rows.length === 0) {
    return next(createNotFoundError('Geofence'));
  }

  // Check if geofence is assigned to any users
  const assignedUsers = await query(
    'SELECT COUNT(*) as count FROM users WHERE geofence_id = $1 AND deleted_at IS NULL',
    [geofenceId]
  );

  const userCount = parseInt(assignedUsers.rows[0].count);

  if (userCount > 0) {
    return next(new AppError(`Cannot delete geofence. It is currently assigned to ${userCount} user(s). Please reassign users first.`, 400));
  }

  // Soft delete geofence
  await query(
    'UPDATE geofences SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1',
    [geofenceId]
  );

  logger.logActivity('geofence_deleted', req.user.id, {
    geofence_id: geofenceId,
    name: existingGeofence.rows[0].name,
  });

  res.status(200).json({
    status: 'success',
    message: 'Geofence deleted successfully',
  });
}));

// @desc    Restore deleted geofence
// @route   PATCH /api/geofences/:id/restore
// @access  Private/Admin
router.patch('/:id/restore', restrictTo('admin'), geofenceIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const geofenceId = parseInt(req.params.id);

  // Check if geofence exists and is deleted
  const existingGeofence = await query(
    'SELECT id, name FROM geofences WHERE id = $1 AND deleted_at IS NOT NULL',
    [geofenceId]
  );

  if (existingGeofence.rows.length === 0) {
    return next(createNotFoundError('Deleted geofence'));
  }

  // Restore geofence
  const result = await query(
    `UPDATE geofences SET deleted_at = NULL, is_active = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, latitude, longitude, radius_meters, description, address, is_active`,
    [geofenceId]
  );

  logger.logActivity('geofence_restored', req.user.id, {
    geofence_id: geofenceId,
    name: existingGeofence.rows[0].name,
  });

  res.status(200).json({
    status: 'success',
    message: 'Geofence restored successfully',
    data: {
      geofence: result.rows[0],
    },
  });
}));

// @desc    Test location against geofence
// @route   POST /api/geofences/:id/test
// @access  Private
router.post('/:id/test', geofenceIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const geofenceId = parseInt(req.params.id);
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return next(createValidationError('Latitude and longitude are required'));
  }

  if (latitude < -90 || latitude > 90) {
    return next(createValidationError('Latitude must be between -90 and 90'));
  }

  if (longitude < -180 || longitude > 180) {
    return next(createValidationError('Longitude must be between -180 and 180'));
  }

  // Get geofence details
  const geofenceResult = await query(
    'SELECT id, name, latitude, longitude, radius_meters FROM geofences WHERE id = $1 AND deleted_at IS NULL',
    [geofenceId]
  );

  if (geofenceResult.rows.length === 0) {
    return next(createNotFoundError('Geofence'));
  }

  const geofence = geofenceResult.rows[0];

  // Calculate distance
  const distance = calculateDistance(
    latitude,
    longitude,
    parseFloat(geofence.latitude),
    parseFloat(geofence.longitude)
  );

  const isWithinGeofence = distance <= geofence.radius_meters;

  res.status(200).json({
    status: 'success',
    data: {
      geofence: {
        id: geofence.id,
        name: geofence.name,
        center: {
          latitude: parseFloat(geofence.latitude),
          longitude: parseFloat(geofence.longitude)
        },
        radius: geofence.radius_meters
      },
      testLocation: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      result: {
        isWithinGeofence,
        distance: Math.round(distance),
        message: isWithinGeofence 
          ? `Location is within the geofence (${Math.round(distance)}m from center)` 
          : `Location is outside the geofence (${Math.round(distance - geofence.radius_meters)}m beyond boundary)`
      }
    },
  });
}));

// @desc    Get geofence statistics
// @route   GET /api/geofences/stats/overview
// @access  Private/Admin
router.get('/stats/overview', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_geofences,
      COUNT(*) FILTER (WHERE is_active = true) as active_geofences,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_geofences,
      AVG(radius_meters) as avg_radius,
      MIN(radius_meters) as min_radius,
      MAX(radius_meters) as max_radius
    FROM geofences 
    WHERE deleted_at IS NULL
  `);

  const usageStats = await query(`
    SELECT 
      g.id,
      g.name,
      COUNT(u.id) as assigned_users,
      COUNT(p.id) as total_punches
    FROM geofences g
    LEFT JOIN users u ON g.id = u.geofence_id AND u.deleted_at IS NULL
    LEFT JOIN punches p ON u.id = p.user_id
    WHERE g.deleted_at IS NULL
    GROUP BY g.id, g.name
    ORDER BY assigned_users DESC, total_punches DESC
    LIMIT 10
  `);

  res.status(200).json({
    status: 'success',
    data: {
      overview: {
        ...stats.rows[0],
        avgRadius: Math.round(parseFloat(stats.rows[0].avg_radius) || 0),
        minRadius: parseInt(stats.rows[0].min_radius) || 0,
        maxRadius: parseInt(stats.rows[0].max_radius) || 0
      },
      topGeofences: usageStats.rows.map(geofence => ({
        ...geofence,
        assignedUsers: parseInt(geofence.assigned_users),
        totalPunches: parseInt(geofence.total_punches)
      }))
    },
  });
}));

module.exports = router;