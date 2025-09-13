import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import settingsService from '../../services/settingsService';

// Async thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await settingsService.getSettings();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await settingsService.updateSettings(settingsData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'settings/updateNotificationSettings',
  async (notificationData, { rejectWithValue }) => {
    try {
      const response = await settingsService.updateNotificationSettings(notificationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update notification settings');
    }
  }
);

export const updateWorkSettings = createAsyncThunk(
  'settings/updateWorkSettings',
  async (workData, { rejectWithValue }) => {
    try {
      const response = await settingsService.updateWorkSettings(workData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update work settings');
    }
  }
);

// Initial state
const initialState = {
  // General settings
  theme: 'light',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  
  // Notification settings
  notifications: {
    email: {
      punchReminders: true,
      weeklyReports: true,
      systemUpdates: false,
      marketing: false,
    },
    push: {
      punchReminders: true,
      breakReminders: true,
      shiftAlerts: true,
      systemNotifications: true,
    },
    inApp: {
      realTimeUpdates: true,
      soundEnabled: true,
      vibrationEnabled: true,
    },
  },
  
  // Work settings
  work: {
    defaultBreakDuration: 30, // minutes
    autoBreakReminder: true,
    breakReminderInterval: 120, // minutes
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    overtimeThreshold: 8, // hours
    requireLocationForPunch: true,
    allowManualTimeEntry: false,
  },
  
  // Privacy settings
  privacy: {
    shareLocation: true,
    shareActivity: false,
    allowAnalytics: true,
  },
  
  // Display settings
  display: {
    compactMode: false,
    showSeconds: true,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    currency: 'USD',
  },
  
  // Loading and error states
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Settings slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Local settings updates (no API call)
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setTimezone: (state, action) => {
      state.timezone = action.payload;
    },
    updateLocalNotificationSettings: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateLocalWorkSettings: (state, action) => {
      state.work = { ...state.work, ...action.payload };
    },
    updateLocalPrivacySettings: (state, action) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    updateLocalDisplaySettings: (state, action) => {
      state.display = { ...state.display, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSettings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Settings
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        const settings = action.payload;
        
        // Update all settings from server
        if (settings.theme) state.theme = settings.theme;
        if (settings.language) state.language = settings.language;
        if (settings.timezone) state.timezone = settings.timezone;
        if (settings.notifications) state.notifications = { ...state.notifications, ...settings.notifications };
        if (settings.work) state.work = { ...state.work, ...settings.work };
        if (settings.privacy) state.privacy = { ...state.privacy, ...settings.privacy };
        if (settings.display) state.display = { ...state.display, ...settings.display };
        
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Settings
      .addCase(updateSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        const settings = action.payload;
        
        // Update settings from server response
        if (settings.theme) state.theme = settings.theme;
        if (settings.language) state.language = settings.language;
        if (settings.timezone) state.timezone = settings.timezone;
        if (settings.privacy) state.privacy = { ...state.privacy, ...settings.privacy };
        if (settings.display) state.display = { ...state.display, ...settings.display };
        
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Notification Settings
      .addCase(updateNotificationSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = { ...state.notifications, ...action.payload };
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Work Settings
      .addCase(updateWorkSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorkSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.work = { ...state.work, ...action.payload };
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateWorkSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setTheme,
  setLanguage,
  setTimezone,
  updateLocalNotificationSettings,
  updateLocalWorkSettings,
  updateLocalPrivacySettings,
  updateLocalDisplaySettings,
  clearError,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;