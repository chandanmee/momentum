const express = require('express');
const { query: expressQuery, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { protect, restrictTo } = require('../middleware/auth');
const { 
  AppError, 
  catchAsync, 
  createValidationError 
} = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Protect all routes
router.use(protect);

// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Helper function to format hours
const formatHours = (hours) => {
  if (!hours) return 0;
  return parseFloat(hours.toFixed(2));
};

// Helper function to generate CSV content
const generateCSV = (data, headers) => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header.toLowerCase().replace(/ /g, '_')];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

// @desc    Get attendance summary report
// @route   GET /api/reports/attendance
// @access  Private/Admin/Manager
router.get('/attendance', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    start_date,
    end_date,
    user_id,
    department_id,
    format = 'json'
  } = req.query;

  // Validate required parameters
  if (!start_date || !end_date) {
    return next(createValidationError('start_date and end_date are required'));
  }

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return next(createValidationError('Invalid date format. Use YYYY-MM-DD'));
  }

  if (new Date(start_date) > new Date(end_date)) {
    return next(createValidationError('start_date cannot be after end_date'));
  }

  // Build WHERE clause
  let whereConditions = [
    'p.punch_in_time >= $1',
    'p.punch_in_time <= $2 + INTERVAL \'1 day\'',
    'u.deleted_at IS NULL'
  ];
  let queryParams = [start_date, end_date];
  let paramCount = 3;

  if (user_id) {
    whereConditions.push(`u.id = $${paramCount}`);
    queryParams.push(parseInt(user_id));
    paramCount++;
  }

  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  const result = await query(
    `SELECT 
       u.id as user_id,
       u.employee_id,
       u.name as user_name,
       d.name as department_name,
       COUNT(p.id) as total_punches,
       COUNT(p.id) FILTER (WHERE p.punch_out_time IS NOT NULL) as completed_punches,
       COUNT(p.id) FILTER (WHERE p.punch_out_time IS NULL) as incomplete_punches,
       SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
         EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
         ELSE 0 END) as total_hours,
       AVG(CASE WHEN p.punch_out_time IS NOT NULL THEN 
         EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
         ELSE NULL END) as avg_hours_per_day,
       COUNT(p.id) FILTER (WHERE p.is_valid_geofence = false) as invalid_location_punches,
       MIN(p.punch_in_time) as first_punch,
       MAX(p.punch_in_time) as last_punch
     FROM users u
     LEFT JOIN punches p ON u.id = p.user_id AND ${whereClause.replace('u.deleted_at IS NULL', 'TRUE')}
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE u.deleted_at IS NULL
     ${user_id ? `AND u.id = ${parseInt(user_id)}` : ''}
     ${department_id ? `AND u.department_id = ${parseInt(department_id)}` : ''}
     GROUP BY u.id, u.employee_id, u.name, d.name
     ORDER BY u.name`,
    queryParams
  );

  const reportData = result.rows.map(row => ({
    user_id: row.user_id,
    employee_id: row.employee_id,
    user_name: row.user_name,
    department_name: row.department_name || 'No Department',
    total_punches: parseInt(row.total_punches),
    completed_punches: parseInt(row.completed_punches),
    incomplete_punches: parseInt(row.incomplete_punches),
    total_hours: formatHours(parseFloat(row.total_hours)),
    avg_hours_per_day: formatHours(parseFloat(row.avg_hours_per_day)),
    invalid_location_punches: parseInt(row.invalid_location_punches),
    first_punch: row.first_punch,
    last_punch: row.last_punch
  }));

  // Calculate summary statistics
  const summary = {
    total_employees: reportData.length,
    total_punches: reportData.reduce((sum, row) => sum + row.total_punches, 0),
    total_hours: formatHours(reportData.reduce((sum, row) => sum + row.total_hours, 0)),
    avg_hours_per_employee: formatHours(reportData.reduce((sum, row) => sum + row.total_hours, 0) / reportData.length),
    employees_with_invalid_locations: reportData.filter(row => row.invalid_location_punches > 0).length
  };

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'User Name', 'Department Name', 'Total Punches', 
      'Completed Punches', 'Incomplete Punches', 'Total Hours', 
      'Avg Hours Per Day', 'Invalid Location Punches', 'First Punch', 'Last Punch'
    ];
    
    const csvContent = generateCSV(reportData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${start_date}_to_${end_date}.csv"`);
    return res.send(csvContent);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary,
      reportData,
      filters: {
        start_date,
        end_date,
        user_id: user_id || null,
        department_id: department_id || null
      }
    },
  });
}));

// @desc    Get overtime report
// @route   GET /api/reports/overtime
// @access  Private/Admin/Manager
router.get('/overtime', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    start_date,
    end_date,
    user_id,
    department_id,
    overtime_threshold = 8,
    format = 'json'
  } = req.query;

  // Validate required parameters
  if (!start_date || !end_date) {
    return next(createValidationError('start_date and end_date are required'));
  }

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return next(createValidationError('Invalid date format. Use YYYY-MM-DD'));
  }

  const threshold = parseFloat(overtime_threshold);
  if (isNaN(threshold) || threshold <= 0) {
    return next(createValidationError('overtime_threshold must be a positive number'));
  }

  // Build WHERE clause
  let whereConditions = [
    'DATE(p.punch_in_time) >= $1',
    'DATE(p.punch_in_time) <= $2',
    'p.punch_out_time IS NOT NULL',
    'u.deleted_at IS NULL'
  ];
  let queryParams = [start_date, end_date];
  let paramCount = 3;

  if (user_id) {
    whereConditions.push(`u.id = $${paramCount}`);
    queryParams.push(parseInt(user_id));
    paramCount++;
  }

  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  const result = await query(
    `SELECT 
       u.id as user_id,
       u.employee_id,
       u.name as user_name,
       d.name as department_name,
       DATE(p.punch_in_time) as work_date,
       SUM(EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600) as daily_hours,
       CASE 
         WHEN SUM(EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600) > $${paramCount} 
         THEN SUM(EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600) - $${paramCount}
         ELSE 0 
       END as overtime_hours
     FROM users u
     JOIN punches p ON u.id = p.user_id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE ${whereClause}
     GROUP BY u.id, u.employee_id, u.name, d.name, DATE(p.punch_in_time)
     HAVING SUM(EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600) > $${paramCount}
     ORDER BY u.name, work_date`,
    [...queryParams, threshold, threshold, threshold]
  );

  const reportData = result.rows.map(row => ({
    user_id: row.user_id,
    employee_id: row.employee_id,
    user_name: row.user_name,
    department_name: row.department_name || 'No Department',
    work_date: row.work_date,
    daily_hours: formatHours(parseFloat(row.daily_hours)),
    overtime_hours: formatHours(parseFloat(row.overtime_hours))
  }));

  // Calculate summary statistics
  const summary = {
    total_overtime_days: reportData.length,
    total_overtime_hours: formatHours(reportData.reduce((sum, row) => sum + row.overtime_hours, 0)),
    employees_with_overtime: [...new Set(reportData.map(row => row.user_id))].length,
    avg_overtime_per_day: formatHours(reportData.reduce((sum, row) => sum + row.overtime_hours, 0) / reportData.length),
    overtime_threshold: threshold
  };

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'User Name', 'Department Name', 'Work Date', 
      'Daily Hours', 'Overtime Hours'
    ];
    
    const csvContent = generateCSV(reportData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="overtime_report_${start_date}_to_${end_date}.csv"`);
    return res.send(csvContent);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary,
      reportData,
      filters: {
        start_date,
        end_date,
        user_id: user_id || null,
        department_id: department_id || null,
        overtime_threshold: threshold
      }
    },
  });
}));

// @desc    Get location violations report
// @route   GET /api/reports/location-violations
// @access  Private/Admin/Manager
router.get('/location-violations', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    start_date,
    end_date,
    user_id,
    department_id,
    format = 'json'
  } = req.query;

  // Validate required parameters
  if (!start_date || !end_date) {
    return next(createValidationError('start_date and end_date are required'));
  }

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return next(createValidationError('Invalid date format. Use YYYY-MM-DD'));
  }

  // Build WHERE clause
  let whereConditions = [
    'DATE(p.punch_in_time) >= $1',
    'DATE(p.punch_in_time) <= $2',
    '(p.is_valid_geofence = false OR p.is_valid_geofence_out = false)',
    'u.deleted_at IS NULL'
  ];
  let queryParams = [start_date, end_date];
  let paramCount = 3;

  if (user_id) {
    whereConditions.push(`u.id = $${paramCount}`);
    queryParams.push(parseInt(user_id));
    paramCount++;
  }

  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  const result = await query(
    `SELECT 
       u.id as user_id,
       u.employee_id,
       u.name as user_name,
       d.name as department_name,
       g.name as geofence_name,
       p.id as punch_id,
       p.punch_in_time,
       p.punch_out_time,
       p.punch_in_lat,
       p.punch_in_lon,
       p.punch_out_lat,
       p.punch_out_lon,
       p.is_valid_geofence,
       p.is_valid_geofence_out,
       p.notes,
       CASE 
         WHEN p.is_valid_geofence = false AND p.is_valid_geofence_out = false THEN 'Both In/Out'
         WHEN p.is_valid_geofence = false THEN 'Punch In'
         WHEN p.is_valid_geofence_out = false THEN 'Punch Out'
         ELSE 'Unknown'
       END as violation_type
     FROM users u
     JOIN punches p ON u.id = p.user_id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     LEFT JOIN geofences g ON u.geofence_id = g.id AND g.deleted_at IS NULL
     WHERE ${whereClause}
     ORDER BY p.punch_in_time DESC`,
    queryParams
  );

  const reportData = result.rows.map(row => ({
    user_id: row.user_id,
    employee_id: row.employee_id,
    user_name: row.user_name,
    department_name: row.department_name || 'No Department',
    geofence_name: row.geofence_name || 'No Geofence',
    punch_id: row.punch_id,
    punch_in_time: row.punch_in_time,
    punch_out_time: row.punch_out_time,
    violation_type: row.violation_type,
    punch_in_location: row.punch_in_lat && row.punch_in_lon ? `${row.punch_in_lat}, ${row.punch_in_lon}` : null,
    punch_out_location: row.punch_out_lat && row.punch_out_lon ? `${row.punch_out_lat}, ${row.punch_out_lon}` : null,
    notes: row.notes
  }));

  // Calculate summary statistics
  const summary = {
    total_violations: reportData.length,
    employees_with_violations: [...new Set(reportData.map(row => row.user_id))].length,
    punch_in_violations: reportData.filter(row => row.violation_type.includes('Punch In')).length,
    punch_out_violations: reportData.filter(row => row.violation_type.includes('Punch Out')).length,
    both_violations: reportData.filter(row => row.violation_type === 'Both In/Out').length
  };

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'User Name', 'Department Name', 'Geofence Name', 
      'Punch In Time', 'Punch Out Time', 'Violation Type', 
      'Punch In Location', 'Punch Out Location', 'Notes'
    ];
    
    const csvContent = generateCSV(reportData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="location_violations_${start_date}_to_${end_date}.csv"`);
    return res.send(csvContent);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary,
      reportData,
      filters: {
        start_date,
        end_date,
        user_id: user_id || null,
        department_id: department_id || null
      }
    },
  });
}));

// @desc    Get daily summary report
// @route   GET /api/reports/daily-summary
// @access  Private/Admin/Manager
router.get('/daily-summary', restrictTo('admin', 'manager'), catchAsync(async (req, res, next) => {
  const {
    date = new Date().toISOString().split('T')[0],
    department_id,
    format = 'json'
  } = req.query;

  if (!isValidDate(date)) {
    return next(createValidationError('Invalid date format. Use YYYY-MM-DD'));
  }

  // Build WHERE clause
  let whereConditions = [
    'DATE(p.punch_in_time) = $1',
    'u.deleted_at IS NULL'
  ];
  let queryParams = [date];
  let paramCount = 2;

  if (department_id) {
    whereConditions.push(`u.department_id = $${paramCount}`);
    queryParams.push(parseInt(department_id));
    paramCount++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get current punches for the day
  const result = await query(
    `SELECT 
       u.id as user_id,
       u.employee_id,
       u.name as user_name,
       d.name as department_name,
       COUNT(p.id) as punch_count,
       MIN(p.punch_in_time) as first_punch_in,
       MAX(CASE WHEN p.punch_out_time IS NOT NULL THEN p.punch_out_time ELSE NULL END) as last_punch_out,
       SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
         EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
         ELSE 0 END) as total_hours,
       COUNT(p.id) FILTER (WHERE p.punch_out_time IS NULL) as active_punches,
       COUNT(p.id) FILTER (WHERE p.is_valid_geofence = false) as invalid_punches,
       CASE 
         WHEN COUNT(p.id) FILTER (WHERE p.punch_out_time IS NULL) > 0 THEN 'Punched In'
         WHEN COUNT(p.id) > 0 THEN 'Punched Out'
         ELSE 'No Activity'
       END as current_status
     FROM users u
     LEFT JOIN punches p ON u.id = p.user_id AND ${whereClause.replace('u.deleted_at IS NULL', 'TRUE')}
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     WHERE u.deleted_at IS NULL AND u.is_active = true
     ${department_id ? `AND u.department_id = ${parseInt(department_id)}` : ''}
     GROUP BY u.id, u.employee_id, u.name, d.name
     ORDER BY u.name`,
    queryParams
  );

  const reportData = result.rows.map(row => ({
    user_id: row.user_id,
    employee_id: row.employee_id,
    user_name: row.user_name,
    department_name: row.department_name || 'No Department',
    current_status: row.current_status,
    punch_count: parseInt(row.punch_count),
    first_punch_in: row.first_punch_in,
    last_punch_out: row.last_punch_out,
    total_hours: formatHours(parseFloat(row.total_hours)),
    active_punches: parseInt(row.active_punches),
    invalid_punches: parseInt(row.invalid_punches)
  }));

  // Calculate summary statistics
  const summary = {
    total_employees: reportData.length,
    currently_punched_in: reportData.filter(row => row.current_status === 'Punched In').length,
    employees_with_activity: reportData.filter(row => row.current_status !== 'No Activity').length,
    total_hours_today: formatHours(reportData.reduce((sum, row) => sum + row.total_hours, 0)),
    employees_with_violations: reportData.filter(row => row.invalid_punches > 0).length,
    date: date
  };

  if (format === 'csv') {
    const headers = [
      'Employee ID', 'User Name', 'Department Name', 'Current Status', 
      'Punch Count', 'First Punch In', 'Last Punch Out', 'Total Hours', 
      'Active Punches', 'Invalid Punches'
    ];
    
    const csvContent = generateCSV(reportData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily_summary_${date}.csv"`);
    return res.send(csvContent);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary,
      reportData,
      filters: {
        date,
        department_id: department_id || null
      }
    },
  });
}));

// @desc    Get dashboard analytics
// @route   GET /api/reports/dashboard
// @access  Private (All authenticated users)
router.get('/dashboard', catchAsync(async (req, res, next) => {
  const { user } = req;
  
  // For regular employees, return basic personal stats
  if (user.role === 'employee') {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Personal stats for employee
    const personalStats = await query(`
      SELECT 
        COUNT(p.id) as total_punches_today,
        SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
          ELSE 0 END) as total_hours_today,
        COUNT(p.id) FILTER (WHERE p.is_valid_geofence = false) as invalid_location_punches
      FROM punches p
      WHERE p.user_id = $1 AND DATE(p.punch_in_time) = $2
    `, [user.id, today]);
    
    // Weekly personal trends
    const weeklyTrends = await query(`
      SELECT 
        DATE(p.punch_in_time) as date,
        COUNT(p.id) as total_punches,
        SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
          ELSE 0 END) as total_hours
      FROM punches p
      WHERE p.user_id = $1 AND DATE(p.punch_in_time) >= $2
      GROUP BY DATE(p.punch_in_time)
      ORDER BY DATE(p.punch_in_time)
    `, [user.id, lastWeek]);
    
    return res.status(200).json({
      success: true,
      data: {
        todayStats: personalStats.rows[0],
        weeklyTrends: weeklyTrends.rows,
        userRole: 'employee'
      }
    });
  }
  
  // For admin/manager users, return full analytics
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Today's statistics
  const todayStats = await query(`
    SELECT 
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(DISTINCT p.user_id) as employees_with_activity,
      COUNT(p.id) FILTER (WHERE p.punch_out_time IS NULL) as currently_punched_in,
      COUNT(p.id) as total_punches_today,
      COUNT(p.id) FILTER (WHERE p.is_valid_geofence = false) as invalid_location_punches,
      SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
        ELSE 0 END) as total_hours_today
    FROM users u
    LEFT JOIN punches p ON u.id = p.user_id AND DATE(p.punch_in_time) = $1
    WHERE u.deleted_at IS NULL AND u.is_active = true
  `, [today]);

  // Weekly trends
  const weeklyTrends = await query(`
    SELECT 
      DATE(p.punch_in_time) as date,
      COUNT(DISTINCT p.user_id) as active_employees,
      COUNT(p.id) as total_punches,
      SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
        ELSE 0 END) as total_hours
    FROM punches p
    JOIN users u ON p.user_id = u.id AND u.deleted_at IS NULL
    WHERE DATE(p.punch_in_time) >= $1
    GROUP BY DATE(p.punch_in_time)
    ORDER BY DATE(p.punch_in_time)
  `, [lastWeek]);

  // Department breakdown
  const departmentStats = await query(`
    SELECT 
      d.name as department_name,
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(DISTINCT p.user_id) as active_employees_today,
      COUNT(p.id) as punches_today,
      SUM(CASE WHEN p.punch_out_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (p.punch_out_time - p.punch_in_time))/3600 
        ELSE 0 END) as hours_today
    FROM departments d
    LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL AND u.is_active = true
    LEFT JOIN punches p ON u.id = p.user_id AND DATE(p.punch_in_time) = $1
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name
    ORDER BY total_employees DESC
  `, [today]);

  // Recent violations
  const recentViolations = await query(`
    SELECT 
      u.employee_id,
      u.name as user_name,
      p.punch_in_time,
      CASE 
        WHEN p.is_valid_geofence = false AND p.is_valid_geofence_out = false THEN 'Both In/Out'
        WHEN p.is_valid_geofence = false THEN 'Punch In'
        WHEN p.is_valid_geofence_out = false THEN 'Punch Out'
        ELSE 'Unknown'
      END as violation_type
    FROM punches p
    JOIN users u ON p.user_id = u.id AND u.deleted_at IS NULL
    WHERE (p.is_valid_geofence = false OR p.is_valid_geofence_out = false)
      AND p.punch_in_time >= $1
    ORDER BY p.punch_in_time DESC
    LIMIT 10
  `, [lastWeek]);

  res.status(200).json({
    status: 'success',
    data: {
      todayStats: {
        ...todayStats.rows[0],
        totalEmployees: parseInt(todayStats.rows[0].total_employees),
        employeesWithActivity: parseInt(todayStats.rows[0].employees_with_activity),
        currentlyPunchedIn: parseInt(todayStats.rows[0].currently_punched_in),
        totalPunchesToday: parseInt(todayStats.rows[0].total_punches_today),
        invalidLocationPunches: parseInt(todayStats.rows[0].invalid_location_punches),
        totalHoursToday: formatHours(parseFloat(todayStats.rows[0].total_hours_today))
      },
      weeklyTrends: weeklyTrends.rows.map(row => ({
        date: row.date,
        activeEmployees: parseInt(row.active_employees),
        totalPunches: parseInt(row.total_punches),
        totalHours: formatHours(parseFloat(row.total_hours))
      })),
      departmentStats: departmentStats.rows.map(row => ({
        departmentName: row.department_name,
        totalEmployees: parseInt(row.total_employees),
        activeEmployeesToday: parseInt(row.active_employees_today),
        punchesToday: parseInt(row.punches_today),
        hoursToday: formatHours(parseFloat(row.hours_today))
      })),
      recentViolations: recentViolations.rows
    },
  });
}));

module.exports = router;