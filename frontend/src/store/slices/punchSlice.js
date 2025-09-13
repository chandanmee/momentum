import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  currentPunch: null,
  punchHistory: [],
  todayPunches: [],
  punchStatus: 'out', // 'in' or 'out'
  loading: false,
  error: null,
  location: null,
  geofenceValid: false,
  lastSync: null,
  offlinePunches: [],
};

// Async thunks
export const getPunchStatus = createAsyncThunk(
  'punch/getPunchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/punches/status');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get punch status';
      return rejectWithValue(message);
    }
  }
);

export const punchIn = createAsyncThunk(
  'punch/punchIn',
  async ({ latitude, longitude, notes = '' }, { rejectWithValue }) => {
    try {
      const response = await api.post('/punches/in', {
        latitude,
        longitude,
        notes,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to punch in';
      return rejectWithValue(message);
    }
  }
);

export const punchOut = createAsyncThunk(
  'punch/punchOut',
  async ({ latitude, longitude, notes = '' }, { rejectWithValue }) => {
    try {
      const response = await api.post('/punches/out', {
        latitude,
        longitude,
        notes,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to punch out';
      return rejectWithValue(message);
    }
  }
);

export const getPunchHistory = createAsyncThunk(
  'punch/getPunchHistory',
  async ({ startDate, endDate, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await api.get('/punches/history', {
        params: { startDate, endDate, page, limit },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get punch history';
      return rejectWithValue(message);
    }
  }
);

export const getTodayPunches = createAsyncThunk(
  'punch/getTodayPunches',
  async (_, { rejectWithValue }) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/punches/history', {
        params: { startDate: today, endDate: today },
      });
      return response.data.data.punches || [];
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get today\'s punches';
      return rejectWithValue(message);
    }
  }
);

export const validateLocation = createAsyncThunk(
  'punch/validateLocation',
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

export const updatePunch = createAsyncThunk(
  'punch/updatePunch',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/punches/${id}`, data);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update punch';
      return rejectWithValue(message);
    }
  }
);

export const exportTimeData = createAsyncThunk(
  'punch/exportTimeData',
  async ({ startDate, endDate, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/punches/export', {
        params: { startDate, endDate, format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      return {
        data: response.data,
        format,
        filename: `time-data-${startDate}-${endDate}.${format}`
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export time data';
      return rejectWithValue(message);
    }
  }
);

export const deletePunch = createAsyncThunk(
  'punch/deletePunch',
  async (punchId, { rejectWithValue }) => {
    try {
      await api.delete(`/punches/${punchId}`);
      return punchId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete punch';
      return rejectWithValue(message);
    }
  }
);

export const syncOfflinePunches = createAsyncThunk(
  'punch/syncOfflinePunches',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { punch } = getState();
      const { offlinePunches } = punch;
      
      if (offlinePunches.length === 0) {
        return { synced: 0, failed: 0 };
      }
      
      const results = await Promise.allSettled(
        offlinePunches.map(async (punchData) => {
          if (punchData.type === 'in') {
            return api.post('/punches/in', punchData.data);
          } else {
            return api.post('/punches/out', punchData.data);
          }
        })
      );
      
      const synced = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      return { synced, failed, results };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to sync offline punches';
      return rejectWithValue(message);
    }
  }
);

// Punch slice
const punchSlice = createSlice({
  name: 'punch',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLocation: (state, action) => {
      state.location = action.payload;
    },
    setGeofenceValid: (state, action) => {
      state.geofenceValid = action.payload;
    },
    addOfflinePunch: (state, action) => {
      state.offlinePunches.push({
        ...action.payload,
        timestamp: Date.now(),
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    },
    removeOfflinePunch: (state, action) => {
      state.offlinePunches = state.offlinePunches.filter(
        punch => punch.id !== action.payload
      );
    },
    clearOfflinePunches: (state) => {
      state.offlinePunches = [];
    },
    updateLastSync: (state) => {
      state.lastSync = Date.now();
    },
    resetPunchState: (state) => {
      state.currentPunch = null;
      state.punchStatus = 'out';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Punch Status
      .addCase(getPunchStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPunchStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPunch = action.payload.currentPunch;
        state.punchStatus = action.payload.status;
        state.error = null;
      })
      .addCase(getPunchStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Punch In
      .addCase(punchIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchIn.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPunch = action.payload.punch;
        state.punchStatus = 'in';
        state.todayPunches.unshift(action.payload.punch);
        state.error = null;
      })
      .addCase(punchIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Punch Out
      .addCase(punchOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(punchOut.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPunch = null;
        state.punchStatus = 'out';
        
        // Update the punch in today's punches
        const punchIndex = state.todayPunches.findIndex(
          punch => punch.id === action.payload.punch.id
        );
        if (punchIndex !== -1) {
          state.todayPunches[punchIndex] = action.payload.punch;
        }
        
        state.error = null;
      })
      .addCase(punchOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Punch History
      .addCase(getPunchHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPunchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.punchHistory = action.payload.punches || [];
        state.error = null;
      })
      .addCase(getPunchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Today's Punches
      .addCase(getTodayPunches.pending, (state) => {
        state.loading = true;
      })
      .addCase(getTodayPunches.fulfilled, (state, action) => {
        state.loading = false;
        state.todayPunches = action.payload;
        state.error = null;
      })
      .addCase(getTodayPunches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Validate Location
      .addCase(validateLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(validateLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.geofenceValid = action.payload.isValid;
        state.error = null;
      })
      .addCase(validateLocation.rejected, (state, action) => {
        state.loading = false;
        state.geofenceValid = false;
        state.error = action.payload;
      })
      
      // Update Punch
      .addCase(updatePunch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePunch.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update the punch in today's punches if it exists
        const punchIndex = state.todayPunches.findIndex(
          punch => punch.id === action.payload.id
        );
        if (punchIndex !== -1) {
          state.todayPunches[punchIndex] = action.payload;
        }
        
        // Update the punch in history if it exists
        const historyIndex = state.punchHistory.findIndex(
          punch => punch.id === action.payload.id
        );
        if (historyIndex !== -1) {
          state.punchHistory[historyIndex] = action.payload;
        }
        
        // Update current punch if it's the same
        if (state.currentPunch && state.currentPunch.id === action.payload.id) {
          state.currentPunch = action.payload;
        }
        
        state.error = null;
      })
      .addCase(updatePunch.rejected, (state, action) => {
         state.loading = false;
         state.error = action.payload;
       })
       
       // Export Time Data
       .addCase(exportTimeData.pending, (state) => {
         state.loading = true;
         state.error = null;
       })
       .addCase(exportTimeData.fulfilled, (state) => {
         state.loading = false;
         state.error = null;
       })
       .addCase(exportTimeData.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        
        // Delete Punch
        .addCase(deletePunch.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(deletePunch.fulfilled, (state, action) => {
          state.loading = false;
          const punchId = action.payload;
          
          // Remove from today's punches
          state.todayPunches = state.todayPunches.filter(punch => punch.id !== punchId);
          
          // Remove from history
          state.punchHistory = state.punchHistory.filter(punch => punch.id !== punchId);
          
          // Clear current punch if it's the deleted one
          if (state.currentPunch && state.currentPunch.id === punchId) {
            state.currentPunch = null;
          }
          
          state.error = null;
        })
        .addCase(deletePunch.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        })
        
        // Sync Offline Punches
      .addCase(syncOfflinePunches.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncOfflinePunches.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove successfully synced punches
        if (action.payload.synced > 0) {
          state.offlinePunches = state.offlinePunches.slice(action.payload.synced);
        }
        
        state.lastSync = Date.now();
        state.error = null;
      })
      .addCase(syncOfflinePunches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  clearError,
  setLocation,
  setGeofenceValid,
  addOfflinePunch,
  removeOfflinePunch,
  clearOfflinePunches,
  updateLastSync,
  resetPunchState,
} = punchSlice.actions;

// Selectors
export const selectPunch = (state) => state.punch;
export const selectCurrentPunch = (state) => state.punch.currentPunch;
export const selectPunchStatus = (state) => state.punch.punchStatus;
export const selectPunchHistory = (state) => state.punch.punchHistory;
export const selectTodayPunches = (state) => state.punch.todayPunches;
export const selectPunchLoading = (state) => state.punch.loading;
export const selectPunchError = (state) => state.punch.error;
export const selectLocation = (state) => state.punch.location;
export const selectGeofenceValid = (state) => state.punch.geofenceValid;
export const selectOfflinePunches = (state) => state.punch.offlinePunches;
export const selectLastSync = (state) => state.punch.lastSync;
export const selectIsPunchedIn = (state) => state.punch.punchStatus === 'in';

export default punchSlice.reducer;