import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  useTheme
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  format, 
  parseISO, 
  differenceInMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';

const TimeTrackingChart = ({ 
  data = [], 
  startDate, 
  endDate, 
  chartType = 'daily',
  onChartTypeChange 
}) => {
  const theme = useTheme();

  // Process data for different chart types
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (chartType) {
      case 'daily':
        return processDailyData(data, startDate, endDate);
      case 'weekly':
        return processWeeklyData(data, startDate, endDate);
      case 'hourly':
        return processHourlyData(data);
      case 'breakdown':
        return processBreakdownData(data);
      default:
        return processDailyData(data, startDate, endDate);
    }
  }, [data, startDate, endDate, chartType]);

  // Process daily data
  function processDailyData(punches, start, end) {
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayPunches = punches.filter(punch => {
        if (!punch.punch_in_time) return false;
        const punchDate = parseISO(punch.punch_in_time);
        return punchDate >= dayStart && punchDate <= dayEnd;
      });
      
      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
      let sessions = 0;
      
      dayPunches.forEach(punch => {
        if (punch.punch_in_time && punch.punch_out_time) {
          const start = parseISO(punch.punch_in_time);
          const end = parseISO(punch.punch_out_time);
          const sessionMinutes = differenceInMinutes(end, start);
          
          totalWorkMinutes += sessionMinutes;
          sessions++;
          
          // Calculate break time
          if (punch.break_start_time && punch.break_end_time) {
            const breakStart = parseISO(punch.break_start_time);
            const breakEnd = parseISO(punch.break_end_time);
            const breakMinutes = differenceInMinutes(breakEnd, breakStart);
            totalBreakMinutes += breakMinutes;
            totalWorkMinutes -= breakMinutes; // Subtract break from work time
          }
        }
      });
      
      return {
        date: format(day, 'MMM d'),
        fullDate: day,
        workHours: Number((totalWorkMinutes / 60).toFixed(2)),
        breakHours: Number((totalBreakMinutes / 60).toFixed(2)),
        sessions,
        totalHours: Number(((totalWorkMinutes + totalBreakMinutes) / 60).toFixed(2))
      };
    });
  }

  // Process weekly data
  function processWeeklyData(punches, start, end) {
    const weeks = [];
    let currentWeekStart = startOfWeek(start);
    
    while (currentWeekStart <= end) {
      const weekEnd = endOfWeek(currentWeekStart);
      
      const weekPunches = punches.filter(punch => {
        if (!punch.punch_in_time) return false;
        const punchDate = parseISO(punch.punch_in_time);
        return punchDate >= currentWeekStart && punchDate <= weekEnd;
      });
      
      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
      let sessions = 0;
      
      weekPunches.forEach(punch => {
        if (punch.punch_in_time && punch.punch_out_time) {
          const start = parseISO(punch.punch_in_time);
          const end = parseISO(punch.punch_out_time);
          const sessionMinutes = differenceInMinutes(end, start);
          
          totalWorkMinutes += sessionMinutes;
          sessions++;
          
          if (punch.break_start_time && punch.break_end_time) {
            const breakStart = parseISO(punch.break_start_time);
            const breakEnd = parseISO(punch.break_end_time);
            const breakMinutes = differenceInMinutes(breakEnd, breakStart);
            totalBreakMinutes += breakMinutes;
            totalWorkMinutes -= breakMinutes;
          }
        }
      });
      
      weeks.push({
        week: format(currentWeekStart, 'MMM d'),
        workHours: Number((totalWorkMinutes / 60).toFixed(2)),
        breakHours: Number((totalBreakMinutes / 60).toFixed(2)),
        sessions,
        totalHours: Number(((totalWorkMinutes + totalBreakMinutes) / 60).toFixed(2))
      });
      
      currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    return weeks;
  }

  // Process hourly distribution data
  function processHourlyData(punches) {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      punchIns: 0,
      punchOuts: 0,
      breaks: 0
    }));
    
    punches.forEach(punch => {
      if (punch.punch_in_time) {
        const hour = parseISO(punch.punch_in_time).getHours();
        hourlyData[hour].punchIns++;
      }
      
      if (punch.punch_out_time) {
        const hour = parseISO(punch.punch_out_time).getHours();
        hourlyData[hour].punchOuts++;
      }
      
      if (punch.break_start_time) {
        const hour = parseISO(punch.break_start_time).getHours();
        hourlyData[hour].breaks++;
      }
    });
    
    return hourlyData;
  }

  // Process breakdown data for pie chart
  function processBreakdownData(punches) {
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let totalSessions = 0;
    
    punches.forEach(punch => {
      if (punch.punch_in_time && punch.punch_out_time) {
        const start = parseISO(punch.punch_in_time);
        const end = parseISO(punch.punch_out_time);
        const sessionMinutes = differenceInMinutes(end, start);
        
        totalWorkMinutes += sessionMinutes;
        totalSessions++;
        
        if (punch.break_start_time && punch.break_end_time) {
          const breakStart = parseISO(punch.break_start_time);
          const breakEnd = parseISO(punch.break_end_time);
          const breakMinutes = differenceInMinutes(breakEnd, breakStart);
          totalBreakMinutes += breakMinutes;
          totalWorkMinutes -= breakMinutes;
        }
      }
    });
    
    return [
      {
        name: 'Work Time',
        value: Number((totalWorkMinutes / 60).toFixed(2)),
        color: theme.palette.primary.main
      },
      {
        name: 'Break Time',
        value: Number((totalBreakMinutes / 60).toFixed(2)),
        color: theme.palette.warning.main
      }
    ];
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography 
              key={index} 
              variant="body2" 
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value}{chartType === 'hourly' ? '' : 'h'}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    switch (chartType) {
      case 'daily':
      case 'weekly':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chartType === 'daily' ? 'date' : 'week'}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="workHours" 
                name="Work Hours" 
                fill={theme.palette.primary.main}
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="breakHours" 
                name="Break Hours" 
                fill={theme.palette.warning.main}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'hourly':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="punchIns" 
                name="Punch Ins" 
                stroke={theme.palette.success.main}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="punchOuts" 
                name="Punch Outs" 
                stroke={theme.palette.error.main}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="breaks" 
                name="Breaks" 
                stroke={theme.palette.warning.main}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'breakdown':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => 
                  `${name}: ${value}h (${(percent * 100).toFixed(1)}%)`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}h`, 'Hours']}
              />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Chart Type Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Time Tracking Chart
        </Typography>
        
        {onChartTypeChange && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={chartType}
              label="Chart Type"
              onChange={(e) => onChartTypeChange(e.target.value)}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="hourly">Hourly Distribution</MenuItem>
              <MenuItem value="breakdown">Time Breakdown</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Chart */}
      <Box sx={{ width: '100%', height: 400 }}>
        {processedData.length > 0 ? (
          renderChart()
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              bgcolor: 'grey.50',
              borderRadius: 1
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No data available for the selected period
            </Typography>
          </Box>
        )}
      </Box>

      {/* Chart Summary */}
      {processedData.length > 0 && chartType !== 'breakdown' && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                {processedData.reduce((sum, item) => sum + (item.workHours || 0), 0).toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Work Hours
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {processedData.reduce((sum, item) => sum + (item.breakHours || 0), 0).toFixed(1)}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Break Hours
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {processedData.reduce((sum, item) => sum + (item.sessions || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sessions
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="info.main">
                {processedData.length > 0 ? 
                  (processedData.reduce((sum, item) => sum + (item.workHours || 0), 0) / 
                   processedData.filter(item => item.workHours > 0).length || 1).toFixed(1) : 
                  '0.0'
                }h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Daily Hours
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TimeTrackingChart;