import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Initial state
const initialState = {
  attendanceReport: null,
  overtimeReport: null,
  locationViolationsReport: null,
  dailySummaryReport: null,
  dashboardData: null,
  customReport: null,
  loading: false,
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    userId: null,
    departmentId: null,
    reportType: 'attendance',
    groupBy: 'day',
    includeWeekends: true,
    includeHolidays: true,
  },
  exportLoading: false,
  lastGenerated: null,
};

// Async thunks
export const getAttendanceReport = createAsyncThunk(
  'report/getAttendanceReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/attendance', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate attendance report';
      return rejectWithValue(message);
    }
  }
);

export const getOvertimeReport = createAsyncThunk(
  'report/getOvertimeReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/overtime', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate overtime report';
      return rejectWithValue(message);
    }
  }
);

export const getLocationViolationsReport = createAsyncThunk(
  'report/getLocationViolationsReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/location-violations', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate location violations report';
      return rejectWithValue(message);
    }
  }
);

export const getDailySummaryReport = createAsyncThunk(
  'report/getDailySummaryReport',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/daily-summary', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate daily summary report';
      return rejectWithValue(message);
    }
  }
);

export const getDashboardData = createAsyncThunk(
  'report/getDashboardData',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/dashboard', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load dashboard data';
      return rejectWithValue(message);
    }
  }
);

export const generateCustomReport = createAsyncThunk(
  'report/generateCustomReport',
  async ({ reportConfig, filters }, { rejectWithValue }) => {
    try {
      const response = await api.post('/reports/custom', {
        reportConfig,
        filters,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate custom report';
      return rejectWithValue(message);
    }
  }
);

export const exportAttendanceReport = createAsyncThunk(
  'report/exportAttendanceReport',
  async ({ filters, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.download('/reports/attendance/export', {
        params: { ...filters, format },
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export attendance report';
      return rejectWithValue(message);
    }
  }
);

export const exportOvertimeReport = createAsyncThunk(
  'report/exportOvertimeReport',
  async ({ filters, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.download('/reports/overtime/export', {
        params: { ...filters, format },
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export overtime report';
      return rejectWithValue(message);
    }
  }
);

export const exportLocationViolationsReport = createAsyncThunk(
  'report/exportLocationViolationsReport',
  async ({ filters, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.download('/reports/location-violations/export', {
        params: { ...filters, format },
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export location violations report';
      return rejectWithValue(message);
    }
  }
);

export const exportDailySummaryReport = createAsyncThunk(
  'report/exportDailySummaryReport',
  async ({ filters, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.download('/reports/daily-summary/export', {
        params: { ...filters, format },
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export daily summary report';
      return rejectWithValue(message);
    }
  }
);

export const exportCustomReport = createAsyncThunk(
  'report/exportCustomReport',
  async ({ reportConfig, filters, format = 'csv' }, { rejectWithValue }) => {
    try {
      const response = await api.download('/reports/custom/export', {
        method: 'POST',
        data: { reportConfig, filters, format },
      });
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to export custom report';
      return rejectWithValue(message);
    }
  }
);

export const scheduleReport = createAsyncThunk(
  'report/scheduleReport',
  async ({ reportType, filters, schedule, recipients }, { rejectWithValue }) => {
    try {
      const response = await api.post('/reports/schedule', {
        reportType,
        filters,
        schedule,
        recipients,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to schedule report';
      return rejectWithValue(message);
    }
  }
);

export const getScheduledReports = createAsyncThunk(
  'report/getScheduledReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/scheduled');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get scheduled reports';
      return rejectWithValue(message);
    }
  }
);

export const deleteScheduledReport = createAsyncThunk(
  'report/deleteScheduledReport',
  async (scheduleId, { rejectWithValue }) => {
    try {
      await api.delete(`/reports/scheduled/${scheduleId}`);
      return scheduleId;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete scheduled report';
      return rejectWithValue(message);
    }
  }
);

// Helper functions
const formatReportData = (data, reportType) => {
  if (!data) return null;
  
  switch (reportType) {
    case 'attendance':
      return {
        ...data,
        summary: {
          totalEmployees: data.employees?.length || 0,
          totalWorkingDays: data.workingDays || 0,
          averageAttendance: data.attendanceRate || 0,
          totalHours: data.totalHours || 0,
        },
      };
    
    case 'overtime':
      return {
        ...data,
        summary: {
          totalOvertimeHours: data.totalOvertimeHours || 0,
          totalOvertimeCost: data.totalOvertimeCost || 0,
          averageOvertimePerEmployee: data.averageOvertimePerEmployee || 0,
          topOvertimeEmployees: data.topOvertimeEmployees || [],
        },
      };
    
    case 'location-violations':
      return {
        ...data,
        summary: {
          totalViolations: data.violations?.length || 0,
          violationRate: data.violationRate || 0,
          mostCommonViolationType: data.mostCommonViolationType || 'N/A',
          affectedEmployees: data.affectedEmployees || 0,
        },
      };
    
    default:
      return data;
  }
};

// Report slice
const reportSlice = createSlice({
  name: 'report',
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
        startDate: null,
        endDate: null,
        userId: null,
        departmentId: null,
        reportType: 'attendance',
        groupBy: 'day',
        includeWeekends: true,
        includeHolidays: true,
      };
    },
    setDateRange: (state, action) => {
      const { startDate, endDate } = action.payload;
      state.filters.startDate = startDate;
      state.filters.endDate = endDate;
    },
    setReportType: (state, action) => {
      state.filters.reportType = action.payload;
    },
    clearReportData: (state, action) => {
      const reportType = action.payload;
      switch (reportType) {
        case 'attendance':
          state.attendanceReport = null;
          break;
        case 'overtime':
          state.overtimeReport = null;
          break;
        case 'location-violations':
          state.locationViolationsReport = null;
          break;
        case 'daily-summary':
          state.dailySummaryReport = null;
          break;
        case 'custom':
          state.customReport = null;
          break;
        case 'dashboard':
          state.dashboardData = null;
          break;
        default:
          // Clear all reports
          state.attendanceReport = null;
          state.overtimeReport = null;
          state.locationViolationsReport = null;
          state.dailySummaryReport = null;
          state.customReport = null;
          state.dashboardData = null;
      }
    },
    updateLastGenerated: (state) => {
      state.lastGenerated = Date.now();
    },
    resetReportState: (state) => {
      state.attendanceReport = null;
      state.overtimeReport = null;
      state.locationViolationsReport = null;
      state.dailySummaryReport = null;
      state.dashboardData = null;
      state.customReport = null;
      state.error = null;
      state.lastGenerated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Attendance Report
      .addCase(getAttendanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceReport = formatReportData(action.payload, 'attendance');
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(getAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Overtime Report
      .addCase(getOvertimeReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOvertimeReport.fulfilled, (state, action) => {
        state.loading = false;
        state.overtimeReport = formatReportData(action.payload, 'overtime');
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(getOvertimeReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Location Violations Report
      .addCase(getLocationViolationsReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLocationViolationsReport.fulfilled, (state, action) => {
        state.loading = false;
        state.locationViolationsReport = formatReportData(action.payload, 'location-violations');
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(getLocationViolationsReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Daily Summary Report
      .addCase(getDailySummaryReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDailySummaryReport.fulfilled, (state, action) => {
        state.loading = false;
        state.dailySummaryReport = formatReportData(action.payload, 'daily-summary');
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(getDailySummaryReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Dashboard Data
      .addCase(getDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(getDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Generate Custom Report
      .addCase(generateCustomReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateCustomReport.fulfilled, (state, action) => {
        state.loading = false;
        state.customReport = action.payload;
        state.lastGenerated = Date.now();
        state.error = null;
      })
      .addCase(generateCustomReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Export Reports
      .addCase(exportAttendanceReport.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportAttendanceReport.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportAttendanceReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      .addCase(exportOvertimeReport.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportOvertimeReport.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportOvertimeReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      .addCase(exportLocationViolationsReport.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportLocationViolationsReport.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportLocationViolationsReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      .addCase(exportDailySummaryReport.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportDailySummaryReport.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportDailySummaryReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      .addCase(exportCustomReport.pending, (state) => {
        state.exportLoading = true;
        state.error = null;
      })
      .addCase(exportCustomReport.fulfilled, (state) => {
        state.exportLoading = false;
        state.error = null;
      })
      .addCase(exportCustomReport.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload;
      })
      
      // Schedule Report
      .addCase(scheduleReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleReport.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(scheduleReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get Scheduled Reports
      .addCase(getScheduledReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getScheduledReports.fulfilled, (state, action) => {
        state.loading = false;
        state.scheduledReports = action.payload;
        state.error = null;
      })
      .addCase(getScheduledReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete Scheduled Report
      .addCase(deleteScheduledReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteScheduledReport.fulfilled, (state, action) => {
        state.loading = false;
        if (state.scheduledReports) {
          state.scheduledReports = state.scheduledReports.filter(
            report => report.id !== action.payload
          );
        }
        state.error = null;
      })
      .addCase(deleteScheduledReport.rejected, (state, action) => {
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
  setDateRange,
  setReportType,
  clearReportData,
  updateLastGenerated,
  resetReportState,
} = reportSlice.actions;

// Selectors
export const selectReport = (state) => state.report;
export const selectAttendanceReport = (state) => state.report.attendanceReport;
export const selectOvertimeReport = (state) => state.report.overtimeReport;
export const selectLocationViolationsReport = (state) => state.report.locationViolationsReport;
export const selectDailySummaryReport = (state) => state.report.dailySummaryReport;
export const selectDashboardData = (state) => state.report.dashboardData;
export const selectCustomReport = (state) => state.report.customReport;
export const selectReportLoading = (state) => state.report.loading;
export const selectReportError = (state) => state.report.error;
export const selectReportFilters = (state) => state.report.filters;
export const selectExportLoading = (state) => state.report.exportLoading;
export const selectLastGenerated = (state) => state.report.lastGenerated;
export const selectScheduledReports = (state) => state.report.scheduledReports;
export const selectCurrentReport = (state) => {
  const { reportType } = state.report.filters;
  switch (reportType) {
    case 'attendance':
      return state.report.attendanceReport;
    case 'overtime':
      return state.report.overtimeReport;
    case 'location-violations':
      return state.report.locationViolationsReport;
    case 'daily-summary':
      return state.report.dailySummaryReport;
    case 'custom':
      return state.report.customReport;
    default:
      return null;
  }
};

export default reportSlice.reducer;