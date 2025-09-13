import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInSeconds } from 'date-fns';

const PunchClock = ({ 
  currentPunch, 
  currentTime, 
  sessionDuration,
  status = 'clocked_out',
  loading = false 
}) => {
  const theme = useTheme();
  const [animatedTime, setAnimatedTime] = useState(currentTime);

  // Animate time updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedTime(currentTime);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentTime]);

  // Get status configuration
  const getStatusConfig = () => {
    switch (status) {
      case 'clocked_in':
        return {
          label: 'Clocked In',
          color: 'success',
          icon: <PunchInIcon />,
          description: 'Currently working',
          bgColor: theme.palette.success.light,
          textColor: theme.palette.success.contrastText
        };
      case 'on_break':
        return {
          label: 'On Break',
          color: 'warning',
          icon: <BreakStartIcon />,
          description: 'Taking a break',
          bgColor: theme.palette.warning.light,
          textColor: theme.palette.warning.contrastText
        };
      case 'clocked_out':
      default:
        return {
          label: 'Clocked Out',
          color: 'default',
          icon: <PunchOutIcon />,
          description: 'Not currently working',
          bgColor: theme.palette.grey[100],
          textColor: theme.palette.text.primary
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Format session duration for display
  const formatSessionDuration = () => {
    if (!sessionDuration) return null;
    
    const { hours, minutes, seconds } = sessionDuration;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress for work day (assuming 8 hour work day)
  const calculateProgress = () => {
    if (!sessionDuration) return 0;
    
    const totalSeconds = sessionDuration.hours * 3600 + sessionDuration.minutes * 60 + sessionDuration.seconds;
    const workDaySeconds = 8 * 3600; // 8 hours
    
    return Math.min((totalSeconds / workDaySeconds) * 100, 100);
  };

  // Get punch in time
  const getPunchInTime = () => {
    if (!currentPunch || !currentPunch.punch_in_time) return null;
    return format(parseISO(currentPunch.punch_in_time), 'h:mm a');
  };

  // Get break duration if on break
  const getBreakDuration = () => {
    if (!currentPunch || !currentPunch.break_start_time || currentPunch.break_end_time) {
      return null;
    }
    
    const breakStart = parseISO(currentPunch.break_start_time);
    const now = new Date();
    const breakSeconds = differenceInSeconds(now, breakStart);
    
    const minutes = Math.floor(breakSeconds / 60);
    const seconds = breakSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = calculateProgress();
  const formattedDuration = formatSessionDuration();
  const punchInTime = getPunchInTime();
  const breakDuration = getBreakDuration();

  return (
    <Card 
      elevation={3}
      sx={{
        background: `linear-gradient(135deg, ${statusConfig.bgColor} 0%, ${theme.palette.background.paper} 100%)`,
        border: `2px solid ${theme.palette[statusConfig.color]?.main || theme.palette.grey[300]}`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[6]
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        {loading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              borderRadius: '4px 4px 0 0'
            }} 
          />
        )}

        {/* Status Avatar */}
        <Avatar 
          sx={{ 
            width: 100,
            height: 100,
            bgcolor: `${statusConfig.color}.main`,
            mx: 'auto',
            mb: 3,
            fontSize: '2.5rem',
            boxShadow: theme.shadows[4],
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        >
          {statusConfig.icon}
        </Avatar>

        {/* Current Time */}
        <Typography 
          variant="h2" 
          component="div"
          sx={{ 
            fontWeight: 300,
            mb: 1,
            fontFamily: 'monospace',
            color: theme.palette.primary.main,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {format(animatedTime, 'h:mm:ss')}
        </Typography>
        
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {format(animatedTime, 'a • EEEE, MMMM d')}
        </Typography>

        {/* Status Chip */}
        <Chip
          label={statusConfig.label}
          color={statusConfig.color}
          size="large"
          icon={statusConfig.icon}
          sx={{ 
            mb: 3,
            fontSize: '1rem',
            py: 2,
            px: 1,
            '& .MuiChip-icon': {
              fontSize: '1.2rem'
            }
          }}
        />

        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {statusConfig.description}
        </Typography>

        {/* Session Information */}
        {formattedDuration && (
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h3" 
              component="div"
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                fontFamily: 'monospace',
                color: theme.palette.success.main
              }}
            >
              {formattedDuration}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Session Duration
            </Typography>
            
            {punchInTime && (
              <Typography variant="body2" color="text.secondary">
                Started at {punchInTime}
              </Typography>
            )}
            
            {/* Progress Bar */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress}
                sx={{ 
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.grey[200],
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: theme.palette.success.main
                  }
                }}
              />
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              {progress.toFixed(1)}% of standard work day
            </Typography>
          </Box>
        )}

        {/* Break Information */}
        {breakDuration && (
          <Box sx={{ mt: 2 }}>
            <Typography 
              variant="h5" 
              component="div"
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                fontFamily: 'monospace',
                color: theme.palette.warning.main
              }}
            >
              {breakDuration}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Break Duration
            </Typography>
          </Box>
        )}

        {/* Additional Info */}
        {!currentPunch && (
          <Box sx={{ mt: 3 }}>
            <ScheduleIcon 
              sx={{ 
                fontSize: 48,
                color: theme.palette.grey[400],
                mb: 1
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              Ready to start your work day
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PunchClock;