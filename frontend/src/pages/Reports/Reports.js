import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  BarChart as ChartIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  subDays,
  subWeeks,
  subMonths
} from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { getAttendanceReport, getDailySummaryReport, generateCustomReport, exportAttendanceReport, exportOvertimeReport, exportCustomReport } from '../../store/slices/reportSlice';
import { showNotification } from '../../store/slices/uiSlice';
import StatusCard from '../../components/Dashboard/StatusCard';
import ReportsChart from '../../components/Reports/ReportsChart';
import EmployeeReportTable from '../../components/Reports/EmployeeReportTable';
import DepartmentSummary from '../../components/Reports/DepartmentSummary';

const Reports = () => {
  const dispatch = useDispatch();
  
  const { 
    reports, 
    summary, 
    loading, 
    error 
  } = useSelector(state => state.reports);
  
  const { user } = useSelector(state => state.auth);
  
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [reportType, setReportType] = useState('summary');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);

  // Date range options
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last90Days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Report type options
  const reportTypeOptions = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'detailed', label: 'Detailed Report' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'overtime', label: 'Overtime Report' },
    { value: 'department', label: 'Department Report' }
  ];

  // Tab options
  const tabOptions = [
    { label: 'Overview', value: 'overview' },
    { label: 'Employee Reports', value: 'employees' },
    { label: 'Department Analysis', value: 'departments' },
    { label: 'Time Trends', value: 'trends' }
  ];

  // Calculate date range
  const getDateRange = useCallback(() => {
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        return { start: now, end: now };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: yesterday, end: yesterday };
      case 'thisWeek':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        return { start: lastWeekStart, end: endOfWeek(lastWeekStart) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      case 'last30Days':
        return { start: subDays(now, 30), end: now };
      case 'last90Days':
        return { start: subDays(now, 90), end: now };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : subDays(now, 30),
          end: customEndDate ? new Date(customEndDate) : now
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch reports data
  const fetchReportsData = useCallback(async () => {
    const { start, end } = getDateRange();
    
    const params = {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      employee: selectedEmployee !== 'all' ? selectedEmployee : undefined
    };

    try {
      // Use appropriate get function based on report type
      let fetchAction;
      switch (reportType) {
        case 'attendance':
          fetchAction = getAttendanceReport(params);
          break;
        case 'summary':
        case 'detailed':
          fetchAction = getDailySummaryReport(params);
          break;
        case 'overtime':
         case 'department':
         default:
           fetchAction = generateCustomReport({ ...params, reportType });
           break;
      }
      
      await dispatch(fetchAction).unwrap();
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to fetch reports',
        severity: 'error'
      }));
    }
  }, [selectedDepartment, selectedEmployee, reportType, dispatch, getDateRange]);

  // Handle export
  const handleExport = async (format) => {
    setExportLoading(true);
    
    try {
      const { start, end } = getDateRange();
      
      const params = {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        employee: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        format
      };

      // Use appropriate export function based on report type
      let exportAction;
      switch (reportType) {
        case 'attendance':
          exportAction = exportAttendanceReport(params);
          break;
        case 'overtime':
          exportAction = exportOvertimeReport(params);
          break;
        case 'summary':
        case 'detailed':
        case 'department':
        default:
          exportAction = exportCustomReport({ ...params, reportType });
          break;
      }

      await dispatch(exportAction).unwrap();
      
      dispatch(showNotification({
        message: `Report exported successfully as ${format.toUpperCase()}`,
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to export report',
        severity: 'error'
      }));
    } finally {
      setExportLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchReportsData();
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0h 0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (!summary) {
      return {
        totalHours: 0,
        totalEmployees: 0,
        avgHoursPerEmployee: 0,
        overtimeHours: 0,
        attendanceRate: 0,
        productivityScore: 0
      };
    }

    return {
      totalHours: summary.totalWorkHours || 0,
      totalEmployees: summary.totalEmployees || 0,
      avgHoursPerEmployee: summary.avgHoursPerEmployee || 0,
      overtimeHours: summary.overtimeHours || 0,
      attendanceRate: summary.attendanceRate || 0,
      productivityScore: summary.productivityScore || 85 // Mock data
    };
  };

  const stats = calculateSummaryStats();

  // Initial data fetch
  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportIcon />
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive time tracking reports and workforce analytics
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          Report Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                label="Date Range"
              >
                {dateRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {dateRange === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Report Type"
              >
                {reportTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {user?.role === 'admin' && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    <MenuItem value="engineering">Engineering</MenuItem>
                    <MenuItem value="sales">Sales</MenuItem>
                    <MenuItem value="marketing">Marketing</MenuItem>
                    <MenuItem value="hr">Human Resources</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    label="Employee"
                  >
                    <MenuItem value="all">All Employees</MenuItem>
                    {/* Add employee options dynamically */}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sm={6} md={1}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
        
        {/* Export Buttons */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CsvIcon />}
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            Export CSV
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<PdfIcon />}
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
          >
            Export PDF
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Summary Cards */}
      {!loading && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Total Hours"
              value={formatDuration(stats.totalHours * 60)}
              icon={<TimeIcon />}
              color="primary"
              trend={stats.totalHours > 0 ? { value: 12, direction: 'up' } : null}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Employees"
              value={stats.totalEmployees}
              icon={<PersonIcon />}
              color="info"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Avg Hours/Employee"
              value={formatDuration(stats.avgHoursPerEmployee * 60)}
              icon={<ScheduleIcon />}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Overtime Hours"
              value={formatDuration(stats.overtimeHours * 60)}
              icon={<TrendingUpIcon />}
              color="warning"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Attendance Rate"
              value={`${stats.attendanceRate.toFixed(1)}%`}
              icon={<CalendarIcon />}
              color="success"
              progress={stats.attendanceRate}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <StatusCard
              title="Productivity"
              value={`${stats.productivityScore}%`}
              icon={<ChartIcon />}
              color="primary"
              progress={stats.productivityScore}
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabOptions.map((tab, index) => (
            <Tab key={tab.value} label={tab.label} />
          ))}
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <ReportsChart 
                  data={reports} 
                  type="overview"
                  dateRange={getDateRange()}
                />
              </Grid>
              
              <Grid item xs={12} lg={4}>
                <DepartmentSummary 
                  data={summary?.departmentBreakdown || []}
                  loading={loading}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Employee Reports Tab */}
          {activeTab === 1 && (
            <EmployeeReportTable
              data={reports?.employees || []}
              loading={loading}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
          
          {/* Department Analysis Tab */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ReportsChart 
                  data={reports} 
                  type="department"
                  dateRange={getDateRange()}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Time Trends Tab */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ReportsChart 
                  data={reports} 
                  type="trends"
                  dateRange={getDateRange()}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Reports;