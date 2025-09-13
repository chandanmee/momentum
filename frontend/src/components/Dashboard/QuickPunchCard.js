import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInSeconds } from 'date-fns';

// Redux actions
import { punchIn, punchOut, getPunchStatus } from '../../store/slices/punchSlice';
import { showNotification } from '../../store/slices/uiSlice';

const QuickPunchCard = ({ onPunchComplete }) => {
  const dispatch = useDispatch();
  
  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    currentPunch, 
    isLoading 
  } = useSelector((state) => state.punch);
  const { 
    currentLocation, 
    isLocationEnabled 
  } = useSelector((state) => state.geolocation);

  // Local state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update current time and session duration every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate session duration if clocked in
      if (currentPunch && !currentPunch.punch_out_time) {
        const startTime = parseISO(currentPunch.punch_in_time);
        const totalSeconds = differenceInSeconds(now, startTime);
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        setSessionDuration({ hours, minutes, seconds });
      } else {
        setSessionDuration(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPunch]);

  // Determine current status and available actions
  const getCurrentStatus = () => {
    if (!currentPunch || currentPunch.punch_out_time) {
      return {
        status: 'clocked_out',
        label: 'Clocked Out',
        color: 'default',
        icon: <PunchOutIcon />,
        actions: [{
          id: 'punch_in',
          label: 'Punch In',
          icon: <PunchInIcon />,
          color: 'success',
          variant: 'contained'
        }]
      };
    }

    if (currentPunch.break_start_time && !currentPunch.break_end_time) {
      return {
        status: 'on_break',
        label: 'On Break',
        color: 'warning',
        icon: <BreakStartIcon />,
        actions: [
          {
            id: 'break_end',
            label: 'End Break',
            icon: <BreakEndIcon />,
            color: 'info',
            variant: 'contained'
          },
          {
            id: 'punch_out',
            label: 'Punch Out',
            icon: <PunchOutIcon />,
            color: 'error',
            variant: 'outlined'
          }
        ]
      };
    }

    return {
      status: 'clocked_in',
      label: 'Clocked In',
      color: 'success',
      icon: <PunchInIcon />,
      actions: [
        {
          id: 'break_start',
          label: 'Start Break',
          icon: <BreakStartIcon />,
          color: 'warning',
          variant: 'outlined'
        },
        {
          id: 'punch_out',
          label: 'Punch Out',
          icon: <PunchOutIcon />,
          color: 'error',
          variant: 'contained'
        }
      ]
    };
  };

  const currentStatus = getCurrentStatus();

  // Handle punch action
  const handlePunchAction = async (actionId) => {
    setIsProcessing(true);
    
    try {
      // Prepare punch data
      const punchData = {
        type: actionId,
        timestamp: new Date().toISOString(),
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy
        } : null,
        user_id: user.id
      };

      // Dispatch punch action
      let punchAction;
      switch (actionId) {
        case 'punch_in':
        case 'break_end':
          punchAction = punchIn;
          break;
        case 'punch_out':
        case 'break_start':
          punchAction = punchOut;
          break;
        default:
          punchAction = punchIn;
      }
      const result = await dispatch(punchAction(punchData)).unwrap();

      // Show success notification
      const actionLabels = {
        punch_in: 'Punched In',
        punch_out: 'Punched Out',
        break_start: 'Break Started',
        break_end: 'Break Ended'
      };

      dispatch(showNotification({
        type: 'success',
        title: actionLabels[actionId],
        message: `Successfully ${actionLabels[actionId].toLowerCase()} at ${format(new Date(), 'h:mm a')}`
      }));

      // Call completion callback
      if (onPunchComplete) {
        onPunchComplete(result);
      }
    } catch (error) {
      console.error('Punch error:', error);
      
      dispatch(showNotification({
        type: 'error',
        title: 'Punch Failed',
        message: error.message || 'Failed to record punch. Please try again.'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await dispatch(getPunchStatus()).unwrap();
    } catch (error) {
      console.error('Failed to refresh punch data:', error);
    }
  };

  // Format session duration
  const formatDuration = (duration) => {
    if (!duration) return '0h 0m';
    
    const { hours, minutes, seconds } = duration;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="div">
            Quick Punch
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Current Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar 
            sx={{ 
              bgcolor: `${currentStatus.color}.main`,
              width: 48,
              height: 48
            }}
          >
            {currentStatus.icon}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {currentStatus.label}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              {format(currentTime, 'h:mm:ss a')}
            </Typography>
          </Box>
        </Box>

        {/* Session Info */}
        {sessionDuration && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Session Duration
              </Typography>
            </Box>
            
            <Typography variant="h5" color="primary.main" gutterBottom>
              {formatDuration(sessionDuration)}
            </Typography>
            
            {currentPunch && (
              <Typography variant="body2" color="text.secondary">
                Started at {format(parseISO(currentPunch.punch_in_time), 'h:mm a')}
              </Typography>
            )}
          </Box>
        )}

        {/* Location Info */}
        {isLocationEnabled && currentLocation && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Current Location
              </Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              {currentLocation.address || 
                `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
              }
            </Typography>
          </Box>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading punch data...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {!isLoading && !currentPunch && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No active punch session found.
          </Alert>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
          {currentStatus.actions.map((action, index) => (
            <Button
              key={action.id}
              variant={action.variant}
              color={action.color}
              size="large"
              fullWidth
              startIcon={isProcessing ? <CircularProgress size={16} /> : action.icon}
              onClick={() => handlePunchAction(action.id)}
              disabled={isProcessing || isLoading}
              sx={{ py: 1.5 }}
            >
              {isProcessing ? 'Processing...' : action.label}
            </Button>
          ))}
          
          {/* View History Button */}
          <Button
            variant="text"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => window.location.href = '/history'}
            sx={{ mt: 1 }}
          >
            View History
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
};

export default QuickPunchCard;