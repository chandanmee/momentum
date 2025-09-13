import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Zoom,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakStartIcon,
  PlayCircle as BreakEndIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Redux actions
import { punchIn, punchOut } from '../../store/slices/punchSlice';
import { showNotification } from '../../store/slices/uiSlice';

// Services
import { GeolocationService } from '../../services/geolocationService';
import { NotificationService } from '../../services/notificationService';

const QuickPunchFab = ({ onPunchComplete }) => {
  const dispatch = useDispatch();
  
  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    currentPunch, 
    isLoading: punchLoading 
  } = useSelector((state) => state.punch);
  const { 
    currentLocation, 
    isLocationEnabled 
  } = useSelector((state) => state.geolocation);

  // Local state
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Determine current status and available actions
  const getCurrentStatus = () => {
    if (!currentPunch) {
      return {
        status: 'clocked_out',
        label: 'Clocked Out',
        color: 'default',
        actions: ['punch_in']
      };
    }

    if (currentPunch.punch_out_time) {
      return {
        status: 'clocked_out',
        label: 'Clocked Out',
        color: 'default',
        actions: ['punch_in']
      };
    }

    if (currentPunch.break_start_time && !currentPunch.break_end_time) {
      return {
        status: 'on_break',
        label: 'On Break',
        color: 'warning',
        actions: ['break_end', 'punch_out']
      };
    }

    return {
      status: 'clocked_in',
      label: 'Clocked In',
      color: 'success',
      actions: ['break_start', 'punch_out']
    };
  };

  const currentStatus = getCurrentStatus();

  // Speed dial actions configuration
  const speedDialActions = [
    {
      id: 'punch_in',
      icon: <PunchInIcon />,
      name: 'Punch In',
      color: 'success',
      description: 'Start your work day'
    },
    {
      id: 'punch_out',
      icon: <PunchOutIcon />,
      name: 'Punch Out',
      color: 'error',
      description: 'End your work day'
    },
    {
      id: 'break_start',
      icon: <BreakStartIcon />,
      name: 'Start Break',
      color: 'warning',
      description: 'Begin your break'
    },
    {
      id: 'break_end',
      icon: <BreakEndIcon />,
      name: 'End Break',
      color: 'info',
      description: 'Return from break'
    }
  ].filter(action => currentStatus.actions.includes(action.id));

  // Handle speed dial action click
  const handleActionClick = (action) => {
    setSelectedAction(action);
    setSpeedDialOpen(false);
    setConfirmDialogOpen(true);
    setLocationError(null);
  };

  // Handle punch confirmation
  const handleConfirmPunch = async () => {
    if (!selectedAction) return;

    setIsProcessing(true);
    
    try {
      // Get current location if geolocation is enabled
      let location = null;
      if (isLocationEnabled) {
        try {
          location = await GeolocationService.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        } catch (error) {
          console.warn('Failed to get location:', error);
          setLocationError('Unable to get current location');
          // Continue without location if it fails
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
        user_id: user.id
      };

      // Dispatch punch action
      let punchAction;
      switch (selectedAction.id) {
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
      dispatch(showNotification({
        type: 'success',
        title: 'Punch Recorded',
        message: `Successfully ${selectedAction.name.toLowerCase()} at ${format(new Date(), 'h:mm a')}`
      }));

      // Show system notification if supported
      if (NotificationService.isSupported()) {
        NotificationService.showPunchNotification(
          selectedAction.name,
          `${selectedAction.name} recorded at ${format(new Date(), 'h:mm a')}`,
          selectedAction.id
        );
      }

      // Call completion callback
      if (onPunchComplete) {
        onPunchComplete(result);
      }

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
      setLocationError(null);
    }
  };

  // Get action color
  const getActionColor = (actionId) => {
    const action = speedDialActions.find(a => a.id === actionId);
    return action?.color || 'primary';
  };

  // Render confirmation dialog
  const renderConfirmationDialog = () => {
    if (!selectedAction) return null;

    return (
      <Dialog
        open={confirmDialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: `${getActionColor(selectedAction.id)}.main`,
              color: 'white'
            }}
          >
            {selectedAction.icon}
          </Box>
          Confirm {selectedAction.name}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              {selectedAction.description}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {/* Current time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="action" />
                <Typography variant="body2">
                  Time: {format(currentTime, 'EEEE, MMMM d, yyyy h:mm:ss a')}
                </Typography>
              </Box>
              
              {/* Location info */}
              {isLocationEnabled && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="action" />
                  <Typography variant="body2">
                    {currentLocation ? (
                      `Location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                    ) : (
                      'Getting location...'
                    )}
                  </Typography>
                </Box>
              )}
              
              {/* Current status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Current Status:</Typography>
                <Chip
                  label={currentStatus.label}
                  size="small"
                  color={currentStatus.color}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
          
          {/* Location error */}
          {locationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {locationError}
            </Alert>
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Recording punch...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleDialogClose} 
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPunch}
            variant="contained"
            color={getActionColor(selectedAction.id)}
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={16} /> : selectedAction.icon}
          >
            {isProcessing ? 'Recording...' : `Confirm ${selectedAction.name}`}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <SpeedDial
        ariaLabel="Quick punch actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={
          <SpeedDialIcon 
            icon={<AddIcon />} 
            openIcon={<CloseIcon />}
          />
        }
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
        direction="up"
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.id}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => handleActionClick(action)}
            sx={{
              '& .MuiSpeedDialAction-fab': {
                bgcolor: `${action.color}.main`,
                color: 'white',
                '&:hover': {
                  bgcolor: `${action.color}.dark`,
                }
              }
            }}
          />
        ))}
      </SpeedDial>
      
      {renderConfirmationDialog()}
    </>
  );
};

export default QuickPunchFab;