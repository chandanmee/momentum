import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  LocationOff as LocationOffIcon,
  GpsFixed as GpsFixedIcon,
  GpsNotFixed as GpsNotFixedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MyLocation as MyLocationIcon,
  Place as PlaceIcon
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';

// Redux actions
import { validateLocation } from '../../store/slices/punchSlice';
import { getNearbyGeofences } from '../../store/slices/geofenceSlice';
import { showNotification } from '../../store/slices/uiSlice';

const LocationStatus = ({ 
  currentLocation = null,
  isLocationEnabled = false,
  locationError = null,
  geofences = [],
  loading = false
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle location refresh
  const handleRefreshLocation = async () => {
    setRefreshing(true);
    
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            dispatch(showNotification({
              type: 'success',
              title: 'Location Updated',
              message: 'Your location has been refreshed successfully'
            }));
            setRefreshing(false);
          },
          (error) => {
            dispatch(showNotification({
              type: 'error',
              title: 'Location Error',
              message: error.message || 'Failed to get your location'
            }));
            setRefreshing(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        throw new Error('Geolocation is not supported by this browser.');
      }
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Location Error',
        message: error.message || 'Failed to get your location'
      }));
      setRefreshing(false);
    }
  };

  // Handle enable location
  const handleEnableLocation = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            dispatch(showNotification({
              type: 'success',
              title: 'Location Enabled',
              message: 'Location access has been enabled successfully'
            }));
          },
          (error) => {
            dispatch(showNotification({
              type: 'error',
              title: 'Location Error',
              message: error.message || 'Failed to enable location access'
            }));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        );
      } else {
        throw new Error('Geolocation is not supported by this browser.');
      }
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Location Permission Denied',
        message: 'Please enable location services in your browser settings'
      }));
    }
  };

  // Get location status configuration
  const getLocationStatusConfig = () => {
    if (locationError) {
      return {
        status: 'error',
        label: 'Location Error',
        color: 'error',
        icon: <ErrorIcon />,
        description: locationError
      };
    }
    
    if (!isLocationEnabled) {
      return {
        status: 'disabled',
        label: 'Location Disabled',
        color: 'warning',
        icon: <LocationOffIcon />,
        description: 'Location services are not enabled'
      };
    }
    
    if (!currentLocation) {
      return {
        status: 'loading',
        label: 'Getting Location',
        color: 'info',
        icon: <GpsNotFixedIcon />,
        description: 'Waiting for location data'
      };
    }
    
    return {
      status: 'active',
      label: 'Location Active',
      color: 'success',
      icon: <GpsFixedIcon />,
      description: 'Location services are working'
    };
  };

  const statusConfig = getLocationStatusConfig();

  // Format coordinates
  const formatCoordinate = (coord, precision = 6) => {
    return coord ? coord.toFixed(precision) : 'N/A';
  };

  // Calculate accuracy level
  const getAccuracyLevel = (accuracy) => {
    if (!accuracy) return { level: 'unknown', color: 'default', label: 'Unknown' };
    
    if (accuracy <= 5) {
      return { level: 'excellent', color: 'success', label: 'Excellent' };
    } else if (accuracy <= 10) {
      return { level: 'good', color: 'info', label: 'Good' };
    } else if (accuracy <= 20) {
      return { level: 'fair', color: 'warning', label: 'Fair' };
    } else {
      return { level: 'poor', color: 'error', label: 'Poor' };
    }
  };

  const accuracyInfo = currentLocation ? getAccuracyLevel(currentLocation.accuracy) : null;

  // Check if location is within any geofence
  const getGeofenceStatus = () => {
    if (!currentLocation || !geofences || geofences.length === 0) {
      return { withinGeofence: false, activeGeofences: [] };
    }
    
    const activeGeofences = geofences.filter(geofence => {
      // Simple distance calculation (this would be more sophisticated in a real app)
      const distance = Math.sqrt(
        Math.pow(currentLocation.latitude - geofence.latitude, 2) +
        Math.pow(currentLocation.longitude - geofence.longitude, 2)
      ) * 111000; // Rough conversion to meters
      
      return distance <= geofence.radius;
    });
    
    return {
      withinGeofence: activeGeofences.length > 0,
      activeGeofences
    };
  };

  const geofenceStatus = getGeofenceStatus();

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon />
            Location Status
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentLocation && (
              <Tooltip title="Refresh Location">
                <IconButton 
                  size="small" 
                  onClick={handleRefreshLocation}
                  disabled={refreshing || loading}
                >
                  {refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>
            )}
            
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Status Chip */}
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            color={statusConfig.color}
            variant="outlined"
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            {statusConfig.description}
          </Typography>
        </Box>

        {/* Location Error Alert */}
        {locationError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleEnableLocation}
              >
                Retry
              </Button>
            }
          >
            {locationError}
          </Alert>
        )}

        {/* Location Disabled Alert */}
        {!isLocationEnabled && !locationError && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleEnableLocation}
              >
                Enable
              </Button>
            }
          >
            Location services are required for accurate time tracking
          </Alert>
        )}

        {/* Geofence Status */}
        {geofences && geofences.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={geofenceStatus.withinGeofence ? <CheckCircleIcon /> : <WarningIcon />}
              label={geofenceStatus.withinGeofence ? 'Within Work Area' : 'Outside Work Area'}
              color={geofenceStatus.withinGeofence ? 'success' : 'warning'}
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Expanded Details */}
        <Collapse in={expanded}>
          {currentLocation && (
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Location Details
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <MyLocationIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Coordinates"
                    secondary={`${formatCoordinate(currentLocation.latitude)}, ${formatCoordinate(currentLocation.longitude)}`}
                  />
                </ListItem>
                
                {currentLocation.accuracy && (
                  <ListItem>
                    <ListItemIcon>
                      <GpsFixedIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Accuracy"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{currentLocation.accuracy.toFixed(1)}m</span>
                          {accuracyInfo && (
                            <Chip 
                              label={accuracyInfo.label} 
                              color={accuracyInfo.color} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
                
                {currentLocation.timestamp && (
                  <ListItem>
                    <ListItemIcon>
                      <RefreshIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Updated"
                      secondary={new Date(currentLocation.timestamp).toLocaleTimeString()}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}

          {/* Geofences */}
          {geofences && geofences.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Work Areas ({geofences.length})
              </Typography>
              
              <List dense>
                {geofences.map((geofence, index) => {
                  const isActive = geofenceStatus.activeGeofences.some(g => g.id === geofence.id);
                  
                  return (
                    <ListItem key={geofence.id || index}>
                      <ListItemIcon>
                        <PlaceIcon color={isActive ? 'success' : 'default'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{geofence.name}</span>
                            {isActive && (
                              <Chip 
                                label="Active" 
                                color="success" 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={`Radius: ${geofence.radius}m`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            {!isLocationEnabled && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LocationOnIcon />}
                onClick={handleEnableLocation}
              >
                Enable Location
              </Button>
            )}
            
            {currentLocation && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshLocation}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </Box>
        </Collapse>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Getting location...
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationStatus;