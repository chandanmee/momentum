import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import punchService from '../../services/punchService';

// Async thunks
export const fetchTodaysPunches = createAsyncThunk(
  'punch/fetchTodaysPunches',
  async (_, { rejectWithValue }) => {
    try {
      const response = await punchService.getTodaysPunches();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch punches');
    }
  }
);

export const createPunch = createAsyncThunk(
  'punch/createPunch',
  async (punchData, { rejectWithValue }) => {
    try {
      const response = await punchService.createPunch(punchData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create punch');
    }
  }
);

export const updatePunch = createAsyncThunk(
  'punch/updatePunch',
  async ({ id, punchData }, { rejectWithValue }) => {
    try {
      const response = await punchService.updatePunch(id, punchData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update punch');
    }
  }
);

export const deletePunch = createAsyncThunk(
  'punch/deletePunch',
  async (id, { rejectWithValue }) => {
    try {
      await punchService.deletePunch(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete punch');
    }
  }
);

export const getCurrentStatus = createAsyncThunk(
  'punch/getCurrentStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await punchService.getCurrentStatus();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get current status');
    }
  }
);

// Helper function to determine current status
const determineCurrentStatus = (punches) => {
  if (!punches || punches.length === 0) {
    return 'out';
  }
  
  const sortedPunches = [...punches].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const lastPunch = sortedPunches[0];
  
  return lastPunch.type === 'in' ? 'in' : 'out';
};

const initialState = {
  todaysPunches: [],
  currentStatus: 'out', // 'in' or 'out'
  isLoading: false,
  error: null,
  lastPunchTime: null,
};

const punchSlice = createSlice({
  name: 'punch',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addPunch: (state, action) => {
      state.todaysPunches.push(action.payload);
      state.currentStatus = determineCurrentStatus(state.todaysPunches);
      state.lastPunchTime = action.payload.timestamp;
    },
    updatePunchInState: (state, action) => {
      const index = state.todaysPunches.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.todaysPunches[index] = action.payload;
        state.currentStatus = determineCurrentStatus(state.todaysPunches);
      }
    },
    removePunchFromState: (state, action) => {
      state.todaysPunches = state.todaysPunches.filter(p => p.id !== action.payload);
      state.currentStatus = determineCurrentStatus(state.todaysPunches);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch today's punches
      .addCase(fetchTodaysPunches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTodaysPunches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todaysPunches = action.payload;
        state.currentStatus = determineCurrentStatus(action.payload);
        if (action.payload.length > 0) {
          const sortedPunches = [...action.payload].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          state.lastPunchTime = sortedPunches[0].timestamp;
        }
      })
      .addCase(fetchTodaysPunches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create punch
      .addCase(createPunch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPunch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todaysPunches.push(action.payload);
        state.currentStatus = determineCurrentStatus(state.todaysPunches);
        state.lastPunchTime = action.payload.timestamp;
      })
      .addCase(createPunch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update punch
      .addCase(updatePunch.fulfilled, (state, action) => {
        const index = state.todaysPunches.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.todaysPunches[index] = action.payload;
          state.currentStatus = determineCurrentStatus(state.todaysPunches);
        }
      })
      // Delete punch
      .addCase(deletePunch.fulfilled, (state, action) => {
        state.todaysPunches = state.todaysPunches.filter(p => p.id !== action.payload);
        state.currentStatus = determineCurrentStatus(state.todaysPunches);
      })
      // Get current status
      .addCase(getCurrentStatus.fulfilled, (state, action) => {
        state.currentStatus = action.payload.status;
        state.lastPunchTime = action.payload.lastPunchTime;
      });
  },
});

export const { clearError, addPunch, updatePunchInState, removePunchFromState } = punchSlice.actions;
export default punchSlice.reducer;