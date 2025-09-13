import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Chip,
  useTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  getDay,
  getHours
} from 'date-fns';

const ReportsChart = ({ data, type, dateRange }) => {
  const theme = useTheme();
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('daily');

  // Chart type options based on report type
  const getChartTypeOptions = () => {
    switch (type) {
      case 'overview':
        return [
          { value: 'bar', label: 'Bar Chart' },
          { value: 'line', label: 'Line Chart' },
          { value: 'area', label: 'Area Chart' }
        ];
      case 'department':
        return [
          { value: 'bar', label: 'Bar Chart' },
          { value: 'pie', label: 'Pie Chart' }
        ];
      case 'trends':
        return [
          { value: 'line', label: 'Line Chart' },
          { value: 'area', label: 'Area Chart' }
        ];
      default:
        return [
          { value: 'bar', label: 'Bar Chart' },
          { value: 'line', label: 'Line Chart' }
        ];
    }
  };

  // View mode options
  const viewModeOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'hourly', label: 'Hourly' }
  ];

  // Color palette
  const colors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main
  };

  const pieColors = [
    colors.primary,
    colors.secondary,
    colors.success,
    colors.warning,
    colors.error,
    colors.info,
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300'
  ];

  // Process data based on type and view mode
  const processedData = useMemo(() => {
    if (!data || !dateRange) return [];

    switch (type) {
      case 'overview':
        return processOverviewData();
      case 'department':
        return processDepartmentData();
      case 'trends':
        return processTrendsData();
      default:
        return [];
    }
  }, [data, type, viewMode, dateRange]);

  // Process overview data
  const processOverviewData = () => {
    if (!data.daily) return [];

    switch (viewMode) {
      case 'daily':
        return processDailyData();
      case 'weekly':
        return processWeeklyData();
      case 'monthly':
        return processMonthlyData();
      case 'hourly':
        return processHourlyData();
      default:
        return processDailyData();
    }
  };

  // Process daily data
  const processDailyData = () => {
    const { start, end } = dateRange;
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayData = data.daily?.find(d => d.date === dayStr) || {};
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: dayStr,
        workHours: dayData.workHours || 0,
        breakHours: dayData.breakHours || 0,
        overtimeHours: dayData.overtimeHours || 0,
        employees: dayData.activeEmployees || 0,
        productivity: dayData.productivity || 0
      };
    });
  };

  // Process weekly data
  const processWeeklyData = () => {
    const { start, end } = dateRange;
    const weeks = eachWeekOfInterval({ start, end });
    
    return weeks.map(week => {
      const weekStart = startOfWeek(week);
      const weekEnd = endOfWeek(week);
      const weekStr = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`;
      
      // Aggregate weekly data
      const weekData = data.weekly?.find(w => w.week === format(weekStart, 'yyyy-MM-dd')) || {};
      
      return {
        date: weekStr,
        workHours: weekData.workHours || 0,
        breakHours: weekData.breakHours || 0,
        overtimeHours: weekData.overtimeHours || 0,
        employees: weekData.activeEmployees || 0,
        productivity: weekData.productivity || 0
      };
    });
  };

  // Process monthly data
  const processMonthlyData = () => {
    const { start, end } = dateRange;
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const monthStr = format(month, 'MMM yyyy');
      const monthData = data.monthly?.find(m => m.month === format(month, 'yyyy-MM')) || {};
      
      return {
        date: monthStr,
        workHours: monthData.workHours || 0,
        breakHours: monthData.breakHours || 0,
        overtimeHours: monthData.overtimeHours || 0,
        employees: monthData.activeEmployees || 0,
        productivity: monthData.productivity || 0
      };
    });
  };

  // Process hourly data
  const processHourlyData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return hours.map(hour => {
      const hourData = data.hourly?.find(h => h.hour === hour) || {};
      
      return {
        date: `${hour}:00`,
        hour,
        workHours: hourData.workHours || 0,
        employees: hourData.activeEmployees || 0,
        punchIns: hourData.punchIns || 0,
        punchOuts: hourData.punchOuts || 0
      };
    });
  };

  // Process department data
  const processDepartmentData = () => {
    if (!data.departments) return [];
    
    return data.departments.map(dept => ({
      name: dept.name,
      workHours: dept.workHours || 0,
      employees: dept.employees || 0,
      avgHours: dept.avgHours || 0,
      productivity: dept.productivity || 0,
      attendance: dept.attendance || 0
    }));
  };

  // Process trends data
  const processTrendsData = () => {
    if (!data.trends) return [];
    
    return data.trends.map(trend => ({
      date: format(parseISO(trend.date), 'MMM dd'),
      workHours: trend.workHours || 0,
      productivity: trend.productivity || 0,
      attendance: trend.attendance || 0,
      overtime: trend.overtime || 0
    }));
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: '50%'
                }}
              />
              <Typography variant="body2">
                {entry.name}: {entry.name.includes('Hours') ? 
                  `${entry.value.toFixed(1)}h` : 
                  entry.value
                }
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Render chart based on type
  const renderChart = () => {
    if (!processedData.length) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: 400,
          color: 'text.secondary'
        }}>
          <Typography>No data available for the selected period</Typography>
        </Box>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="workHours" fill={colors.primary} name="Work Hours" />
              {type === 'overview' && (
                <>
                  <Bar dataKey="breakHours" fill={colors.warning} name="Break Hours" />
                  <Bar dataKey="overtimeHours" fill={colors.error} name="Overtime Hours" />
                </>
              )}
              {type === 'department' && (
                <Bar dataKey="employees" fill={colors.secondary} name="Employees" />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="workHours" 
                stroke={colors.primary} 
                name="Work Hours"
                strokeWidth={2}
              />
              {type === 'trends' && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke={colors.success} 
                    name="Productivity %"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke={colors.info} 
                    name="Attendance %"
                    strokeWidth={2}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="workHours" 
                stackId="1"
                stroke={colors.primary} 
                fill={colors.primary}
                fillOpacity={0.6}
                name="Work Hours"
              />
              {type === 'overview' && (
                <Area 
                  type="monotone" 
                  dataKey="breakHours" 
                  stackId="1"
                  stroke={colors.warning} 
                  fill={colors.warning}
                  fillOpacity={0.6}
                  name="Break Hours"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="workHours"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  // Get chart title
  const getChartTitle = () => {
    switch (type) {
      case 'overview':
        return `Time Tracking Overview - ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View`;
      case 'department':
        return 'Department Analysis';
      case 'trends':
        return 'Time Tracking Trends';
      default:
        return 'Chart';
    }
  };

  // Calculate summary stats
  const calculateSummaryStats = () => {
    if (!processedData.length) return null;
    
    const totalWorkHours = processedData.reduce((sum, item) => sum + (item.workHours || 0), 0);
    const avgWorkHours = totalWorkHours / processedData.length;
    const maxWorkHours = Math.max(...processedData.map(item => item.workHours || 0));
    const minWorkHours = Math.min(...processedData.map(item => item.workHours || 0));
    
    return {
      total: totalWorkHours,
      average: avgWorkHours,
      maximum: maxWorkHours,
      minimum: minWorkHours
    };
  };

  const summaryStats = calculateSummaryStats();

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {getChartTitle()}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {type === 'overview' && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>View</InputLabel>
                <Select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  label="View"
                >
                  {viewModeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                label="Chart Type"
              >
                {getChartTypeOptions().map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Summary Stats */}
        {summaryStats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {summaryStats.total.toFixed(1)}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Hours
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {summaryStats.average.toFixed(1)}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Average
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {summaryStats.maximum.toFixed(1)}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maximum
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {summaryStats.minimum.toFixed(1)}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Minimum
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Chart */}
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default ReportsChart;