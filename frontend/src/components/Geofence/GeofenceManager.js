import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Grid,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getGeofences, 
  createGeofence, 
  updateGeofence, 
  deleteGeofence 
} from '../../store/slices/geofenceSlice';
import { getDepartments } from '../../store/slices/departmentSlice';
import { showNotification } from '../../store/slices/uiSlice';
import MapboxMap from '../UI/MapboxMap';

const GeofenceManager = () => {
  const dispatch = useDispatch();
  const { geofences, loading, error } = useSelector(state => state.geofence);
  const { departments } = useSelector(state => state.department);
  const { user } = useSelector(state => state.auth);

  const [open, setOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'circle',
    latitude: '',
    longitude: '',
    radius: '',
    coordinates: [],
    departmentId: '',
    active: true
  });
  const [mapCenter, setMapCenter] = useState([-74.006, 40.7128]);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    dispatch(getGeofences());
    dispatch(getDepartments());
  }, [dispatch]);

  const handleOpen = (geofence = null) => {
    if (geofence) {
      setEditingGeofence(geofence);
      setFormData({
        name: geofence.name,
        description: geofence.description || '',
        type: geofence.type,
        latitude: geofence.latitude?.toString() || '',
        longitude: geofence.longitude?.toString() || '',
        radius: geofence.radius?.toString() || '',
        coordinates: geofence.coordinates || [],
        departmentId: geofence.departmentId || '',
        active: geofence.active
      });
      if (geofence.latitude && geofence.longitude) {
        setMapCenter([geofence.longitude, geofence.latitude]);
      }
    } else {
      setEditingGeofence(null);
      setFormData({
        name: '',
        description: '',
        type: 'circle',
        latitude: '',
        longitude: '',
        radius: '',
        coordinates: [],
        departmentId: '',
        active: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingGeofence(null);
    setShowMap(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationUpdate = (location) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString()
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        dispatch(showNotification({
          type: 'error',
          message: 'Geofence name is required'
        }));
        return;
      }

      if (formData.type === 'circle') {
        if (!formData.latitude || !formData.longitude || !formData.radius) {
          dispatch(showNotification({
            type: 'error',
            message: 'Latitude, longitude, and radius are required for circle geofences'
          }));
          return;
        }
      }

      const geofenceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        radius: formData.radius ? parseFloat(formData.radius) : null,
        coordinates: formData.coordinates,
        departmentId: formData.departmentId || null,
        active: formData.active
      };

      if (editingGeofence) {
        await dispatch(updateGeofence({ 
          id: editingGeofence.id, 
          geofenceData 
        })).unwrap();
        dispatch(showNotification({
          type: 'success',
          message: 'Geofence updated successfully'
        }));
      } else {
        await dispatch(createGeofence(geofenceData)).unwrap();
        dispatch(showNotification({
          type: 'success',
          message: 'Geofence created successfully'
        }));
      }

      handleClose();
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        message: error.message || 'Failed to save geofence'
      }));
    }
  };

  const handleDelete = async (geofenceId) => {
    if (window.confirm('Are you sure you want to delete this geofence?')) {
      try {
        await dispatch(deleteGeofence(geofenceId)).unwrap();
        dispatch(showNotification({
          type: 'success',
          message: 'Geofence deleted successfully'
        }));
      } catch (error) {
        dispatch(showNotification({
          type: 'error',
          message: error.message || 'Failed to delete geofence'
        }));
      }
    }
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'All Departments';
  };

  if (!user || user.role !== 'admin') {
    return (
      <Alert severity="error">
        You don't have permission to access this page.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Geofence Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Geofence
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geofences ({geofences.length})
              </Typography>
              
              {geofences.length === 0 ? (
                <Typography color="textSecondary">
                  No geofences created yet. Click "Add Geofence" to create your first one.
                </Typography>
              ) : (
                <List>
                  {geofences.map((geofence) => (
                    <ListItem key={geofence.id} divider>
                      <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {geofence.name}
                            <Chip
                              label={geofence.active ? 'Active' : 'Inactive'}
                              color={geofence.active ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {geofence.description || 'No description'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Type: {geofence.type} | Department: {getDepartmentName(geofence.departmentId)}
                              {geofence.type === 'circle' && geofence.radius && (
                                <> | Radius: {geofence.radius}m</>
                              )}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleOpen(geofence)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => handleDelete(geofence.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Map View
              </Typography>
              <MapboxMap
                center={mapCenter}
                zoom={12}
                height="400px"
                showGeofences={true}
                showUserLocation={false}
                interactive={true}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add/Edit Geofence Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGeofence ? 'Edit Geofence' : 'Add New Geofence'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="circle">Circle</MenuItem>
                    <MenuItem value="polygon">Polygon</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
              
              {formData.type === 'circle' && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Latitude"
                      type="number"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      required
                      inputProps={{ step: 'any' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Longitude"
                      type="number"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      required
                      inputProps={{ step: 'any' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Radius (meters)"
                      type="number"
                      value={formData.radius}
                      onChange={(e) => handleInputChange('radius', e.target.value)}
                      required
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                </>
              )}
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={formData.departmentId}
                    onChange={(e) => handleInputChange('departmentId', e.target.value)}
                    label="Department"
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                    />
                  }
                  label="Active"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<MapIcon />}
                  onClick={() => setShowMap(!showMap)}
                  sx={{ mb: 2 }}
                >
                  {showMap ? 'Hide Map' : 'Show Map'}
                </Button>
                
                {showMap && (
                  <MapboxMap
                    center={mapCenter}
                    zoom={15}
                    height="300px"
                    showGeofences={false}
                    showUserLocation={true}
                    onLocationUpdate={handleLocationUpdate}
                    interactive={true}
                  />
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editingGeofence ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeofenceManager;