import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Note as NoteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Timer as TimerIcon,
  Coffee as CoffeeIcon,
  Work as WorkIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { 
  format, 
  parseISO, 
  differenceInMinutes,
  differenceInSeconds,
  isValid
} from 'date-fns';

const PunchDetailsDialog = ({ open, onClose, punch }) => {
  const theme = useTheme();

  if (!punch) return null;

  // Calculate durations
  const calculateDurations = () => {
    const durations = {
      totalSession: 0,
      workTime: 0,
      breakTime: 0,
      isActive: false
    };

    if (punch.punch_in_time) {
      const startTime = parseISO(punch.punch_in_time);
      const endTime = punch.punch_out_time ? parseISO(punch.punch_out_time) : new Date();
      
      durations.totalSession = differenceInMinutes(endTime, startTime);
      durations.workTime = durations.totalSession;
      durations.isActive = !punch.punch_out_time;

      // Calculate break time
      if (punch.break_start_time && punch.break_end_time) {
        const breakStart = parseISO(punch.break_start_time);
        const breakEnd = parseISO(punch.break_end_time);
        durations.breakTime = differenceInMinutes(breakEnd, breakStart);
        durations.workTime -= durations.breakTime;
      } else if (punch.break_start_time && !punch.break_end_time) {
        // Currently on break
        const breakStart = parseISO(punch.break_start_time);
        durations.breakTime = differenceInMinutes(new Date(), breakStart);
        durations.workTime -= durations.breakTime;
      }
    }

    return durations;
  };

  const durations = calculateDurations();

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get status configuration
  const getStatusConfig = () => {
    if (punch.break_start_time && !punch.break_end_time) {
      return {
        label: 'On Break',
        color: 'warning',
        icon: <BreakStartIcon />,
        description: 'Currently taking a break'
      };
    }
    
    if (!punch.punch_out_time) {
      return {
        label: 'Active Session',
        color: 'success',
        icon: <PunchInIcon />,
        description: 'Currently clocked in'
      };
    }
    
    return {
      label: 'Completed',
      color: 'default',
      icon: <PunchOutIcon />,
      description: 'Session completed'
    };
  };

  const statusConfig = getStatusConfig();

  // Create timeline events
  const createTimeline = () => {
    const events = [];

    if (punch.punch_in_time) {
      events.push({
        time: parseISO(punch.punch_in_time),
        type: 'punch_in',
        label: 'Punch In',
        icon: <PunchInIcon />,
        color: 'success'
      });
    }

    if (punch.break_start_time) {
      events.push({
        time: parseISO(punch.break_start_time),
        type: 'break_start',
        label: 'Break Start',
        icon: <BreakStartIcon />,
        color: 'warning'
      });
    }

    if (punch.break_end_time) {
      events.push({
        time: parseISO(punch.break_end_time),
        type: 'break_end',
        label: 'Break End',
        icon: <BreakEndIcon />,
        color: 'info'
      });
    }

    if (punch.punch_out_time) {
      events.push({
        time: parseISO(punch.punch_out_time),
        type: 'punch_out',
        label: 'Punch Out',
        icon: <PunchOutIcon />,
        color: 'error'
      });
    }

    return events.sort((a, b) => a.time - b.time);
  };

  const timeline = createTimeline();

  // Format location
  const formatLocation = (location) => {
    if (!location) return 'Not available';
    
    const { latitude, longitude, accuracy } = location;
    return {
      coordinates: `${latitude?.toFixed(6)}, ${longitude?.toFixed(6)}`,
      accuracy: accuracy ? `±${accuracy.toFixed(1)}m` : 'Unknown'
    };
  };

  const locationInfo = formatLocation(punch.location);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: `${statusConfig.color}.main`,
                width: 40,
                height: 40
              }}
            >
              {statusConfig.icon}
            </Avatar>
            <Box>
              <Typography variant="h6">
                Punch Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {punch.punch_in_time ? 
                  format(parseISO(punch.punch_in_time), 'EEEE, MMMM d, yyyy') : 
                  'Invalid Date'
                }
              </Typography>
            </Box>
          </Box>
          
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Status and Summary */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Chip
                  icon={statusConfig.icon}
                  label={statusConfig.label}
                  color={statusConfig.color}
                  size="large"
                />
                
                {durations.isActive && (
                  <Chip
                    label="Live Session"
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {statusConfig.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="primary.main">
                      {formatDuration(durations.totalSession)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Session
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main">
                      {formatDuration(durations.workTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Work Time
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="warning.main">
                      {formatDuration(durations.breakTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Break Time
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="info.main">
                      {durations.workTime > 0 ? 
                        `${((durations.workTime / durations.totalSession) * 100).toFixed(1)}%` : 
                        '0%'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Productivity
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon />
              Timeline
            </Typography>
            
            <List>
              {timeline.map((event, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: `${event.color}.main`,
                        '& .MuiSvgIcon-root': { fontSize: '1rem' }
                      }}
                    >
                      {event.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={event.label}
                    secondary={format(event.time, 'h:mm:ss a')}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              Details
            </Typography>
            
            <List>
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon>
                  <CalendarIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Date"
                  secondary={punch.punch_in_time ? 
                    format(parseISO(punch.punch_in_time), 'EEEE, MMMM d, yyyy') : 
                    'N/A'
                  }
                />
              </ListItem>
              
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon>
                  <TimeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Duration"
                  secondary={formatDuration(durations.totalSession)}
                />
              </ListItem>
              
              <ListItem sx={{ pl: 0 }}>
                <ListItemIcon>
                  <WorkIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Work Time"
                  secondary={formatDuration(durations.workTime)}
                />
              </ListItem>
              
              {durations.breakTime > 0 && (
                <ListItem sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <CoffeeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Break Time"
                    secondary={formatDuration(durations.breakTime)}
                  />
                </ListItem>
              )}
            </List>
          </Grid>

          {/* Location Information */}
          {punch.location && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon />
                Location Information
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Coordinates
                    </Typography>
                    <Typography variant="body1">
                      {locationInfo.coordinates}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                    <Typography variant="body1">
                      {locationInfo.accuracy}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MapIcon />}
                    onClick={() => {
                      const { latitude, longitude } = punch.location;
                      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    View on Map
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Notes */}
          {punch.notes && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NoteIcon />
                Notes
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {punch.notes}
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* Metadata */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              <strong>Record ID:</strong> {punch.id}
            </Typography>
            
            {punch.created_at && (
              <Typography variant="body2" color="text.secondary">
                <strong>Created:</strong> {format(parseISO(punch.created_at), 'MMM d, yyyy h:mm a')}
              </Typography>
            )}
            
            {punch.updated_at && punch.updated_at !== punch.created_at && (
              <Typography variant="body2" color="text.secondary">
                <strong>Last Modified:</strong> {format(parseISO(punch.updated_at), 'MMM d, yyyy h:mm a')}
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PunchDetailsDialog;