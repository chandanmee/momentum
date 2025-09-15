import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Download,
  FilterList,
  Refresh,
  DateRange,
  Assessment,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { formatDate, calculateTotalHours, calculateDuration } from '../../utils/helpers';

const Reports = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { punches } = useSelector((state) => state.punch);
  
  // Filter states
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily');
  const [department, setDepartment] = useState('all');
  const [employee, setEmployee] = useState('all');

  // Filtered and processed data
  const filteredData = useMemo(() => {
    return punches.filter(punch => {
      const punchDate = new Date(punch.timestamp);
      return punchDate >= startDate && punchDate <= endDate;
    });
  }, [punches, startDate, endDate]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalHours = calculateTotalHours(filteredData);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const avgHoursPerDay = filteredData.length > 0 ? 
      (parseFloat(totalHours.replace(':', '.')) / totalDays).toFixed(2) : '0.00';
    
    return {
      totalHours,
      totalDays,
      avgHoursPerDay,
      totalPunches: filteredData.length,
    };
  }, [filteredData, startDate, endDate]);

  // Group data by report type
  const reportData = useMemo(() => {
    const grouped = {};
    
    filteredData.forEach(punch => {
      const date = new Date(punch.timestamp);
      let key;
      
      switch (reportType) {
        case 'daily':
          key = date.toDateString();
          break;
        case 'weekly':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toDateString();
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(punch);
    });
    
    return Object.entries(grouped).map(([period, punches]) => ({
      period,
      punches,
      totalHours: calculateTotalHours(punches),
      punchCount: punches.length,
    }));
  }, [filteredData, reportType]);

  // Handle export functionality
  const handleExport = useCallback((format) => {
    console.log(`Exporting report in ${format} format`);
    // This would implement actual export functionality
  }, []);

  // Handle filter refresh
  const handleRefresh = useCallback(() => {
    // This would refresh the data from the server
    console.log('Refreshing report data');
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h4" component="h1">
              Reports & Analytics
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('pdf')}
              >
                Export PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('excel')}
              >
                Export Excel
              </Button>
              <IconButton onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
          
          {/* Filters */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={department}
                  label="Department"
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <MenuItem value="all">All Departments</MenuItem>
                  <MenuItem value="engineering">Engineering</MenuItem>
                  <MenuItem value="sales">Sales</MenuItem>
                  <MenuItem value="marketing">Marketing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Employee</InputLabel>
                <Select
                  value={employee}
                  label="Employee"
                  onChange={(e) => setEmployee(e.target.value)}
                >
                  <MenuItem value="all">All Employees</MenuItem>
                  <MenuItem value="current">Current User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="contained"
                startIcon={<FilterList />}
                fullWidth
                onClick={() => console.log('Apply filters')}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Hours
                    </Typography>
                    <Typography variant="h4" component="div">
                      {summaryStats.totalHours}
                    </Typography>
                  </Box>
                  <AccessTime color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Days
                    </Typography>
                    <Typography variant="h4" component="div">
                      {summaryStats.totalDays}
                    </Typography>
                  </Box>
                  <DateRange color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Avg Hours/Day
                    </Typography>
                    <Typography variant="h4" component="div">
                      {summaryStats.avgHoursPerDay}
                    </Typography>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Punches
                    </Typography>
                    <Typography variant="h4" component="div">
                      {summaryStats.totalPunches}
                    </Typography>
                  </Box>
                  <Assessment color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Report Data Table */}
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
              <Typography variant="h6" component="div">
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report Data
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="center">Total Hours</TableCell>
                    <TableCell align="center">Punch Count</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" fontWeight="medium">
                            {row.period}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {row.totalHours}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.punchCount}
                            size="small"
                            color={row.punchCount > 0 ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={parseFloat(row.totalHours.replace(':', '.')) >= 8 ? 'Complete' : 'Incomplete'}
                            size="small"
                            color={parseFloat(row.totalHours.replace(':', '.')) >= 8 ? 'success' : 'warning'}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => console.log('View details for', row.period)}
                          >
                            <Assessment />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="textSecondary" sx={{ py: 4 }}>
                          No data available for the selected period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;