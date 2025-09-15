import api from './api';
import { API_ENDPOINTS } from '../types';

const punchService = {
  // Get today's punches for current user
  getTodaysPunches: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.PUNCHES.TODAY);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all punches for current user with optional date range
  getPunches: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.PUNCHES.BASE, { params });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create a new punch
  createPunch: async (punchData) => {
    try {
      const response = await api.post(API_ENDPOINTS.PUNCHES.BASE, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update an existing punch
  updatePunch: async (id, punchData) => {
    try {
      const response = await api.put(`${API_ENDPOINTS.PUNCHES.BASE}/${id}`, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete a punch
  deletePunch: async (id) => {
    try {
      const response = await api.delete(`${API_ENDPOINTS.PUNCHES.BASE}/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get current punch status
  getCurrentStatus: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.PUNCHES.STATUS);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Punch in
  punchIn: async (location = null, notes = '') => {
    try {
      const punchData = {
        type: 'in',
        timestamp: new Date().toISOString(),
        location,
        notes,
      };
      const response = await api.post(API_ENDPOINTS.PUNCHES.BASE, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Punch out
  punchOut: async (location = null, notes = '') => {
    try {
      const punchData = {
        type: 'out',
        timestamp: new Date().toISOString(),
        location,
        notes,
      };
      const response = await api.post(API_ENDPOINTS.PUNCHES.BASE, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Start break
  startBreak: async (location = null, notes = '') => {
    try {
      const punchData = {
        type: 'break_start',
        timestamp: new Date().toISOString(),
        location,
        notes,
      };
      const response = await api.post(API_ENDPOINTS.PUNCHES.BASE, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // End break
  endBreak: async (location = null, notes = '') => {
    try {
      const punchData = {
        type: 'break_end',
        timestamp: new Date().toISOString(),
        location,
        notes,
      };
      const response = await api.post(API_ENDPOINTS.PUNCHES.BASE, punchData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get punch statistics
  getStatistics: async (startDate, endDate) => {
    try {
      const params = { startDate, endDate };
      const response = await api.get('/api/punches/statistics', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default punchService;