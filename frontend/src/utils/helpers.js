import { TIME_FORMATS } from '../types';

// Date and time utilities
export const formatDate = (date, format = TIME_FORMATS.DISPLAY) => {
  if (!date) return '';
  
  const d = new Date(date);
  
  switch (format) {
    case TIME_FORMATS.DISPLAY:
      return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    case TIME_FORMATS.DATE_ONLY:
      return d.toISOString().split('T')[0];
    case TIME_FORMATS.TIME_ONLY:
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    case TIME_FORMATS.API:
      return d.toISOString().replace('T', ' ').substring(0, 19);
    default:
      return d.toLocaleString();
  }
};

// Calculate duration between two timestamps
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '0:00';
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  
  if (diffMs < 0) return '0:00';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Calculate total hours worked from punch records
export const calculateTotalHours = (punches) => {
  if (!punches || punches.length === 0) return '0:00';
  
  let totalMs = 0;
  let currentPunchIn = null;
  
  // Sort punches by timestamp
  const sortedPunches = [...punches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  sortedPunches.forEach(punch => {
    if (punch.type === 'in') {
      currentPunchIn = punch.timestamp;
    } else if (punch.type === 'out' && currentPunchIn) {
      const duration = new Date(punch.timestamp) - new Date(currentPunchIn);
      totalMs += duration;
      currentPunchIn = null;
    }
  });
  
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Get current time in ISO format
export const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

// Check if a date is today
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.toDateString() === checkDate.toDateString();
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// String utilities
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const getInitials = (firstName, lastName) => {
  // Handle single name string (e.g., "John Doe")
  if (typeof firstName === 'string' && !lastName) {
    const nameParts = firstName.trim().split(' ');
    const first = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() : '';
    const last = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }
  
  // Handle separate firstName and lastName
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${first}${last}`;
};

// Local storage utilities
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Error handling utilities
export const getErrorMessage = (error) => {
  // Handle API error responses with detailed structure
  if (error.response?.data) {
    const errorData = error.response.data;
    
    // Check for message in the error data
    if (errorData.message) {
      return errorData.message;
    }
    
    // Check for error object with message
    if (errorData.error?.message) {
      return errorData.error.message;
    }
    
    // Check for errors array (validation errors)
    if (errorData.errors && Array.isArray(errorData.errors)) {
      return errorData.errors.map(err => err.message || err).join(', ');
    }
    
    // Fallback to status text
    if (errorData.status === 'fail' || errorData.status === 'error') {
      return errorData.message || 'Request failed';
    }
  }
  
  // Handle network errors or other error types
  if (error.message) {
    return error.message;
  }
  
  // Default fallback
  return 'An unexpected error occurred';
};

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};