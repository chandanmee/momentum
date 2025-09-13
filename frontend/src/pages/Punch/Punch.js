import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInSeconds, startOfDay, endOfDay } from 'date-fns';

// Redux actions
import { punchIn, punchOut, getPunchStatus, getPunchHistory } from '../../store/slices/punchSlice';
import { showNotification } from '../../store/slices/uiSlice';

// Services
import { GeolocationService } from '../../services/geolocationService';
import { NotificationService } from '../../services/notificationService';

// Components
import TodaysSummary from '../../components/Punch/TodaysSummary';
import LocationStatus from '../../components/Punch/LocationStatus';
import MapboxMap from '../../components/UI/MapboxMap';

const Punch = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    currentPunch, 
    todaysPunches,
    isLoading 
  } = useSelector((state) => state.punch);
  const { 
    currentLocation, 
    isLocationEnabled,
    locationError 
  } = useSelector((state) => state.geolocation);
  const { isOnline } = useSelector((state) => state.ui);

  // Local state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [punchNotes, setPunchNotes] = useState('');
  const [requireLocation, setRequireLocation] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoCapture, setPhotoCapture] = useState(null);

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

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(getPunchStatus()),
          dispatch(getPunchHistory({ 
            startDate: startOfDay(new Date()).toISOString(),
            endDate: endOfDay(new Date()).toISOString()
          }))
        ]);
      } catch (error) {
        console.error('Failed to fetch punch data:', error);
      }
    };

    fetchData();
  }, [dispatch]);

  // Determine current status and available actions
  const getCurrentStatus = () => {
    if (!currentPunch || currentPunch.punch_out_time) {
      return {
        status: 'clocked_out',
        label: 'Clocked Out',
        color: 'default',
        icon: <PunchOutIcon />,
        description: 'Ready to start your work day',
        actions: [{
          id: 'punch_in',
          label: 'Punch In',
          icon: <PunchInIcon />,
          color: 'success',
          description: 'Start your work day'
        }]
      };
    }

    if (currentPunch.break_start_time && !currentPunch.break_end_time) {
      return {
        status: 'on_break',
        label: 'On Break',
        color: 'warning',
        icon: <BreakStartIcon />,
        description: 'Currently taking a break',
        actions: [
          {
            id: 'break_end',
            label: 'End Break',
            icon: <BreakEndIcon />,
            color: 'info',
            description: 'Return from your break'
          },
          {
            id: 'punch_out',
            label: 'Punch Out',
            icon: <PunchOutIcon />,
            color: 'error',
            description: 'End your work day'
          }
        ]
      };
    }

    return {
      status: 'clocked_in',
      label: 'Clocked In',
      color: 'success',
      icon: <PunchInIcon />,
      description: 'Currently working',
      actions: [
        {
          id: 'break_start',
          label: 'Start Break',
          icon: <BreakStartIcon />,
          color: 'warning',
          description: 'Take a break'
        },
        {
          id: 'punch_out',
          label: 'Punch Out',
          icon: <PunchOutIcon />,
          color: 'error',
          description: 'End your work day'
        }
      ]
    };
  };

  const currentStatus = getCurrentStatus();

  // Handle punch action click
  const handleActionClick = (action) => {
    setSelectedAction(action);
    setPunchNotes('');
    setPhotoCapture(null);
    setConfirmDialogOpen(true);
  };

  // Handle punch confirmation
  const handleConfirmPunch = async () => {
    if (!selectedAction) return;

    setIsProcessing(true);
    
    try {
      // Get current location if required and enabled
      let location = null;
      if (requireLocation && isLocationEnabled) {
        try {
          location = await GeolocationService.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        } catch (error) {
          console.warn('Failed to get location:', error);
          throw new Error('Location is required but could not be obtained');
        }
      }

      // Prepare punch data
      const punchData = {
        type: selectedAction.id,
        timestamp: new Date().toISOString(),
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        } : null,
        notes: punchNotes.trim() || null,
        photo: photoCapture || null,
        user_id: user.id
      };

      // Dispatch punch action based on type
      let punchAction;
      switch (selectedAction.id) {
        case 'punch_in':
        case 'break_end':
          punchAction = punchIn(punchData);
          break;
        case 'punch_out':
        case 'break_start':
          punchAction = punchOut(punchData);
          break;
        default:
          throw new Error(`Unknown punch action: ${selectedAction.id}`);
      }
      
      await dispatch(punchAction).unwrap();

      // Show success notification
      dispatch(showNotification({
        type: 'success',
        title: 'Punch Recorded',
        message: `Successfully ${selectedAction.label.toLowerCase()} at ${format(new Date(), 'h:mm a')}`
      }));

      // Show system notification if supported
      if (NotificationService.isSupported()) {
        NotificationService.showPunchNotification(
          selectedAction.label,
          `${selectedAction.label} recorded at ${format(new Date(), 'h:mm a')}`,
          selectedAction.id
        );
      }

      // Refresh today's punches
      dispatch(getPunchHistory({ 
        startDate: startOfDay(new Date()).toISOString(),
        endDate: endOfDay(new Date()).toISOString()
      }));

      setConfirmDialogOpen(false);
      setSelectedAction(null);
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

  // Handle dialog close
  const handleDialogClose = () => {
    if (!isProcessing) {
      setConfirmDialogOpen(false);
      setSelectedAction(null);
      setPunchNotes('');
      setPhotoCapture(null);
    }
  };

  // Format session duration
  const formatDuration = (duration) => {
    if (!duration) return '0h 0m 0s';
    
    const { hours, minutes, seconds } = duration;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Calculate today's total hours
  const calculateTodaysHours = () => {
    if (!todaysPunches || todaysPunches.length === 0) return 0;
    
    let totalMinutes = 0;
    
    todaysPunches.forEach(punch => {
      if (punch.punch_in_time && punch.punch_out_time) {
        const start = parseISO(punch.punch_in_time);
        const end = parseISO(punch.punch_out_time);
        totalMinutes += differenceInSeconds(end, start) / 60;
        
        // Subtract break time if any
        if (punch.break_start_time && punch.break_end_time) {
          const breakStart = parseISO(punch.break_start_time);
          const breakEnd = parseISO(punch.break_end_time);
          totalMinutes -= differenceInSeconds(breakEnd, breakStart) / 60;
        }
      }
    });
    
    // Add current session if clocked in
    if (currentPunch && !currentPunch.punch_out_time) {
      const start = parseISO(currentPunch.punch_in_time);
      const now = new Date();
      totalMinutes += differenceInSeconds(now, start) / 60;
      
      // Subtract current break time if on break
      if (currentPunch.break_start_time && !currentPunch.break_end_time) {
        const breakStart = parseISO(currentPunch.break_start_time);
        totalMinutes -= differenceInSeconds(now, breakStart) / 60;
      }
    }
    
    return totalMinutes / 60; // Convert to hours
  };

  const todaysHours = calculateTodaysHours();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Punch Clock
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm:ss a')}
        </Typography>
      </Box>

      {/* Offline Alert */}
      {!isOnline && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You are currently offline. Punches will be synced when connection is restored.
        </Alert>
      )}

      {/* Location Error Alert */}
      {locationError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Location Error: {locationError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Punch Clock */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              {/* Current Status */}
              <Box sx={{ mb: 4 }}>
                <Avatar 
                  sx={{ 
                    width: 80,
                    height: 80,
                    bgcolor: `${currentStatus.color}.main`,
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  {currentStatus.icon}
                </Avatar>
                
                <Typography variant="h4" gutterBottom>
                  {currentStatus.label}
                </Typography>
                
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {currentStatus.description}
                </Typography>
                
                {sessionDuration && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h2" color="primary.main" gutterBottom>
                      {formatDuration(sessionDuration)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Session Duration
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, justifyContent: 'center' }}>
                {currentStatus.actions.map((action) => (
                  <Button
                    key={action.id}
                    variant="contained"
                    color={action.color}
                    size="large"
                    startIcon={action.icon}
                    onClick={() => handleActionClick(action)}
                    disabled={isLoading}
                    sx={{ 
                      py: 2, 
                      px: 4,
                      minWidth: isMobile ? '100%' : 200,
                      fontSize: '1.1rem'
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <TodaysSummary 
            punches={todaysPunches}
            currentPunch={currentPunch}
            totalHours={todaysHours}
            loading={isLoading}
          />
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          {/* User Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar 
                  src={user?.avatar} 
                  alt={user?.name}
                  sx={{ width: 48, height: 48 }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {user?.name}
                  </Typography>
                  <Chip 
                    label={user?.role || 'Employee'} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Today's Hours" 
                    secondary={`${todaysHours.toFixed(2)}h`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TimeIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Current Time" 
                    secondary={format(currentTime, 'h:mm:ss a')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Location Map */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Location Status
              </Typography>
              
              <LocationStatus 
                currentLocation={currentLocation}
                isLocationEnabled={isLocationEnabled}
                locationError={locationError}
              />
              
              <Box sx={{ mt: 2 }}>
                <MapboxMap
                  height="250px"
                  showGeofences={true}
                  showUserLocation={true}
                  interactive={true}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Punches Today" 
                    secondary={todaysPunches?.length || 0}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Status" 
                    secondary={isOnline ? 'Online' : 'Offline'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm {selectedAction?.label}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              {selectedAction?.description}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Time: {format(currentTime, 'EEEE, MMMM d, yyyy h:mm:ss a')}
            </Typography>
            
            {isLocationEnabled && currentLocation && (
              <Typography variant="body2" color="text.secondary">
                Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Typography>
            )}
          </Box>
          
          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            value={punchNotes}
            onChange={(e) => setPunchNotes(e.target.value)}
            placeholder="Add any notes about this punch..."
            sx={{ mb: 2 }}
          />
          
          {/* Options */}
          <FormControlLabel
            control={
              <Switch
                checked={requireLocation}
                onChange={(e) => setRequireLocation(e.target.checked)}
                disabled={!isLocationEnabled}
              />
            }
            label="Require location verification"
          />
          
          {isProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Recording punch...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPunch}
            variant="contained"
            color={selectedAction?.color}
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={16} /> : selectedAction?.icon}
          >
            {isProcessing ? 'Recording...' : `Confirm ${selectedAction?.label}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Punch;