import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  AccessTime,
  LocationOn,
  Notes,
  History,
} from '@mui/icons-material';
import {
  fetchTodaysPunches,
  getCurrentStatus,
  createPunch,
  updatePunch,
  deletePunch,
} from '../../store/slices/punchSlice';
import { formatDate, calculateTotalHours, getCurrentTimestamp } from '../../utils/helpers';
import Layout from '../../components/layout/Layout';

const PunchClock = () => {
  const dispatch = useDispatch();
  const { todaysPunches, currentStatus, isLoading, error } = useSelector((state) => state.punch);
  const { user } = useSelector((state) => state.auth);

  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    dispatch(fetchTodaysPunches());
    dispatch(getCurrentStatus());
  }, [dispatch]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get user's location if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  const handlePunchAction = async (action) => {
    try {
      const punchData = {
        type: action,
        timestamp: getCurrentTimestamp(),
        location: location || null,
        notes: notes.trim() || null,
      };

      await dispatch(createPunch(punchData)).unwrap();
      dispatch(fetchTodaysPunches());
      setNotes('');
      setConfirmDialog({ open: false, action: null });
    } catch (error) {
      console.error('Punch action error:', error);
    }
  };

  const handleConfirmAction = (action) => {
    setConfirmDialog({ open: true, action });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, action: null });
  };

  const handleDeletePunch = async (punchId) => {
    try {
      await dispatch(deletePunch(punchId)).unwrap();
      dispatch(fetchTodaysPunches());
    } catch (error) {
      console.error('Delete punch error:', error);
    }
  };

  const totalHoursToday = calculateTotalHours(todaysPunches);
  const lastPunch = todaysPunches.length > 0 ? todaysPunches[todaysPunches.length - 1] : null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'in':
        return 'success';
      case 'out':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'in':
        return 'Currently Clocked In';
      case 'out':
        return 'Currently Clocked Out';
      default:
        return 'Status Unknown';
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Punch Clock
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Track your work hours with precision.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Main Punch Clock */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                {/* Current Time Display */}
                <Typography variant="h2" sx={{ mb: 2, fontFamily: 'monospace' }}>
                  {currentTime.toLocaleTimeString()}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>

                {/* Status Chip */}
                <Chip
                  label={getStatusText(currentStatus)}
                  color={getStatusColor(currentStatus)}
                  size="large"
                  sx={{ mb: 4, fontSize: '1rem', py: 3 }}
                />

                {/* Punch Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {currentStatus === 'out' ? (
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<PlayArrow />}
                      onClick={() => handleConfirmAction('in')}
                      disabled={isLoading}
                      sx={{ minWidth: 150, py: 2 }}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Punch In'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      startIcon={<Stop />}
                      onClick={() => handleConfirmAction('out')}
                      disabled={isLoading}
                      sx={{ minWidth: 150, py: 2 }}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Punch Out'}
                    </Button>
                  )}
                </Box>

                {/* Notes and Location */}
                <Box sx={{ mt: 4, maxWidth: 400, mx: 'auto' }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note about this punch..."
                    InputProps={{
                      startAdornment: <Notes sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  {location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Location: {location}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Summary
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h4" color="primary">
                    {totalHoursToday}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total hours worked
                </Typography>
                
                {lastPunch && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Last punch: {formatDate(lastPunch.timestamp)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Stats
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Punches today:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {todaysPunches.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">This week:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    32:15
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">This month:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    128:45
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Punch History */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <History sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Today's Punch History
                  </Typography>
                </Box>
                
                {todaysPunches.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="text.secondary">
                      No punches recorded today. Start by punching in!
                    </Typography>
                  </Paper>
                ) : (
                  <List>
                    {todaysPunches.map((punch, index) => (
                      <React.Fragment key={punch.id || index}>
                        <ListItem
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip
                              label={punch.type.toUpperCase()}
                              size="small"
                              color={punch.type === 'in' ? 'success' : 'default'}
                            />
                            <Box>
                              <Typography variant="body1">
                                {formatDate(punch.timestamp)}
                              </Typography>
                              {punch.notes && (
                                <Typography variant="caption" color="text.secondary">
                                  {punch.notes}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeletePunch(punch.id)}
                          >
                            Delete
                          </Button>
                        </ListItem>
                        {index < todaysPunches.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onClose={handleCloseDialog}>
          <DialogTitle>
            Confirm {confirmDialog.action === 'in' ? 'Punch In' : 'Punch Out'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to {confirmDialog.action === 'in' ? 'punch in' : 'punch out'} at{' '}
              {currentTime.toLocaleTimeString()}?
            </Typography>
            {notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Note: {notes}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={() => handlePunchAction(confirmDialog.action)}
              variant="contained"
              color={confirmDialog.action === 'in' ? 'success' : 'error'}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default PunchClock;