const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError, catchAsync, createAuthError } = require('./errorHandler');
const logger = require('../utils/logger');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

// Generate refresh token
const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

// Create and send token response
const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('jwt', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    ),
  });

  // Remove password from output
  user.password_hash = undefined;

  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    refreshToken,
    data: {
      user,
    },
  });
};

// Verify JWT token
const verifyToken = (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

// Protect routes - require authentication
const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(createAuthError('You are not logged in! Please log in to get access.'));
  }

  // 2) Verification token
  let decoded;
  try {
    decoded = await verifyToken(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createAuthError('Your token has expired! Please log in again.'));
    }
    return next(createAuthError('Invalid token! Please log in again.'));
  }

  // 3) Check if user still exists
  const result = await query(
    'SELECT id, employee_id, name, email, role, department_id, geofence_id, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL',
    [decoded.id]
  );

  if (result.rows.length === 0) {
    return next(createAuthError('The user belonging to this token does no longer exist.'));
  }

  const currentUser = result.rows[0];

  // 4) Check if user changed password after the token was issued
  // This would require a password_changed_at field in the users table
  // For now, we'll skip this check

  // 5) Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  
  logger.logAuth('access_granted', currentUser.id, {
    route: req.originalUrl,
    method: req.method,
  });
  
  next();
});

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.logAuth('access_denied', req.user.id, {
        route: req.originalUrl,
        method: req.method,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Check if user is logged in (for conditional rendering)
const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await verifyToken(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const result = await query(
        'SELECT id, employee_id, name, email, role, department_id, geofence_id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return next();
      }

      // 3) There is a logged in user
      res.locals.user = result.rows[0];
      return next();
    } catch (error) {
      return next();
    }
  }
  next();
};

// Refresh token endpoint
const refreshToken = catchAsync(async (req, res, next) => {
  let refreshToken;
  
  if (req.cookies.refreshToken) {
    refreshToken = req.cookies.refreshToken;
  } else if (req.body.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    return next(createAuthError('No refresh token provided'));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = await verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return next(createAuthError('Invalid refresh token'));
  }

  // Check if user still exists
  const result = await query(
    'SELECT id, employee_id, name, email, role, department_id, geofence_id FROM users WHERE id = $1 AND deleted_at IS NULL',
    [decoded.id]
  );

  if (result.rows.length === 0) {
    return next(createAuthError('User no longer exists'));
  }

  const user = result.rows[0];
  
  // Generate new tokens
  createSendToken(user, 200, res, 'Token refreshed successfully');
});

// Logout
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  
  if (req.user) {
    logger.logAuth('logout', req.user.id);
  }
  
  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully'
  });
};

// Validate employee access to specific geofence
const validateGeofenceAccess = catchAsync(async (req, res, next) => {
  const { user } = req;
  const geofenceId = req.params.geofenceId || req.body.geofenceId;

  // Admin can access all geofences
  if (user.role === 'admin') {
    return next();
  }

  // Employee can only access their assigned geofence
  if (user.role === 'employee') {
    if (!user.geofence_id) {
      return next(new AppError('No geofence assigned to this employee', 403));
    }
    
    if (geofenceId && parseInt(geofenceId) !== user.geofence_id) {
      return next(new AppError('Access denied to this geofence', 403));
    }
  }

  next();
});

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  signToken,
  signRefreshToken,
  createSendToken,
  protect,
  restrictTo,
  isLoggedIn,
  refreshToken,
  logout,
  validateGeofenceAccess,
  authRateLimit,
};