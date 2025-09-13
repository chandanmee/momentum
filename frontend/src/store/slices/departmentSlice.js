import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  departments: [],
  currentDepartment: null,
  departmentEmployees: [],
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
  },
  stats: null,
};

// Async thunks
export const getDepartments = createAsyncThunk(
  'department/getDepartments',
  async ({ page = 1, limit = 20, search = '', status = 'active' }, { rejectWithValue }) => {
    try {
      const response = await api.get('/departments', {
        params: { page, limit, search, status },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch departments';
      return rejectWithValue(message);
    }
  }
);

export const getAllDepartments = createAsyncThunk(
  'department/getAllDepartments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/departments/all');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch all departments';
      return rejectWithValue(message);
    }
  }
);

export const getDepartmentById = createAsyncThunk(
  'department/getDepartmentById',
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/departments/${departmentId}`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch department';
      return rejectWithValue(message);
    }
  }
);

export const createDepartment = createAsyncThunk(
  'department/createDepartment',
  async (departmentData, { rejectWithValue }) => {
    try {
      const response = await api.post('/departments', departmentData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create department';
      return rejectWithValue(message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'department/updateDepartment',
  async ({ departmentId, departmentData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/departments/${departmentId}`, departmentData);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update department';
      return rejectWithValue(message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'department/deleteDepartment',
  async (departmentId, { rejectWithValue }) => {
    try {
      await api.delete(`/departments/${departmentId}`);
      return departmentId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete department';
      return rejectWithValue(message);
    }
  }
);

export const restoreDepartment = createAsyncThunk(
  'department/restoreDepartment',
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/departments/${departmentId}/restore`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to restore department';
      return rejectWithValue(message);
    }
  }
);

export const getDepartmentEmployees = createAsyncThunk(
  'department/getDepartmentEmployees',
  async ({ departmentId, page = 1, limit = 20, search = '', status = 'active' }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/departments/${departmentId}/employees`, {
        params: { page, limit, search, status },
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch department employees';
      return rejectWithValue(message);
    }
  }
);

export const assignEmployeesToDepartment = createAsyncThunk(
  'department/assignEmployeesToDepartment',
  async ({ departmentId, employeeIds }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/departments/${departmentId}/employees`, {
        employeeIds,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign employees to department';
      return rejectWithValue(message);
    }
  }
);

export const removeEmployeesFromDepartment = createAsyncThunk(
  'department/removeEmployeesFromDepartment',
  async ({ departmentId, employeeIds }, { rejectWithValue }) => {
    try {
      await api.delete(`/departments/${departmentId}/employees`, {
        data: { employeeIds },
      });
      return { departmentId, employeeIds };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove employees from department';
      return rejectWithValue(message);
    }
  }
);

export const getDepartmentStats = createAsyncThunk(
  'department/getDepartmentStats',
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/departments/${departmentId}/stats`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch department stats';
      return rejectWithValue(message);
    }
  }
);

export const getAllDepartmentStats = createAsyncThunk(
  'department/getAllDepartmentStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/departments/stats');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch department statistics';
      return rejectWithValue(message);
    }
  }
);

export const bulkUpdateDepartments = createAsyncThunk(
  'department/bulkUpdateDepartments',
  async ({ departmentIds, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put('/departments/bulk', {
        departmentIds,
        updateData,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to bulk update departments';
      return rejectWithValue(message);
    }
  }
);

export const exportDepartments = createAsyncThunk(
  'department/exportDepartments',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.download('/departments/export', {
        params: filters,
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export departments';
      return rejectWithValue(message);
    }
  }
);

export const transferEmployees = createAsyncThunk(
  'department/transferEmployees',
  async ({ fromDepartmentId, toDepartmentId, employeeIds }, { rejectWithValue }) => {
    try {
      const response = await api.post('/departments/transfer', {
        fromDepartmentId,
        toDepartmentId,
        employeeIds,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to transfer employees';
      return rejectWithValue(message);
    }
  }
);

// Department slice
const departmentSlice = createSlice({
  name: 'department',
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
      };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setCurrentDepartment: (state, action) => {
      state.currentDepartment = action.payload;
    },
    clearCurrentDepartment: (state) => {
      state.currentDepartment = null;
      state.departmentEmployees = [];
    },
    updateDepartmentInList: (state, action) => {
      const { departmentId, departmentData } = action.payload;
      const departmentIndex = state.departments.findIndex(dept => dept.id === departmentId);
      if (departmentIndex !== -1) {
        state.departments[departmentIndex] = { ...state.departments[departmentIndex], ...departmentData };
      }
    },
    removeDepartmentFromList: (state, action) => {
      state.departments = state.departments.filter(dept => dept.id !== action.payload);
    },
    addDepartmentToList: (state, action) => {
      state.departments.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateEmployeeInDepartment: (state, action) => {
      const { employeeId, employeeData } = action.payload;
      const employeeIndex = state.departmentEmployees.findIndex(emp => emp.id === employeeId);
      if (employeeIndex !== -1) {
        state.departmentEmployees[employeeIndex] = { ...state.departmentEmployees[employeeIndex], ...employeeData };
      }
    },
    removeEmployeeFromDepartment: (state, action) => {
      const employeeIds = Array.isArray(action.payload) ? action.payload : [action.payload];
      state.departmentEmployees = state.departmentEmployees.filter(
        emp => !employeeIds.includes(emp.id)
      );
    },
    addEmployeeToDepartment: (state, action) => {
      const employees = Array.isArray(action.payload) ? action.payload : [action.payload];
      state.departmentEmployees.unshift(...employees);
    },
    resetDepartmentState: (state) => {
      state.departments = [];
      state.currentDepartment = null;
      state.departmentEmployees = [];
      state.error = null;
      state.stats = null;
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
      // Get Departments
      .addCase(getDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload.departments || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
          totalPages: action.payload.totalPages || 0,
        };
        state.error = null;
      })
      .addCase(getDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get All Departments
      .addCase(getAllDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload || [];
        state.error = null;
      })
      .addCase(getAllDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Department By ID
      .addCase(getDepartmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepartmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDepartment = action.payload;
        state.error = null;
      })
      .addCase(getDepartmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Department
      .addCase(createDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments.unshift(action.payload);
        state.pagination.total += 1;
        state.error = null;
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Department
      .addCase(updateDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update department in list
        const departmentIndex = state.departments.findIndex(dept => dept.id === action.payload.id);
        if (departmentIndex !== -1) {
          state.departments[departmentIndex] = action.payload;
        }
        
        // Update current department if it's the same
        if (state.currentDepartment && state.currentDepartment.id === action.payload.id) {
          state.currentDepartment = action.payload;
        }
        
        state.error = null;
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Department
      .addCase(deleteDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = state.departments.filter(dept => dept.id !== action.payload);
        state.pagination.total -= 1;
        
        if (state.currentDepartment && state.currentDepartment.id === action.payload) {
          state.currentDepartment = null;
          state.departmentEmployees = [];
        }
        
        state.error = null;
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Restore Department
      .addCase(restoreDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreDepartment.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update department in list
        const departmentIndex = state.departments.findIndex(dept => dept.id === action.payload.id);
        if (departmentIndex !== -1) {
          state.departments[departmentIndex] = action.payload;
        } else {
          state.departments.unshift(action.payload);
          state.pagination.total += 1;
        }
        
        state.error = null;
      })
      .addCase(restoreDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Department Employees
      .addCase(getDepartmentEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepartmentEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.departmentEmployees = action.payload.employees || [];
        state.error = null;
      })
      .addCase(getDepartmentEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Assign Employees to Department
      .addCase(assignEmployeesToDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignEmployeesToDepartment.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add new employees to department employees list
        if (action.payload.employees) {
          state.departmentEmployees.unshift(...action.payload.employees);
        }
        
        state.error = null;
      })
      .addCase(assignEmployeesToDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove Employees from Department
      .addCase(removeEmployeesFromDepartment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeEmployeesFromDepartment.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove employees from department employees list
        const { employeeIds } = action.payload;
        state.departmentEmployees = state.departmentEmployees.filter(
          emp => !employeeIds.includes(emp.id)
        );
        
        state.error = null;
      })
      .addCase(removeEmployeesFromDepartment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Department Stats
      .addCase(getDepartmentStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDepartmentStats.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add stats to current department
        if (state.currentDepartment) {
          state.currentDepartment.stats = action.payload;
        }
        
        state.error = null;
      })
      .addCase(getDepartmentStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get All Department Stats
      .addCase(getAllDepartmentStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllDepartmentStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(getAllDepartmentStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Bulk Update Departments
      .addCase(bulkUpdateDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateDepartments.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update departments in list
        action.payload.updatedDepartments?.forEach(updatedDept => {
          const deptIndex = state.departments.findIndex(dept => dept.id === updatedDept.id);
          if (deptIndex !== -1) {
            state.departments[deptIndex] = updatedDept;
          }
        });
        
        state.error = null;
      })
      .addCase(bulkUpdateDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export Departments
      .addCase(exportDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportDepartments.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(exportDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Transfer Employees
      .addCase(transferEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferEmployees.fulfilled, (state, action) => {
        state.loading = false;
        
        // Remove transferred employees from current department if viewing it
        if (action.payload.fromDepartmentId && state.currentDepartment?.id === action.payload.fromDepartmentId) {
          const transferredIds = action.payload.transferredEmployees?.map(emp => emp.id) || [];
          state.departmentEmployees = state.departmentEmployees.filter(
            emp => !transferredIds.includes(emp.id)
          );
        }
        
        // Add transferred employees to current department if viewing it
        if (action.payload.toDepartmentId && state.currentDepartment?.id === action.payload.toDepartmentId) {
          if (action.payload.transferredEmployees) {
            state.departmentEmployees.unshift(...action.payload.transferredEmployees);
          }
        }
        
        state.error = null;
      })
      .addCase(transferEmployees.rejected, (state, action) => {
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
  setCurrentDepartment,
  clearCurrentDepartment,
  updateDepartmentInList,
  removeDepartmentFromList,
  addDepartmentToList,
  updateEmployeeInDepartment,
  removeEmployeeFromDepartment,
  addEmployeeToDepartment,
  resetDepartmentState,
} = departmentSlice.actions;

// Selectors
export const selectDepartment = (state) => state.department;
export const selectDepartments = (state) => state.department.departments;
export const selectCurrentDepartment = (state) => state.department.currentDepartment;
export const selectDepartmentEmployees = (state) => state.department.departmentEmployees;
export const selectDepartmentLoading = (state) => state.department.loading;
export const selectDepartmentError = (state) => state.department.error;
export const selectDepartmentPagination = (state) => state.department.pagination;
export const selectDepartmentFilters = (state) => state.department.filters;
export const selectDepartmentStats = (state) => state.department.stats;
export const selectDepartmentById = (departmentId) => (state) => 
  state.department.departments.find(dept => dept.id === departmentId);
export const selectActiveDepartments = (state) => 
  state.department.departments.filter(dept => dept.status === 'active');
export const selectDepartmentOptions = (state) => 
  state.department.departments.map(dept => ({ value: dept.id, label: dept.name }));

export default departmentSlice.reducer;