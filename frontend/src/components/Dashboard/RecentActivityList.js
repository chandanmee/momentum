import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  Skeleton,
  Divider
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

const RecentActivityList = ({ activities = [], loading = false, maxItems = 10 }) => {
  // Get icon and color for punch type
  const getPunchTypeInfo = (type) => {
    switch (type) {
      case 'punch_in':
        return {
          icon: <PunchInIcon />,
          color: 'success',
          label: 'Punched In',
          bgColor: 'success.light'
        };
      case 'punch_out':
        return {
          icon: <PunchOutIcon />,
          color: 'error',
          label: 'Punched Out',
          bgColor: 'error.light'
        };
      case 'break_start':
        return {
          icon: <BreakStartIcon />,
          color: 'warning',
          label: 'Break Started',
          bgColor: 'warning.light'
        };
      case 'break_end':
        return {
          icon: <BreakEndIcon />,
          color: 'info',
          label: 'Break Ended',
          bgColor: 'info.light'
        };
      default:
        return {
          icon: <ScheduleIcon />,
          color: 'default',
          label: 'Unknown',
          bgColor: 'grey.300'
        };
    }
  };

  // Format activity timestamp
  const formatActivityTime = (timestamp) => {
    try {
      const date = parseISO(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return {
          time: format(date, 'h:mm a'),
          relative: formatDistanceToNow(date, { addSuffix: true })
        };
      } else {
        return {
          time: format(date, 'MMM d, h:mm a'),
          relative: formatDistanceToNow(date, { addSuffix: true })
        };
      }
    } catch (error) {
      return {
        time: 'Invalid time',
        relative: 'Unknown'
      };
    }
  };

  // Calculate session duration for punch pairs
  const calculateDuration = (punchIn, punchOut) => {
    if (!punchIn || !punchOut) return null;
    
    try {
      const start = parseISO(punchIn);
      const end = parseISO(punchOut);
      const diffInMinutes = (end - start) / (1000 * 60);
      
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = Math.floor(diffInMinutes % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return null;
    }
  };

  // Process activities to group punch pairs and add metadata
  const processActivities = (rawActivities) => {
    const processed = [];
    
    rawActivities.slice(0, maxItems).forEach((activity) => {
      const timeInfo = formatActivityTime(activity.punch_in_time || activity.created_at);
      const typeInfo = getPunchTypeInfo(activity.type || 'punch_in');
      
      // Base activity info
      const processedActivity = {
        id: activity.id,
        type: activity.type || 'punch_in',
        timestamp: activity.punch_in_time || activity.created_at,
        timeInfo,
        typeInfo,
        location: activity.location,
        notes: activity.notes
      };
      
      // Add duration for completed sessions
      if (activity.punch_out_time) {
        processedActivity.duration = calculateDuration(
          activity.punch_in_time, 
          activity.punch_out_time
        );
        processedActivity.endTime = formatActivityTime(activity.punch_out_time);
      }
      
      // Add break duration if applicable
      if (activity.break_start_time && activity.break_end_time) {
        processedActivity.breakDuration = calculateDuration(
          activity.break_start_time,
          activity.break_end_time
        );
      }
      
      processed.push(processedActivity);
    });
    
    return processed;
  };

  const processedActivities = processActivities(activities);

  // Render loading skeleton
  const renderSkeleton = () => (
    <List>
      {[...Array(5)].map((_, index) => (
        <ListItem key={index}>
          <ListItemIcon>
            <Skeleton variant="circular" width={40} height={40} />
          </ListItemIcon>
          <ListItemText
            primary={<Skeleton variant="text" width="60%" />}
            secondary={<Skeleton variant="text" width="40%" />}
          />
        </ListItem>
      ))}
    </List>
  );

  // Render empty state
  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        textAlign: 'center'
      }}
    >
      <ScheduleIcon 
        sx={{ 
          fontSize: 48, 
          color: 'text.secondary', 
          mb: 2 
        }} 
      />
      <Typography variant="body1" color="text.secondary" gutterBottom>
        No recent activity
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Your punch history will appear here
      </Typography>
    </Box>
  );

  // Render activity item
  const renderActivityItem = (activity, index) => {
    const { typeInfo, timeInfo, duration, location, notes, breakDuration } = activity;
    
    return (
      <React.Fragment key={activity.id}>
        <ListItem
          sx={{
            py: 2,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ListItemIcon>
            <Avatar
              sx={{
                bgcolor: typeInfo.bgColor,
                color: `${typeInfo.color}.main`,
                width: 40,
                height: 40
              }}
            >
              {typeInfo.icon}
            </Avatar>
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2">
                  {typeInfo.label}
                </Typography>
                {duration && (
                  <Chip
                    label={duration}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {timeInfo.time} • {timeInfo.relative}
                </Typography>
                
                {breakDuration && (
                  <Typography variant="caption" color="text.secondary">
                    Break: {breakDuration}
                  </Typography>
                )}
                
                {location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {location.address || `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`}
                    </Typography>
                  </Box>
                )}
                
                {notes && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Note: {notes}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
        
        {index < processedActivities.length - 1 && (
          <Divider variant="inset" component="li" />
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  if (processedActivities.length === 0) {
    return renderEmptyState();
  }

  return (
    <List sx={{ py: 0 }}>
      {processedActivities.map((activity, index) => 
        renderActivityItem(activity, index)
      )}
    </List>
  );
};

export default RecentActivityList;