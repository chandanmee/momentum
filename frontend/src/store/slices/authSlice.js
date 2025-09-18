import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import authService from '../../services/authService';
import { addNotification } from './uiSlice';

// Helper function to get error message
const getErrorMessage = (error) => {
  return error.response?.data?.message || error.message || 'An error occurred';
};

// Async thunks
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.checkAuth();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue, dispatch }) => {
    try {
      const response = await authService.login(credentials);
      // Store token in localStorage immediately
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      // Dispatch success notification
      dispatch(addNotification({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome back! You have been logged in successfully.',
        duration: 4000,
      }));
      
      return response;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Dispatch error notification
      dispatch(addNotification({
        type: 'error',
        title: 'Login Failed',
        message: errorMessage,
        duration: 6000,
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue, dispatch }) => {
    try {
      const response = await authService.register(userData);
      
      // Dispatch success notification
      dispatch(addNotification({
        type: 'success',
        title: 'Registration Successful',
        message: 'Your account has been created successfully! Please log in to continue.',
        duration: 5000,
      }));
      
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Dispatch error notification
      dispatch(addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
        duration: 6000,
      }));
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      // Clear localStorage token
      localStorage.removeItem('token');
      // Clear persisted state
      const { persistor } = await import('../index');
      await persistor.purge();
      return {};
    } catch (error) {
      // Even if server request fails, clear local storage and persist
      localStorage.removeItem('token');
      const { persistor } = await import('../index');
      await persistor.purge();
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profileData);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle rehydration
      .addCase(REHYDRATE, (state, action) => {
        if (action.payload?.auth) {
          const { user, token, isAuthenticated } = action.payload.auth;
          state.user = user;
          state.token = token;
          state.isAuthenticated = isAuthenticated;
        }
        state.isInitialized = true;
      })
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data?.user || action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        // Don't auto-login after registration
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Still logout locally even if server request fails
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Get profile
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data.user;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data.user;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser, setToken, resetAuth } = authSlice.actions;

export default authSlice.reducer;