// User types
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Punch types
export const PUNCH_TYPES = {
  IN: 'in',
  OUT: 'out',
  BREAK_START: 'break_start',
  BREAK_END: 'break_end',
};

// Status types
export const STATUS_TYPES = {
  IN: 'in',
  OUT: 'out',
  ON_BREAK: 'on_break',
};

// Theme types
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    ME: '/api/auth/me',
  },
  PUNCHES: {
    BASE: '/api/punches',
    TODAY: '/api/punches/today',
    STATUS: '/api/punches/status',
  },
  USERS: {
    BASE: '/api/users',
    PROFILE: '/api/users/profile',
  },
  DEPARTMENTS: {
    BASE: '/api/departments',
  },
  REPORTS: {
    BASE: '/api/reports',
    TIMESHEET: '/api/reports/timesheet',
  },
};

// Default user object
export const DEFAULT_USER = {
  id: null,
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  role: USER_ROLES.EMPLOYEE,
  departmentId: null,
  isActive: true,
};

// Default punch object
export const DEFAULT_PUNCH = {
  id: null,
  userId: null,
  type: PUNCH_TYPES.IN,
  timestamp: null,
  location: null,
  notes: '',
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
};

// Time formats
export const TIME_FORMATS = {
  DISPLAY: 'MMM DD, YYYY HH:mm',
  API: 'YYYY-MM-DD HH:mm:ss',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm',
};