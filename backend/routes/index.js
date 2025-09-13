const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const punchRoutes = require('./punches');
const geofenceRoutes = require('./geofences');
const departmentRoutes = require('./departments');
const reportRoutes = require('./reports');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Momentum API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0'
  });
});

// API Info
router.get('/info', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      name: 'Momentum API',
      description: 'Corporate-grade time and attendance management system',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        punches: '/api/punches',
        geofences: '/api/geofences',
        departments: '/api/departments',
        reports: '/api/reports'
      },
      documentation: process.env.API_DOCS_URL || 'https://api-docs.momentum.com'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/punches', punchRoutes);
router.use('/geofences', geofenceRoutes);
router.use('/departments', departmentRoutes);
router.use('/reports', reportRoutes);

// Catch unhandled API routes
router.all('*', (req, res, next) => {
  const error = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404
  );
  
  logger.warn('API route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
});

module.exports = router;