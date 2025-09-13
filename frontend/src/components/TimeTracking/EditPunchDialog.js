import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { 
  format, 
  parseISO, 
  isValid,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  endOfDay
} from 'date-fns';
import { useDispatch } from 'react-redux';
import { updatePunch } from '../../store/slices/punchSlice';
import { showNotification } from '../../store/slices/uiSlice';

const EditPunchDialog = ({ open, onClose, punch, onSave }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    punch_in_time: '',
    punch_out_time: '',
    break_start_time: '',
    break_end_time: '',
    notes: '',
    status: 'completed'
  });
  
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [hasBreak, setHasBreak] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalData, setOriginalData] = useState({});

  // Initialize form data when punch changes
  useEffect(() => {
    if (punch) {
      const data = {
        punch_in_time: punch.punch_in_time ? 
          format(parseISO(punch.punch_in_time), "yyyy-MM-dd'T'HH:mm") : '',
        punch_out_time: punch.punch_out_time ? 
          format(parseISO(punch.punch_out_time), "yyyy-MM-dd'T'HH:mm") : '',
        break_start_time: punch.break_start_time ? 
          format(parseISO(punch.break_start_time), "yyyy-MM-dd'T'HH:mm") : '',
        break_end_time: punch.break_end_time ? 
          format(parseISO(punch.break_end_time), "yyyy-MM-dd'T'HH:mm") : '',
        notes: punch.notes || '',
        status: punch.punch_out_time ? 'completed' : 'active'
      };
      
      setFormData(data);
      setOriginalData(data);
      setHasBreak(Boolean(punch.break_start_time || punch.break_end_time));
      setErrors({});
      setWarnings([]);
    }
  }, [punch]);

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    const newWarnings = [];

    // Required fields
    if (!formData.punch_in_time) {
      newErrors.punch_in_time = 'Punch in time is required';
    }

    // Time validation
    if (formData.punch_in_time && formData.punch_out_time) {
      const punchIn = new Date(formData.punch_in_time);
      const punchOut = new Date(formData.punch_out_time);
      
      if (punchOut <= punchIn) {
        newErrors.punch_out_time = 'Punch out time must be after punch in time';
      }
      
      // Check for extremely long sessions (over 16 hours)
      const sessionHours = differenceInMinutes(punchOut, punchIn) / 60;
      if (sessionHours > 16) {
        newWarnings.push('Session duration exceeds 16 hours. Please verify times are correct.');
      }
      
      // Check for very short sessions (under 5 minutes)
      if (sessionHours < 0.083) { // 5 minutes
        newWarnings.push('Session duration is less than 5 minutes.');
      }
    }

    // Break time validation
    if (hasBreak) {
      if (!formData.break_start_time) {
        newErrors.break_start_time = 'Break start time is required when break is enabled';
      }
      
      if (!formData.break_end_time) {
        newErrors.break_end_time = 'Break end time is required when break is enabled';
      }
      
      if (formData.break_start_time && formData.break_end_time) {
        const breakStart = new Date(formData.break_start_time);
        const breakEnd = new Date(formData.break_end_time);
        
        if (breakEnd <= breakStart) {
          newErrors.break_end_time = 'Break end time must be after break start time';
        }
        
        // Break must be within punch session
        if (formData.punch_in_time) {
          const punchIn = new Date(formData.punch_in_time);
          if (breakStart < punchIn) {
            newErrors.break_start_time = 'Break cannot start before punch in time';
          }
        }
        
        if (formData.punch_out_time) {
          const punchOut = new Date(formData.punch_out_time);
          if (breakEnd > punchOut) {
            newErrors.break_end_time = 'Break cannot end after punch out time';
          }
        }
        
        // Check break duration
        const breakMinutes = differenceInMinutes(breakEnd, breakStart);
        if (breakMinutes > 480) { // 8 hours
          newWarnings.push('Break duration exceeds 8 hours. Please verify times are correct.');
        }
      }
    }

    // Date validation - all times should be on the same day
    const times = [formData.punch_in_time, formData.punch_out_time, formData.break_start_time, formData.break_end_time]
      .filter(Boolean)
      .map(time => new Date(time));
    
    if (times.length > 1) {
      const dates = times.map(time => format(time, 'yyyy-MM-dd'));
      const uniqueDates = [...new Set(dates)];
      
      if (uniqueDates.length > 1) {
        newWarnings.push('Times span multiple days. This may cause issues with reporting.');
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle break toggle
  const handleBreakToggle = (enabled) => {
    setHasBreak(enabled);
    if (!enabled) {
      setFormData(prev => ({
        ...prev,
        break_start_time: '',
        break_end_time: ''
      }));
    }
  };

  // Reset form to original values
  const handleReset = () => {
    setFormData(originalData);
    setHasBreak(Boolean(originalData.break_start_time || originalData.break_end_time));
    setErrors({});
    setWarnings([]);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const updateData = {
        ...formData,
        // Convert empty strings to null
        punch_out_time: formData.punch_out_time || null,
        break_start_time: hasBreak ? formData.break_start_time || null : null,
        break_end_time: hasBreak ? formData.break_end_time || null : null,
        notes: formData.notes || null
      };

      await dispatch(updatePunch({ id: punch.id, data: updateData })).unwrap();
      
      dispatch(showNotification({
        message: 'Punch record updated successfully',
        severity: 'success'
      }));
      
      if (onSave) {
        onSave(updateData);
      }
      
      onClose();
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to update punch record',
        severity: 'error'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Calculate durations for display
  const calculateDurations = () => {
    const durations = { session: 0, work: 0, break: 0 };
    
    if (formData.punch_in_time && formData.punch_out_time) {
      const punchIn = new Date(formData.punch_in_time);
      const punchOut = new Date(formData.punch_out_time);
      durations.session = differenceInMinutes(punchOut, punchIn);
      durations.work = durations.session;
    }
    
    if (hasBreak && formData.break_start_time && formData.break_end_time) {
      const breakStart = new Date(formData.break_start_time);
      const breakEnd = new Date(formData.break_end_time);
      durations.break = differenceInMinutes(breakEnd, breakStart);
      durations.work -= durations.break;
    }
    
    return durations;
  };

  const durations = calculateDurations();

  // Format duration for display
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Check if form has changes
  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalData) || 
           hasBreak !== Boolean(originalData.break_start_time || originalData.break_end_time);
  };

  if (!punch) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">
              Edit Punch Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {punch.punch_in_time ? 
                format(parseISO(punch.punch_in_time), 'EEEE, MMMM d, yyyy') : 
                'Invalid Date'
              }
            </Typography>
          </Box>
          
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Please review:</strong>
            </Typography>
            {warnings.map((warning, index) => (
              <Typography key={index} variant="body2">
                • {warning}
              </Typography>
            ))}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Punch Times */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Punch Times
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Punch In Time"
                  type="datetime-local"
                  value={formData.punch_in_time}
                  onChange={(e) => handleChange('punch_in_time', e.target.value)}
                  error={Boolean(errors.punch_in_time)}
                  helperText={errors.punch_in_time}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Punch Out Time"
                  type="datetime-local"
                  value={formData.punch_out_time}
                  onChange={(e) => handleChange('punch_out_time', e.target.value)}
                  error={Boolean(errors.punch_out_time)}
                  helperText={errors.punch_out_time}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Break Times */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Break Times
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={hasBreak}
                    onChange={(e) => handleBreakToggle(e.target.checked)}
                  />
                }
                label="Include Break"
              />
            </Box>
            
            {hasBreak && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Break Start Time"
                    type="datetime-local"
                    value={formData.break_start_time}
                    onChange={(e) => handleChange('break_start_time', e.target.value)}
                    error={Boolean(errors.break_start_time)}
                    helperText={errors.break_start_time}
                    InputLabelProps={{ shrink: true }}
                    disabled={!hasBreak}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Break End Time"
                    type="datetime-local"
                    value={formData.break_end_time}
                    onChange={(e) => handleChange('break_end_time', e.target.value)}
                    error={Boolean(errors.break_end_time)}
                    helperText={errors.break_end_time}
                    InputLabelProps={{ shrink: true }}
                    disabled={!hasBreak}
                  />
                </Grid>
              </Grid>
            )}
          </Grid>

          {/* Status */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Duration Summary */}
          {(durations.session > 0 || durations.work > 0 || durations.break > 0) && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Duration Summary
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {durations.session > 0 && (
                  <Chip
                    label={`Total: ${formatDuration(durations.session)}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                
                {durations.work > 0 && (
                  <Chip
                    label={`Work: ${formatDuration(durations.work)}`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                
                {durations.break > 0 && (
                  <Chip
                    label={`Break: ${formatDuration(durations.break)}`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
          )}

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any notes about this punch record..."
            />
          </Grid>

          {/* Change Indicator */}
          {hasChanges() && (
            <Grid item xs={12}>
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body2">
                  You have unsaved changes. Click Save to apply them or Reset to discard.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={handleReset}
          startIcon={<RestoreIcon />}
          disabled={!hasChanges() || loading}
        >
          Reset
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        <Button
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges() || loading || Object.keys(errors).length > 0}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPunchDialog;