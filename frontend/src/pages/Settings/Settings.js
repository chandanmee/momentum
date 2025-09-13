import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as ThemeIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  PhotoCamera as CameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, changePassword } from '../../store/slices/authSlice';
import { updateSettings, fetchSettings } from '../../store/slices/settingsSlice';
import { showNotification } from '../../store/slices/uiSlice';

const Settings = () => {
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { settings } = useSelector(state => state.settings);
  
  const [activeTab, setActiveTab] = useState(0);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    avatar: null
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    punchReminders: true,
    breakReminders: true,
    overtimeAlerts: true,
    weeklyReports: true
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h'
  });
  
  const [workSettings, setWorkSettings] = useState({
    workingHours: 8,
    breakDuration: 30,
    overtimeThreshold: 40,
    autoBreakReminder: true,
    locationTracking: true,
    geofenceRadius: 100
  });
  
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab options
  const tabOptions = [
    { label: 'Profile', icon: <PersonIcon />, value: 'profile' },
    { label: 'Security', icon: <SecurityIcon />, value: 'security' },
    { label: 'Notifications', icon: <NotificationsIcon />, value: 'notifications' },
    { label: 'Appearance', icon: <ThemeIcon />, value: 'appearance' },
    { label: 'Work Settings', icon: <BusinessIcon />, value: 'work' }
  ];

  // Initialize data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
        avatar: user.avatar || null
      });
    }
    
    if (settings) {
      setNotificationSettings(prev => settings.notifications || prev);
      setAppearanceSettings(prev => settings.appearance || prev);
      setWorkSettings(prev => settings.work || prev);
    }
  }, [user, settings]);

  // Fetch settings on mount
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    setSaving(true);
    
    try {
      await dispatch(updateProfile(profileData)).unwrap();
      
      dispatch(showNotification({
        message: 'Profile updated successfully',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to update profile',
        severity: 'error'
      }));
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      dispatch(showNotification({
        message: 'New passwords do not match',
        severity: 'error'
      }));
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      dispatch(showNotification({
        message: 'Password must be at least 8 characters long',
        severity: 'error'
      }));
      return;
    }
    
    setSaving(true);
    
    try {
      await dispatch(changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })).unwrap();
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      dispatch(showNotification({
        message: 'Password changed successfully',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to change password',
        severity: 'error'
      }));
    } finally {
      setSaving(false);
    }
  };

  // Handle settings update
  const handleSettingsUpdate = async (settingsType, data) => {
    setSaving(true);
    
    try {
      await dispatch(updateSettings({ [settingsType]: data })).unwrap();
      
      dispatch(showNotification({
        message: 'Settings updated successfully',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to update settings',
        severity: 'error'
      }));
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData(prev => ({
          ...prev,
          avatar: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Render Profile Tab
  const renderProfileTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Avatar
                src={profileData.avatar}
                sx={{ width: 120, height: 120, mx: 'auto' }}
              >
                {profileData.firstName?.charAt(0)}{profileData.lastName?.charAt(0)}
              </Avatar>
              
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <CameraIcon />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </IconButton>
            </Box>
            
            <Typography variant="h6">
              {profileData.firstName} {profileData.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profileData.position} • {profileData.department}
            </Typography>
            
            <Chip
              label={user?.role || 'Employee'}
              color="primary"
              size="small"
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={profileData.department}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                    label="Department"
                  >
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Sales">Sales</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                    <MenuItem value="HR">Human Resources</MenuItem>
                    <MenuItem value="Finance">Finance</MenuItem>
                    <MenuItem value="Operations">Operations</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Position"
                  value={profileData.position}
                  onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleProfileUpdate}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render Security Tab
  const renderSecurityTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => togglePasswordVisibility('current')}>
                        {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => togglePasswordVisibility('new')}>
                        {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => togglePasswordVisibility('confirm')}>
                        {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handlePasswordChange}
                disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                {saving ? 'Changing...' : 'Change Password'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Security
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Two-Factor Authentication"
                  secondary="Add an extra layer of security to your account"
                />
                <ListItemSecondaryAction>
                  <Switch />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <LocationIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Login Notifications"
                  secondary="Get notified of new login attempts"
                />
                <ListItemSecondaryAction>
                  <Switch defaultChecked />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom color="error">
              Danger Zone
            </Typography>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteAccountDialog(true)}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render Notifications Tab
  const renderNotificationsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Notification Preferences
        </Typography>
        
        <List>
          <ListItem>
            <ListItemText
              primary="Email Notifications"
              secondary="Receive notifications via email"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Push Notifications"
              secondary="Receive push notifications in browser"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.pushNotifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Punch Reminders"
              secondary="Remind me to punch in/out"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.punchReminders}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, punchReminders: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Break Reminders"
              secondary="Remind me to take breaks"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.breakReminders}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, breakReminders: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Overtime Alerts"
              secondary="Alert me when approaching overtime"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.overtimeAlerts}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, overtimeAlerts: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Weekly Reports"
              secondary="Receive weekly time tracking summaries"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={notificationSettings.weeklyReports}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, weeklyReports: e.target.checked }))}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSettingsUpdate('notifications', notificationSettings)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render Appearance Tab
  const renderAppearanceTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Appearance & Language
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={appearanceSettings.theme}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, theme: e.target.value }))}
                label="Theme"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto (System)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={appearanceSettings.language}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, language: e.target.value }))}
                label="Language"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={appearanceSettings.timezone}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, timezone: e.target.value }))}
                label="Timezone"
              >
                <MenuItem value="UTC">UTC</MenuItem>
                <MenuItem value="America/New_York">Eastern Time</MenuItem>
                <MenuItem value="America/Chicago">Central Time</MenuItem>
                <MenuItem value="America/Denver">Mountain Time</MenuItem>
                <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Date Format</InputLabel>
              <Select
                value={appearanceSettings.dateFormat}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                label="Date Format"
              >
                <MenuItem value="MM/dd/yyyy">MM/DD/YYYY</MenuItem>
                <MenuItem value="dd/MM/yyyy">DD/MM/YYYY</MenuItem>
                <MenuItem value="yyyy-MM-dd">YYYY-MM-DD</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Time Format</InputLabel>
              <Select
                value={appearanceSettings.timeFormat}
                onChange={(e) => setAppearanceSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
                label="Time Format"
              >
                <MenuItem value="12h">12 Hour (AM/PM)</MenuItem>
                <MenuItem value="24h">24 Hour</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSettingsUpdate('appearance', appearanceSettings)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render Work Settings Tab
  const renderWorkSettingsTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Work Preferences
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Daily Working Hours"
              type="number"
              value={workSettings.workingHours}
              onChange={(e) => setWorkSettings(prev => ({ ...prev, workingHours: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 1, max: 24 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Break Duration (minutes)"
              type="number"
              value={workSettings.breakDuration}
              onChange={(e) => setWorkSettings(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 5, max: 120 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Weekly Overtime Threshold"
              type="number"
              value={workSettings.overtimeThreshold}
              onChange={(e) => setWorkSettings(prev => ({ ...prev, overtimeThreshold: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 20, max: 80 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Geofence Radius (meters)"
              type="number"
              value={workSettings.geofenceRadius}
              onChange={(e) => setWorkSettings(prev => ({ ...prev, geofenceRadius: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 10, max: 1000 } }}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={workSettings.autoBreakReminder}
                onChange={(e) => setWorkSettings(prev => ({ ...prev, autoBreakReminder: e.target.checked }))}
              />
            }
            label="Automatic break reminders"
          />
        </Box>
        
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={workSettings.locationTracking}
                onChange={(e) => setWorkSettings(prev => ({ ...prev, locationTracking: e.target.checked }))}
              />
            }
            label="Enable location tracking"
          />
        </Box>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSettingsUpdate('work', workSettings)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabOptions.map((tab, index) => (
            <Tab
              key={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {activeTab === 0 && renderProfileTab()}
        {activeTab === 1 && renderSecurityTab()}
        {activeTab === 2 && renderNotificationsTab()}
        {activeTab === 3 && renderAppearanceTab()}
        {activeTab === 4 && renderWorkSettingsTab()}
      </Box>

      {/* Delete Account Dialog */}
      <Dialog
        open={deleteAccountDialog}
        onClose={() => setDeleteAccountDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone. All your data will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete your account? This will permanently remove all your data, including time tracking records, reports, and settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAccountDialog(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;