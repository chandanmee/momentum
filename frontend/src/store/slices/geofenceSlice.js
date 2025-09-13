import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  geofences: [],
  currentGeofence: null,
  nearbyGeofences: [],
  validationResult: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    search: '',
    status: 'active',
    department: '',
  },
  mapCenter: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
  mapZoom: 10,
};

// Async thunks
export const getGeofences = createAsyncThunk(
  'geofence/getGeofences',
  async ({ page = 1, limit = 20, search = '', status = 'active', department = '' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/geofences', {
        params: { page, limit, search, status, department },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch geofences';
      return rejectWithValue(message);
    }
  }
);

export const getGeofenceById = createAsyncThunk(
  'geofence/getGeofenceById',
  async (geofenceId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/geofences/${geofenceId}`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch geofence';
      return rejectWithValue(message);
    }
  }
);

export const createGeofence = createAsyncThunk(
  'geofence/createGeofence',
  async (geofenceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/geofences', geofenceData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create geofence';
      return rejectWithValue(message);
    }
  }
);

export const updateGeofence = createAsyncThunk(
  'geofence/updateGeofence',
  async ({ geofenceId, geofenceData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/geofences/${geofenceId}`, geofenceData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update geofence';
      return rejectWithValue(message);
    }
  }
);

export const deleteGeofence = createAsyncThunk(
  'geofence/deleteGeofence',
  async (geofenceId, { rejectWithValue }) => {
    try {
      await api.delete(`/geofences/${geofenceId}`);
      return geofenceId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete geofence';
      return rejectWithValue(message);
    }
  }
);

export const restoreGeofence = createAsyncThunk(
  'geofence/restoreGeofence',
  async (geofenceId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/geofences/${geofenceId}/restore`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to restore geofence';
      return rejectWithValue(message);
    }
  }
);

export const validateLocation = createAsyncThunk(
  'geofence/validateLocation',
  async ({ latitude, longitude }, { rejectWithValue }) => {
    try {
      const response = await api.post('/geofences/validate', {
        latitude,
        longitude,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to validate location';
      return rejectWithValue(message);
    }
  }
);

export const testGeofenceLocation = createAsyncThunk(
  'geofence/testGeofenceLocation',
  async ({ geofenceId, latitude, longitude }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/geofences/${geofenceId}/test`, {
        latitude,
        longitude,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to test geofence location';
      return rejectWithValue(message);
    }
  }
);

export const getNearbyGeofences = createAsyncThunk(
  'geofence/getNearbyGeofences',
  async ({ latitude, longitude, radius = 5000 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/geofences/nearby', {
        params: { latitude, longitude, radius },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get nearby geofences';
      return rejectWithValue(message);
    }
  }
);

export const getGeofenceStats = createAsyncThunk(
  'geofence/getGeofenceStats',
  async (geofenceId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/geofences/${geofenceId}/stats`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get geofence stats';
      return rejectWithValue(message);
    }
  }
);

export const bulkUpdateGeofences = createAsyncThunk(
  'geofence/bulkUpdateGeofences',
  async ({ geofenceIds, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put('/geofences/bulk', {
        geofenceIds,
        updateData,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to bulk update geofences';
      return rejectWithValue(message);
    }
  }
);

export const exportGeofences = createAsyncThunk(
  'geofence/exportGeofences',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.download('/geofences/export', {
        params: filters,
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export geofences';
      return rejectWithValue(message);
    }
  }
);

// Helper functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const isPointInGeofence = (point, geofence) => {
  if (geofence.type === 'circle') {
    const distance = calculateDistance(
      point.latitude,
      point.longitude,
      geofence.latitude,
      geofence.longitude
    );
    return distance <= geofence.radius;
  }
  
  if (geofence.type === 'polygon') {
    // Point-in-polygon algorithm (ray casting)
    const { coordinates } = geofence;
    let inside = false;
    
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i].longitude;
      const yi = coordinates[i].latitude;
      const xj = coordinates[j].longitude;
      const yj = coordinates[j].latitude;
      
      if (
        (yi > point.latitude) !== (yj > point.latitude) &&
        point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  return false;
};

// Geofence slice
const geofenceSlice = createSlice({
  name: 'geofence',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        status: 'active',
        department: '',
      };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setCurrentGeofence: (state, action) => {
      state.currentGeofence = action.payload;
    },
    clearCurrentGeofence: (state) => {
      state.currentGeofence = null;
    },
    setMapCenter: (state, action) => {
      state.mapCenter = action.payload;
    },
    setMapZoom: (state, action) => {
      state.mapZoom = action.payload;
    },
    clearValidationResult: (state) => {
      state.validationResult = null;
    },
    updateGeofenceInList: (state, action) => {
      const { geofenceId, geofenceData } = action.payload;
      const geofenceIndex = state.geofences.findIndex(geofence => geofence.id === geofenceId);
      if (geofenceIndex !== -1) {
        state.geofences[geofenceIndex] = { ...state.geofences[geofenceIndex], ...geofenceData };
      }
    },
    removeGeofenceFromList: (state, action) => {
      state.geofences = state.geofences.filter(geofence => geofence.id !== action.payload);
    },
    addGeofenceToList: (state, action) => {
      state.geofences.unshift(action.payload);
      state.pagination.total += 1;
    },
    validateLocationLocally: (state, action) => {
      const { latitude, longitude } = action.payload;
      const point = { latitude, longitude };
      
      // Check against all active geofences
      const validGeofences = state.geofences
        .filter(geofence => geofence.status === 'active')
        .filter(geofence => isPointInGeofence(point, geofence));
      
      state.validationResult = {
        isValid: validGeofences.length > 0,
        validGeofences,
        location: point,
        timestamp: Date.now(),
      };
    },
    resetGeofenceState: (state) => {
      state.geofences = [];
      state.currentGeofence = null;
      state.nearbyGeofences = [];
      state.validationResult = null;
      state.error = null;
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Geofences
      .addCase(getGeofences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGeofences.fulfilled, (state, action) => {
        state.loading = false;
        state.geofences = action.payload.geofences || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
        state.error = null;
      })
      .addCase(getGeofences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Geofence By ID
      .addCase(getGeofenceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGeofenceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGeofence = action.payload;
        state.error = null;
      })
      .addCase(getGeofenceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Geofence
      .addCase(createGeofence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGeofence.fulfilled, (state, action) => {
        state.loading = false;
        state.geofences.unshift(action.payload);
        state.pagination.total += 1;
        state.error = null;
      })
      .addCase(createGeofence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Geofence
      .addCase(updateGeofence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGeofence.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update geofence in list
        const geofenceIndex = state.geofences.findIndex(geofence => geofence.id === action.payload.id);
        if (geofenceIndex !== -1) {
          state.geofences[geofenceIndex] = action.payload;
        }
        
        // Update current geofence if it's the same
        if (state.currentGeofence && state.currentGeofence.id === action.payload.id) {
          state.currentGeofence = action.payload;
        }
        
        state.error = null;
      })
      .addCase(updateGeofence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Geofence
      .addCase(deleteGeofence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGeofence.fulfilled, (state, action) => {
        state.loading = false;
        state.geofences = state.geofences.filter(geofence => geofence.id !== action.payload);
        state.pagination.total -= 1;
        
        if (state.currentGeofence && state.currentGeofence.id === action.payload) {
          state.currentGeofence = null;
        }
        
        state.error = null;
      })
      .addCase(deleteGeofence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Restore Geofence
      .addCase(restoreGeofence.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreGeofence.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update geofence in list
        const geofenceIndex = state.geofences.findIndex(geofence => geofence.id === action.payload.id);
        if (geofenceIndex !== -1) {
          state.geofences[geofenceIndex] = action.payload;
        } else {
          state.geofences.unshift(action.payload);
          state.pagination.total += 1;
        }
        
        state.error = null;
      })
      .addCase(restoreGeofence.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Validate Location
      .addCase(validateLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.validationResult = action.payload;
        state.error = null;
      })
      .addCase(validateLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.validationResult = {
          isValid: false,
          error: action.payload,
          timestamp: Date.now(),
        };
      })
      
      // Test Geofence Location
      .addCase(testGeofenceLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(testGeofenceLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(testGeofenceLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Nearby Geofences
      .addCase(getNearbyGeofences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNearbyGeofences.fulfilled, (state, action) => {
        state.loading = false;
        state.nearbyGeofences = action.payload.geofences || [];
        state.error = null;
      })
      .addCase(getNearbyGeofences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Geofence Stats
      .addCase(getGeofenceStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGeofenceStats.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add stats to current geofence
        if (state.currentGeofence) {
          state.currentGeofence.stats = action.payload;
        }
        
        state.error = null;
      })
      .addCase(getGeofenceStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk Update Geofences
      .addCase(bulkUpdateGeofences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateGeofences.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update geofences in list
        action.payload.updatedGeofences?.forEach(updatedGeofence => {
          const geofenceIndex = state.geofences.findIndex(geofence => geofence.id === updatedGeofence.id);
          if (geofenceIndex !== -1) {
            state.geofences[geofenceIndex] = updatedGeofence;
          }
        });
        
        state.error = null;
      })
      .addCase(bulkUpdateGeofences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export Geofences
      .addCase(exportGeofences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportGeofences.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(exportGeofences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  clearError,
  setFilters,
  clearFilters,
  setPagination,
  setCurrentGeofence,
  clearCurrentGeofence,
  setMapCenter,
  setMapZoom,
  clearValidationResult,
  updateGeofenceInList,
  removeGeofenceFromList,
  addGeofenceToList,
  validateLocationLocally,
  resetGeofenceState,
} = geofenceSlice.actions;

// Selectors
export const selectGeofence = (state) => state.geofence;
export const selectGeofences = (state) => state.geofence.geofences;
export const selectCurrentGeofence = (state) => state.geofence.currentGeofence;
export const selectNearbyGeofences = (state) => state.geofence.nearbyGeofences;
export const selectValidationResult = (state) => state.geofence.validationResult;
export const selectGeofenceLoading = (state) => state.geofence.loading;
export const selectGeofenceError = (state) => state.geofence.error;
export const selectGeofencePagination = (state) => state.geofence.pagination;
export const selectGeofenceFilters = (state) => state.geofence.filters;
export const selectMapCenter = (state) => state.geofence.mapCenter;
export const selectMapZoom = (state) => state.geofence.mapZoom;
export const selectGeofenceById = (geofenceId) => (state) => 
  state.geofence.geofences.find(geofence => geofence.id === geofenceId);
export const selectActiveGeofences = (state) => 
  state.geofence.geofences.filter(geofence => geofence.status === 'active');
export const selectIsLocationValid = (state) => 
  state.geofence.validationResult?.isValid || false;

export default geofenceSlice.reducer;