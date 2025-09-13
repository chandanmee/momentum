import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Grid,
  Paper,
  Avatar,
  Skeleton,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  Coffee as CoffeeIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInMinutes, isToday } from 'date-fns';

const TodaysSummary = ({ 
  punches = [], 
  currentPunch = null, 
  totalHours = 0, 
  loading = false 
}) => {
  const theme = useTheme();

  // Calculate summary statistics
  const calculateStats = () => {
    const stats = {
      totalSessions: 0,
      totalBreaks: 0,
      totalBreakTime: 0,
      totalWorkTime: 0,
      averageSessionLength: 0,
      firstPunchIn: null,
      lastPunchOut: null
    };

    if (!punches || punches.length === 0) {
      return stats;
    }

    // Filter today's punches
    const todaysPunches = punches.filter(punch => 
      punch.punch_in_time && isToday(parseISO(punch.punch_in_time))
    );

    stats.totalSessions = todaysPunches.length;

    todaysPunches.forEach(punch => {
      const punchIn = parseISO(punch.punch_in_time);
      const punchOut = punch.punch_out_time ? parseISO(punch.punch_out_time) : new Date();

      // Track first punch in and last punch out
      if (!stats.firstPunchIn || punchIn < stats.firstPunchIn) {
        stats.firstPunchIn = punchIn;
      }
      if (punch.punch_out_time && (!stats.lastPunchOut || punchOut > stats.lastPunchOut)) {
        stats.lastPunchOut = punchOut;
      }

      // Calculate work time for this session
      const sessionMinutes = differenceInMinutes(punchOut, punchIn);
      stats.totalWorkTime += sessionMinutes;

      // Calculate break time if any
      if (punch.break_start_time && punch.break_end_time) {
        const breakStart = parseISO(punch.break_start_time);
        const breakEnd = parseISO(punch.break_end_time);
        const breakMinutes = differenceInMinutes(breakEnd, breakStart);
        stats.totalBreakTime += breakMinutes;
        stats.totalBreaks++;
        
        // Subtract break time from work time
        stats.totalWorkTime -= breakMinutes;
      } else if (punch.break_start_time && !punch.break_end_time) {
        // Currently on break
        const breakStart = parseISO(punch.break_start_time);
        const breakMinutes = differenceInMinutes(new Date(), breakStart);
        stats.totalBreakTime += breakMinutes;
        stats.totalBreaks++;
        
        // Subtract break time from work time
        stats.totalWorkTime -= breakMinutes;
      }
    });

    // Add current session if clocked in
    if (currentPunch && !currentPunch.punch_out_time) {
      const currentStart = parseISO(currentPunch.punch_in_time);
      const currentMinutes = differenceInMinutes(new Date(), currentStart);
      
      if (!todaysPunches.find(p => p.id === currentPunch.id)) {
        stats.totalSessions++;
        stats.totalWorkTime += currentMinutes;
        
        if (!stats.firstPunchIn || currentStart < stats.firstPunchIn) {
          stats.firstPunchIn = currentStart;
        }
      }
      
      // Handle current break
      if (currentPunch.break_start_time && !currentPunch.break_end_time) {
        const breakStart = parseISO(currentPunch.break_start_time);
        const breakMinutes = differenceInMinutes(new Date(), breakStart);
        stats.totalBreakTime += breakMinutes;
        stats.totalWorkTime -= breakMinutes;
      }
    }

    // Calculate average session length
    if (stats.totalSessions > 0) {
      stats.averageSessionLength = stats.totalWorkTime / stats.totalSessions;
    }

    return stats;
  };

  const stats = calculateStats();

  // Format time duration
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get punch type icon and color
  const getPunchTypeConfig = (type) => {
    switch (type) {
      case 'punch_in':
        return { icon: <PunchInIcon />, color: 'success', label: 'Punch In' };
      case 'punch_out':
        return { icon: <PunchOutIcon />, color: 'error', label: 'Punch Out' };
      case 'break_start':
        return { icon: <BreakStartIcon />, color: 'warning', label: 'Break Start' };
      case 'break_end':
        return { icon: <BreakEndIcon />, color: 'info', label: 'Break End' };
      default:
        return { icon: <ScheduleIcon />, color: 'default', label: 'Unknown' };
    }
  };

  // Generate timeline events from punches
  const generateTimeline = () => {
    const events = [];
    
    punches.forEach(punch => {
      if (punch.punch_in_time) {
        events.push({
          time: parseISO(punch.punch_in_time),
          type: 'punch_in',
          notes: punch.notes
        });
      }
      
      if (punch.break_start_time) {
        events.push({
          time: parseISO(punch.break_start_time),
          type: 'break_start'
        });
      }
      
      if (punch.break_end_time) {
        events.push({
          time: parseISO(punch.break_end_time),
          type: 'break_end'
        });
      }
      
      if (punch.punch_out_time) {
        events.push({
          time: parseISO(punch.punch_out_time),
          type: 'punch_out',
          notes: punch.notes
        });
      }
    });
    
    // Add current punch events if any
    if (currentPunch) {
      if (currentPunch.punch_in_time && !events.find(e => 
        e.type === 'punch_in' && 
        e.time.getTime() === parseISO(currentPunch.punch_in_time).getTime()
      )) {
        events.push({
          time: parseISO(currentPunch.punch_in_time),
          type: 'punch_in',
          notes: currentPunch.notes,
          current: true
        });
      }
      
      if (currentPunch.break_start_time && !currentPunch.break_end_time) {
        events.push({
          time: parseISO(currentPunch.break_start_time),
          type: 'break_start',
          current: true
        });
      }
    }
    
    return events.sort((a, b) => a.time - b.time);
  };

  const timeline = generateTimeline();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Summary
          </Typography>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={6} sm={3} key={item}>
                <Skeleton variant="rectangular" height={80} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={30} />
            <Skeleton variant="text" height={30} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          Today's Summary
        </Typography>

        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText
              }}
            >
              <Typography variant="h4" component="div">
                {totalHours.toFixed(1)}
              </Typography>
              <Typography variant="caption">
                Total Hours
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: theme.palette.success.light,
                color: theme.palette.success.contrastText
              }}
            >
              <Typography variant="h4" component="div">
                {stats.totalSessions}
              </Typography>
              <Typography variant="caption">
                Sessions
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: theme.palette.warning.light,
                color: theme.palette.warning.contrastText
              }}
            >
              <Typography variant="h4" component="div">
                {stats.totalBreaks}
              </Typography>
              <Typography variant="caption">
                Breaks
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: theme.palette.info.light,
                color: theme.palette.info.contrastText
              }}
            >
              <Typography variant="h4" component="div">
                {formatDuration(stats.totalBreakTime)}
              </Typography>
              <Typography variant="caption">
                Break Time
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Timeline */}
        {timeline.length > 0 ? (
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimeIcon />
              Today's Timeline
            </Typography>
            
            <List dense>
              {timeline.map((event, index) => {
                const config = getPunchTypeConfig(event.type);
                return (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        bgcolor: event.current ? theme.palette.action.selected : 'transparent',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <ListItemIcon>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: `${config.color}.main`,
                            '& .MuiSvgIcon-root': { fontSize: '1rem' }
                          }}
                        >
                          {config.icon}
                        </Avatar>
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" component="span">
                              {config.label}
                            </Typography>
                            {event.current && (
                              <Chip 
                                label="Current" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {format(event.time, 'h:mm a')}
                            </Typography>
                            {event.notes && (
                              <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                                {event.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    {index < timeline.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <WorkIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No punches recorded today
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start your work day by punching in
            </Typography>
          </Box>
        )}

        {/* Additional Info */}
        {stats.firstPunchIn && (
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  First Punch In
                </Typography>
                <Typography variant="body1">
                  {format(stats.firstPunchIn, 'h:mm a')}
                </Typography>
              </Grid>
              
              {stats.lastPunchOut && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Last Punch Out
                  </Typography>
                  <Typography variant="body1">
                    {format(stats.lastPunchOut, 'h:mm a')}
                  </Typography>
                </Grid>
              )}
            </Grid>
            
            {stats.averageSessionLength > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Average Session Length
                </Typography>
                <Typography variant="body1">
                  {formatDuration(stats.averageSessionLength)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysSummary;