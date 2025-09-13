import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  users: [],
  currentUser: null,
  userProfile: null,
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
    department: '',
    role: '',
    status: 'active',
  },
};

// Async thunks
export const getUsers = createAsyncThunk(
  'user/getUsers',
  async ({ page = 1, limit = 20, search = '', department = '', role = '', status = 'active' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/users', {
        params: { page, limit, search, department, role, status },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch users';
      return rejectWithValue(message);
    }
  }
);

export const getUserById = createAsyncThunk(
  'user/getUserById',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch user';
      return rejectWithValue(message);
    }
  }
);

export const createUser = createAsyncThunk(
  'user/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/users', userData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create user';
      return rejectWithValue(message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update user';
      return rejectWithValue(message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'user/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      await api.delete(`/users/${userId}`);
      return userId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete user';
      return rejectWithValue(message);
    }
  }
);

export const restoreUser = createAsyncThunk(
  'user/restoreUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/${userId}/restore`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to restore user';
      return rejectWithValue(message);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'user/uploadAvatar',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.upload('/users/avatar', formData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload avatar';
      return rejectWithValue(message);
    }
  }
);

export const changeUserPassword = createAsyncThunk(
  'user/changeUserPassword',
  async ({ userId, currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${userId}/password`, {
        currentPassword,
        newPassword,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      return rejectWithValue(message);
    }
  }
);

export const getUserStats = createAsyncThunk(
  'user/getUserStats',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}/stats`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch user stats';
      return rejectWithValue(message);
    }
  }
);

export const bulkUpdateUsers = createAsyncThunk(
  'user/bulkUpdateUsers',
  async ({ userIds, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/bulk', {
        userIds,
        updateData,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to bulk update users';
      return rejectWithValue(message);
    }
  }
);

export const exportUsers = createAsyncThunk(
  'user/exportUsers',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.download('/users/export', {
        params: filters,
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export users';
      return rejectWithValue(message);
    }
  }
);

// User slice
const userSlice = createSlice({
  name: 'user',
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
        department: '',
        role: '',
        status: 'active',
      };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    updateUserInList: (state, action) => {
      const { userId, userData } = action.payload;
      const userIndex = state.users.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        state.users[userIndex] = { ...state.users[userIndex], ...userData };
      }
    },
    removeUserFromList: (state, action) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
    addUserToList: (state, action) => {
      state.users.unshift(action.payload);
      state.pagination.total += 1;
    },
    resetUserState: (state) => {
      state.users = [];
      state.currentUser = null;
      state.userProfile = null;
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
      // Get Users
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
        state.error = null;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get User By ID
      .addCase(getUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.error = null;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create User
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.unshift(action.payload);
        state.pagination.total += 1;
        state.error = null;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update user in list
        const userIndex = state.users.findIndex(user => user.id === action.payload.id);
        if (userIndex !== -1) {
          state.users[userIndex] = action.payload;
        }
        
        // Update current user if it's the same
        if (state.currentUser && state.currentUser.id === action.payload.id) {
          state.currentUser = action.payload;
        }
        
        state.error = null;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(user => user.id !== action.payload);
        state.pagination.total -= 1;
        
        if (state.currentUser && state.currentUser.id === action.payload) {
          state.currentUser = null;
        }
        
        state.error = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Restore User
      .addCase(restoreUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreUser.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update user in list
        const userIndex = state.users.findIndex(user => user.id === action.payload.id);
        if (userIndex !== -1) {
          state.users[userIndex] = action.payload;
        } else {
          state.users.unshift(action.payload);
          state.pagination.total += 1;
        }
        
        state.error = null;
      })
      .addCase(restoreUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update User Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Upload Avatar
      .addCase(uploadAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update user profile avatar
        if (state.userProfile) {
          state.userProfile.avatar = action.payload.avatar;
        }
        
        state.error = null;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Change User Password
      .addCase(changeUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeUserPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changeUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get User Stats
      .addCase(getUserStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserStats.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add stats to current user
        if (state.currentUser) {
          state.currentUser.stats = action.payload;
        }
        
        state.error = null;
      })
      .addCase(getUserStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk Update Users
      .addCase(bulkUpdateUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateUsers.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update users in list
        action.payload.updatedUsers?.forEach(updatedUser => {
          const userIndex = state.users.findIndex(user => user.id === updatedUser.id);
          if (userIndex !== -1) {
            state.users[userIndex] = updatedUser;
          }
        });
        
        state.error = null;
      })
      .addCase(bulkUpdateUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export Users
      .addCase(exportUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportUsers.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(exportUsers.rejected, (state, action) => {
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
  setCurrentUser,
  clearCurrentUser,
  updateUserInList,
  removeUserFromList,
  addUserToList,
  resetUserState,
} = userSlice.actions;

// Selectors
export const selectUser = (state) => state.user;
export const selectUsers = (state) => state.user.users;
export const selectCurrentUser = (state) => state.user.currentUser;
export const selectUserProfile = (state) => state.user.userProfile;
export const selectUserLoading = (state) => state.user.loading;
export const selectUserError = (state) => state.user.error;
export const selectUserPagination = (state) => state.user.pagination;
export const selectUserFilters = (state) => state.user.filters;
export const selectUserById = (userId) => (state) => 
  state.user.users.find(user => user.id === userId);

export default userSlice.reducer;