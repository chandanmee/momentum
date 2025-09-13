const express = require('express');
const { body, query: expressQuery, param, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { protect, restrictTo, validateGeofenceAccess } = require('../middleware/auth');
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
const punchValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

const punchIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Punch ID must be a positive integer'),
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

// Helper function to validate geofence
const validatePunchLocation = async (userId, latitude, longitude) => {
  // Get user's assigned geofence
  const userResult = await query(
    `SELECT u.geofence_id, g.latitude, g.longitude, g.radius_meters, g.name as geofence_name
     FROM users u
     LEFT JOIN geofences g ON u.geofence_id = g.id AND g.deleted_at IS NULL
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  const user = userResult.rows[0];

  // If no geofence assigned, allow punch from anywhere
  if (!user.geofence_id) {
    return {
      isValid: true,
      distance: null,
      geofenceName: null,
      message: 'No geofence restriction'
    };
  }

  // Calculate distance from geofence center
  const distance = calculateDistance(
    latitude,
    longitude,
    parseFloat(user.latitude),
    parseFloat(user.longitude)
  );

  const isValid = distance <= user.radius_meters;

  return {
    isValid,
    distance: Math.round(distance),
    geofenceName: user.geofence_name,
    allowedRadius: user.radius_meters,
    message: isValid 
      ? 'Location validated successfully' 
      : `You are ${Math.round(distance - user.radius_meters)}m outside the allowed area`
  };
};

// @desc    Get current punch status
// @route   GET /api/punches/status
// @access  Private
router.get('/status', catchAsync(async (req, res, next) => {
  const result = await query(
    `SELECT id, punch_in_time, punch_in_lat, punch_in_lon, is_valid_geofence, notes
     FROM punches 
     WHERE user_id = $1 AND punch_out_time IS NULL
     ORDER BY punch_in_time DESC
     LIMIT 1`,
    [req.user.id]
  );

  const isPunchedIn = result.rows.length > 0;
  const currentPunch = isPunchedIn ? result.rows[0] : null;

  // Get today's punches summary
  const todayResult = await query(
    `SELECT 
       COUNT(*) as total_punches,
       SUM(CASE WHEN punch_out_time IS NOT NULL THEN 
         EXTRACT(EPOCH FROM (punch_out_time - punch_in_time))/3600 
         ELSE 0 END) as hours_worked_today
     FROM punches 
     WHERE user_id = $1 AND DATE(punch_in_time) = CURRENT_DATE`,
    [req.user.id]
  );

  const todayStats = todayResult.rows[0];

  res.status(200).json({
    status: 'success',
    data: {
      isPunchedIn,
      currentPunch,
      todayStats: {
        totalPunches: parseInt(todayStats.total_punches),
        hoursWorked: parseFloat(todayStats.hours_worked_today) || 0
      }
    },
  });
}));

// @desc    Punch in
// @route   POST /api/punches/in
// @access  Private
router.post('/in', punchValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const { latitude, longitude, notes } = req.body;
  const userId = req.user.id;

  // Check if user is already punched in
  const existingPunch = await query(
    'SELECT id FROM punches WHERE user_id = $1 AND punch_out_time IS NULL',
    [userId]
  );

  if (existingPunch.rows.length > 0) {
    return next(new AppError('You are already punched in. Please punch out first.', 400));
  }

  // Validate location against geofence
  const locationValidation = await validatePunchLocation(userId, latitude, longitude);

  // Create punch record
  const result = await query(
    `INSERT INTO punches (user_id, punch_in_time, punch_in_lat, punch_in_lon, is_valid_geofence, notes)
     VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)
     RETURNING id, punch_in_time, punch_in_lat, punch_in_lon, is_valid_geofence, notes`,
    [userId, latitude, longitude, locationValidation.isValid, notes]
  );

  const newPunch = result.rows[0];

  // Log the punch in activity
  logger.logActivity('punch_in', userId, {
    punch_id: newPunch.id,
    location: { latitude, longitude },
    is_valid_geofence: locationValidation.isValid,
    distance: locationValidation.distance,
    geofence_name: locationValidation.geofenceName
  });

  res.status(201).json({
    status: 'success',
    message: locationValidation.isValid 
      ? 'Punched in successfully' 
      : 'Punched in with location warning',
    data: {
      punch: newPunch,
      locationValidation
    },
  });
}));

// @desc    Punch out
// @route   PATCH /api/punches/out
// @access  Private
router.patch('/out', punchValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const { latitude, longitude, notes } = req.body;
  const userId = req.user.id;

  // Find active punch
  const activePunch = await query(
    'SELECT id, punch_in_time, punch_in_lat, punch_in_lon FROM punches WHERE user_id = $1 AND punch_out_time IS NULL',
    [userId]
  );

  if (activePunch.rows.length === 0) {
    return next(new AppError('No active punch found. Please punch in first.', 400));
  }

  const punch = activePunch.rows[0];

  // Validate location against geofence
  const locationValidation = await validatePunchLocation(userId, latitude, longitude);

  // Update punch record
  const result = await query(
    `UPDATE punches 
     SET punch_out_time = CURRENT_TIMESTAMP, 
         punch_out_lat = $1, 
         punch_out_lon = $2, 
         is_valid_geofence_out = $3,
         notes = CASE 
           WHEN notes IS NULL THEN $4
           WHEN $4 IS NULL THEN notes
           ELSE notes || ' | ' || $4
         END
     WHERE id = $5
     RETURNING id, punch_in_time, punch_out_time, punch_in_lat, punch_in_lon, 
               punch_out_lat, punch_out_lon, is_valid_geofence, is_valid_geofence_out, notes`,
    [latitude, longitude, locationValidation.isValid, notes, punch.id]
  );

  const updatedPunch = result.rows[0];

  // Calculate hours worked
  const hoursWorked = (new Date(updatedPunch.punch_out_time) - new Date(updatedPunch.punch_in_time)) / (1000 * 60 * 60);

  // Log the punch out activity
  logger.logActivity('punch_out', userId, {
    punch_id: punch.id,
    location: { latitude, longitude },
    is_valid_geofence: locationValidation.isValid,
    distance: locationValidation.distance,
    hours_worked: hoursWorked.toFixed(2)
  });

  res.status(200).json({
    status: 'success',
    message: locationValidation.isValid 
      ? 'Punched out successfully' 
      : 'Punched out with location warning',
    data: {
      punch: {
        ...updatedPunch,
        hoursWorked: parseFloat(hoursWorked.toFixed(2))
      },
      locationValidation
    },
  });
}));

// @desc    Get user's punch history
// @route   GET /api/punches
// @access  Private
router.get('/', catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    start_date,
    end_date,
    status = 'all' // all, complete, incomplete
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereConditions = ['user_id = $1'];
  let queryParams = [req.user.id];
  let paramCount = 2;

  // Date filtering
  if (start_date) {
    whereConditions.push(`DATE(punch_in_time) >= $${paramCount}`);
    queryParams.push(start_date);
    paramCount++;
  }

  if (end_date) {
    whereConditions.push(`DATE(punch_in_time) <= $${paramCount}`);
    queryParams.push(end_date);
    paramCount++;
  }

  // Status filtering
  if (status === 'complete') {
    whereConditions.push('punch_out_time IS NOT NULL');
  } else if (status === 'incomplete') {
    whereConditions.push('punch_out_time IS NULL');
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM punches WHERE ${whereClause}`,
    queryParams
  );

  const totalPunches = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalPunches / parseInt(limit));

  // Get punches with pagination
  queryParams.push(parseInt(limit), offset);
  const punchesResult = await query(
    `SELECT id, punch_in_time, punch_out_time, punch_in_lat, punch_in_lon, 
            punch_out_lat, punch_out_lon, is_valid_geofence, is_valid_geofence_out, notes,
            CASE 
              WHEN punch_out_time IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (punch_out_time - punch_in_time))/3600
              ELSE NULL
            END as hours_worked
     FROM punches 
     WHERE ${whereClause}
     ORDER BY punch_in_time DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: punchesResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalPunches,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      punches: punchesResult.rows.map(punch => ({
        ...punch,
        hoursWorked: punch.hours_worked ? parseFloat(punch.hours_worked.toFixed(2)) : null
      })),
    },
  });
}));

// @desc    Get all punches (Admin/Manager)
// @route   GET /api/punches/all
// @access  Private/Admin/Manager
router.get('/all', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    start_date,
    end_date,
    user_id,
    department_id,
    status = 'all',
    geofence_valid = 'all'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereConditions = ['p.id IS NOT NULL'];
  let queryParams = [];
  let paramCount = 1;

  // Date filtering
  if (start_date) {
    whereConditions.push(`DATE(p.punch_in_time) >= $${paramCount}`);
    queryParams.push(start_date);
    paramCount++;
  }

  if (end_date) {
    whereConditions.push(`DATE(p.punch_in_time) <= $${paramCount}`);
    queryParams.push(end_date);
    paramCount++;
  }

  // User filtering
  if (user_id) {
    whereConditions.push(`p.user_id = $${paramCount}`);
    queryParams.push(parseInt(user_id));
    paramCount++;
  }

  // Department filtering
  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  // Status filtering
  if (status === 'complete') {
    whereConditions.push('p.punch_out_time IS NOT NULL');
  } else if (status === 'incomplete') {
    whereConditions.push('p.punch_out_time IS NULL');
  }

  // Geofence validation filtering
  if (geofence_valid === 'valid') {
    whereConditions.push('p.is_valid_geofence = true');
  } else if (geofence_valid === 'invalid') {
    whereConditions.push('p.is_valid_geofence = false');
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total 
     FROM punches p
     JOIN users u ON p.user_id = u.id AND u.deleted_at IS NULL
     WHERE ${whereClause}`,
    queryParams
  );

  const totalPunches = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalPunches / parseInt(limit));

  // Get punches with pagination
  queryParams.push(parseInt(limit), offset);
  const punchesResult = await query(
    `SELECT p.id, p.punch_in_time, p.punch_out_time, p.punch_in_lat, p.punch_in_lon, 
            p.punch_out_lat, p.punch_out_lon, p.is_valid_geofence, p.is_valid_geofence_out, p.notes,
            u.name as user_name, u.employee_id, d.name as department_name,
            CASE 
              WHEN p.punch_out_time IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600
              ELSE NULL
            END as hours_worked
     FROM punches p
     JOIN users u ON p.user_id = u.id AND u.deleted_at IS NULL
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE ${whereClause}
     ORDER BY p.punch_in_time DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    queryParams
  );

  res.status(200).json({
    status: 'success',
    results: punchesResult.rows.length,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalPunches,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    },
    data: {
      punches: punchesResult.rows.map(punch => ({
        ...punch,
        hoursWorked: punch.hours_worked ? parseFloat(punch.hours_worked.toFixed(2)) : null
      })),
    },
  });
}));

// @desc    Get single punch
// @route   GET /api/punches/:id
// @access  Private
router.get('/:id', punchIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const punchId = parseInt(req.params.id);
  let whereClause = 'p.id = $1';
  let queryParams = [punchId];

  // Non-admin users can only view their own punches
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    whereClause += ' AND p.user_id = $2';
    queryParams.push(req.user.id);
  }

  const result = await query(
    `SELECT p.id, p.punch_in_time, p.punch_out_time, p.punch_in_lat, p.punch_in_lon, 
            p.punch_out_lat, p.punch_out_lon, p.is_valid_geofence, p.is_valid_geofence_out, p.notes,
            u.name as user_name, u.employee_id, d.name as department_name,
            CASE 
              WHEN p.punch_out_time IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600
              ELSE NULL
            END as hours_worked
     FROM punches p
     JOIN users u ON p.user_id = u.id AND u.deleted_at IS NULL
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE ${whereClause}`,
    queryParams
  );

  if (result.rows.length === 0) {
    return next(createNotFoundError('Punch record'));
  }

  const punch = result.rows[0];

  res.status(200).json({
    status: 'success',
    data: {
      punch: {
        ...punch,
        hoursWorked: punch.hours_worked ? parseFloat(punch.hours_worked.toFixed(2)) : null
      },
    },
  });
}));

// @desc    Update punch notes (Admin only)
// @route   PATCH /api/punches/:id
// @access  Private/Admin
router.patch('/:id', restrictTo('admin'), punchIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const punchId = parseInt(req.params.id);
  const { notes } = req.body;

  if (!notes || notes.trim().length === 0) {
    return next(createValidationError('Notes are required'));
  }

  if (notes.length > 500) {
    return next(createValidationError('Notes cannot exceed 500 characters'));
  }

  // Check if punch exists
  const existingPunch = await query(
    'SELECT id, user_id FROM punches WHERE id = $1',
    [punchId]
  );

  if (existingPunch.rows.length === 0) {
    return next(createNotFoundError('Punch record'));
  }

  // Update punch notes
  const result = await query(
    'UPDATE punches SET notes = $1 WHERE id = $2 RETURNING id, notes',
    [notes.trim(), punchId]
  );

  logger.logActivity('punch_updated', req.user.id, {
    punch_id: punchId,
    updated_by_admin: true,
    notes_updated: true
  });

  res.status(200).json({
    status: 'success',
    message: 'Punch notes updated successfully',
    data: {
      punch: result.rows[0],
    },
  });
}));

// @desc    Delete punch (Admin only)
// @route   DELETE /api/punches/:id
// @access  Private/Admin
router.delete('/:id', restrictTo('admin'), punchIdValidation, catchAsync(async (req, res, next) => {
  checkValidationErrors(req);

  const punchId = parseInt(req.params.id);

  // Check if punch exists
  const existingPunch = await query(
    'SELECT id, user_id FROM punches WHERE id = $1',
    [punchId]
  );

  if (existingPunch.rows.length === 0) {
    return next(createNotFoundError('Punch record'));
  }

  // Delete punch
  await query('DELETE FROM punches WHERE id = $1', [punchId]);

  logger.logActivity('punch_deleted', req.user.id, {
    punch_id: punchId,
    deleted_by_admin: true,
    affected_user_id: existingPunch.rows[0].user_id
  });

  res.status(200).json({
    status: 'success',
    message: 'Punch record deleted successfully',
  });
}));

module.exports = router;