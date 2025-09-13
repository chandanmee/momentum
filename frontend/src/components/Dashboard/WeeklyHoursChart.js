import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  Skeleton,
  Paper
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, startOfWeek, addDays } from 'date-fns';

const WeeklyHoursChart = ({ data, loading = false, height = 300 }) => {
  const theme = useTheme();

  // Generate default week data if no data provided
  const generateDefaultWeekData = () => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday
    const weekData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      weekData.push({
        day: format(date, 'EEE'),
        fullDay: format(date, 'EEEE'),
        date: format(date, 'yyyy-MM-dd'),
        hours: 0,
        target: 8, // Default 8-hour target
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      });
    }
    
    return weekData;
  };

  // Process and format data
  const chartData = data || generateDefaultWeekData();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper
          sx={{
            p: 2,
            border: 1,
            borderColor: 'divider',
            boxShadow: 3
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {data.fullDay}
          </Typography>
          <Typography variant="body2" color="primary.main">
            Hours Worked: {data.hours}h
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Target: {data.target}h
          </Typography>
          {data.hours > 0 && (
            <Typography 
              variant="body2" 
              color={data.hours >= data.target ? 'success.main' : 'warning.main'}
            >
              {data.hours >= data.target ? 
                `+${(data.hours - data.target).toFixed(1)}h over target` :
                `${(data.target - data.hours).toFixed(1)}h under target`
              }
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  // Get bar color based on performance
  const getBarColor = (hours, target, isToday) => {
    if (isToday) {
      return theme.palette.primary.main;
    }
    
    if (hours === 0) {
      return theme.palette.grey[300];
    }
    
    if (hours >= target) {
      return theme.palette.success.main;
    }
    
    if (hours >= target * 0.75) {
      return theme.palette.warning.main;
    }
    
    return theme.palette.error.main;
  };

  // Calculate weekly summary
  const weeklyStats = {
    totalHours: chartData.reduce((sum, day) => sum + day.hours, 0),
    targetHours: chartData.reduce((sum, day) => sum + day.target, 0),
    daysWorked: chartData.filter(day => day.hours > 0).length,
    averageHours: chartData.reduce((sum, day) => sum + day.hours, 0) / chartData.length
  };

  if (loading) {
    return (
      <Box sx={{ height }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Weekly Summary */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Hours
            </Typography>
            <Typography variant="h6" color="primary.main">
              {weeklyStats.totalHours.toFixed(1)}h
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Target Hours
            </Typography>
            <Typography variant="h6">
              {weeklyStats.targetHours}h
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Days Worked
            </Typography>
            <Typography variant="h6">
              {weeklyStats.daysWorked}/7
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Daily Average
            </Typography>
            <Typography variant="h6">
              {weeklyStats.averageHours.toFixed(1)}h
            </Typography>
          </Box>
        </Box>
        
        {/* Progress indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Weekly Progress:
          </Typography>
          <Typography 
            variant="body2" 
            color={weeklyStats.totalHours >= weeklyStats.targetHours ? 'success.main' : 'warning.main'}
            sx={{ fontWeight: 'bold' }}
          >
            {((weeklyStats.totalHours / weeklyStats.targetHours) * 100).toFixed(0)}%
          </Typography>
        </Box>
      </Box>

      {/* Chart */}
      <Box sx={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            barCategoryGap="20%"
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme.palette.divider}
            />
            <XAxis 
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: theme.palette.text.secondary,
                fontSize: 12
              }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: theme.palette.text.secondary,
                fontSize: 12
              }}
              label={{ 
                value: 'Hours', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: theme.palette.text.secondary }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Target line bars (background) */}
            <Bar 
              dataKey="target" 
              fill={theme.palette.grey[200]}
              radius={[4, 4, 0, 0]}
            />
            
            {/* Actual hours bars */}
            <Bar 
              dataKey="hours" 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.hours, entry.target, entry.isToday)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.success.main,
              borderRadius: 1
            }} 
          />
          <Typography variant="caption">Target Met</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.warning.main,
              borderRadius: 1
            }} 
          />
          <Typography variant="caption">Partial</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.primary.main,
              borderRadius: 1
            }} 
          />
          <Typography variant="caption">Today</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              bgcolor: theme.palette.grey[300],
              borderRadius: 1
            }} 
          />
          <Typography variant="caption">No Hours</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default WeeklyHoursChart;