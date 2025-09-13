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
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  People as UsersIcon,
  Business as DepartmentIcon,
  Settings as SystemIcon,
  LocationOn as GeofenceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../../store/slices/userSlice';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../../store/slices/departmentSlice';
import { showNotification } from '../../store/slices/uiSlice';
import GeofenceManager from '../../components/Geofence/GeofenceManager';

const Admin = () => {
  const dispatch = useDispatch();
  
  const { users, departments } = useSelector(state => state.admin);
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [userDialog, setUserDialog] = useState({ open: false, mode: 'create', data: null });
  const [departmentDialog, setDepartmentDialog] = useState({ open: false, mode: 'create', data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null });
  
  // Form states
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: 'employee',
    isActive: true
  });
  
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    manager: '',
    location: '',
    isActive: true
  });
  
  const [systemSettings, setSystemSettings] = useState({
    allowSelfRegistration: false,
    requireLocationTracking: true,
    autoLogoutTime: 480,
    maxDailyHours: 12,
    overtimeThreshold: 40,
    breakReminderInterval: 120,
    geofenceRadius: 100,
    allowMobileAccess: true,
    requireTwoFactor: false,
    sessionTimeout: 60
  });

  // Tab options
  const tabOptions = [
    { label: 'Users', icon: <UsersIcon />, value: 'users' },
    { label: 'Departments', icon: <DepartmentIcon />, value: 'departments' },
    { label: 'System Settings', icon: <SystemIcon />, value: 'system' },
    { label: 'Geofences', icon: <GeofenceIcon />, value: 'geofences' }
  ];

  // Initialize data
  useEffect(() => {
    dispatch(getUsers());
    dispatch(getDepartments());
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
    setSearchTerm('');
    setFilterStatus('all');
  };

  // Handle search
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Handle filter
  const handleFilter = (event) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // User management functions
  const handleCreateUser = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      role: 'employee',
      isActive: true
    });
    setUserDialog({ open: true, mode: 'create', data: null });
  };

  const handleEditUser = (user) => {
    setUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || '',
      role: user.role || 'employee',
      isActive: user.isActive !== false
    });
    setUserDialog({ open: true, mode: 'edit', data: user });
  };

  const handleSaveUser = async () => {
    try {
      if (userDialog.mode === 'create') {
        await dispatch(createUser(userForm)).unwrap();
        dispatch(showNotification({
          message: 'User created successfully',
          severity: 'success'
        }));
      } else {
        await dispatch(updateUser({ id: userDialog.data.id, ...userForm })).unwrap();
        dispatch(showNotification({
          message: 'User updated successfully',
          severity: 'success'
        }));
      }
      setUserDialog({ open: false, mode: 'create', data: null });
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to save user',
        severity: 'error'
      }));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await dispatch(updateUser({ userId, userData: { isActive: !currentStatus } })).unwrap();
      dispatch(showNotification({
        message: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to update user status',
        severity: 'error'
      }));
    }
  };

  // Department management functions
  const handleCreateDepartment = () => {
    setDepartmentForm({
      name: '',
      description: '',
      manager: '',
      location: '',
      isActive: true
    });
    setDepartmentDialog({ open: true, mode: 'create', data: null });
  };

  const handleEditDepartment = (department) => {
    setDepartmentForm({
      name: department.name || '',
      description: department.description || '',
      manager: department.manager || '',
      location: department.location || '',
      isActive: department.isActive !== false
    });
    setDepartmentDialog({ open: true, mode: 'edit', data: department });
  };

  const handleSaveDepartment = async () => {
    try {
      if (departmentDialog.mode === 'create') {
        await dispatch(createDepartment(departmentForm)).unwrap();
        dispatch(showNotification({
          message: 'Department created successfully',
          severity: 'success'
        }));
      } else {
        await dispatch(updateDepartment({ id: departmentDialog.data.id, ...departmentForm })).unwrap();
        dispatch(showNotification({
          message: 'Department updated successfully',
          severity: 'success'
        }));
      }
      setDepartmentDialog({ open: false, mode: 'create', data: null });
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to save department',
        severity: 'error'
      }));
    }
  };

  // Delete functions
  const handleDelete = async () => {
    try {
      if (deleteDialog.type === 'user') {
        await dispatch(deleteUser(deleteDialog.id)).unwrap();
        dispatch(showNotification({
          message: 'User deleted successfully',
          severity: 'success'
        }));
      } else if (deleteDialog.type === 'department') {
        await dispatch(deleteDepartment(deleteDialog.id)).unwrap();
        dispatch(showNotification({
          message: 'Department deleted successfully',
          severity: 'success'
        }));
      }
      setDeleteDialog({ open: false, type: '', id: null });
    } catch (error) {
      dispatch(showNotification({
        message: error.message || 'Failed to delete item',
        severity: 'error'
      }));
    }
  };

  // Filter data
  const getFilteredUsers = () => {
    let filtered = users || [];
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        if (filterStatus === 'active') return user.isActive !== false;
        if (filterStatus === 'inactive') return user.isActive === false;
        return true;
      });
    }
    
    return filtered;
  };

  const getFilteredDepartments = () => {
    let filtered = departments || [];
    
    if (searchTerm) {
      filtered = filtered.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Render Users Tab
  const renderUsersTab = () => {
    const filteredUsers = getFilteredUsers();
    const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Box>
        {/* Header Actions */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} onChange={handleFilter} label="Status">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => dispatch(getUsers())}
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Users Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={user.avatar}>
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.position}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      color={user.role === 'admin' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive !== false ? 'Active' : 'Inactive'}
                      size="small"
                      color={user.isActive !== false ? 'success' : 'error'}
                      icon={user.isActive !== false ? <ActiveIcon /> : <BlockIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditUser(user)}
                      title="Edit User"
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      onClick={() => handleToggleUserStatus(user.id, user.isActive !== false)}
                      title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                      color={user.isActive !== false ? 'error' : 'success'}
                    >
                      {user.isActive !== false ? <BlockIcon /> : <ActiveIcon />}
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialog({ open: true, type: 'user', id: user.id })}
                      title="Delete User"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
      </Box>
    );
  };

  // Render Departments Tab
  const renderDepartmentsTab = () => {
    const filteredDepartments = getFilteredDepartments();

    return (
      <Box>
        {/* Header Actions */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDepartment}
          >
            Add Department
          </Button>
        </Box>

        {/* Departments Grid */}
        <Grid container spacing={3}>
          {filteredDepartments.map((department) => (
            <Grid item xs={12} sm={6} md={4} key={department.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {department.name}
                    </Typography>
                    
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditDepartment(department)}
                        title="Edit Department"
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, type: 'department', id: department.id })}
                        title="Delete Department"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {department.description || 'No description'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">
                      Manager: {department.manager || 'Not assigned'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">
                      Location: {department.location || 'Not specified'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      Employees: {department.employeeCount || 0}
                    </Typography>
                    
                    <Chip
                      label={department.isActive !== false ? 'Active' : 'Inactive'}
                      size="small"
                      color={department.isActive !== false ? 'success' : 'error'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Render System Settings Tab
  const renderSystemSettingsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Management
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Allow Self Registration"
                  secondary="Users can create their own accounts"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.allowSelfRegistration}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowSelfRegistration: e.target.checked }))}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Require Two-Factor Authentication"
                  secondary="Force 2FA for all users"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.requireTwoFactor}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, requireTwoFactor: e.target.checked }))}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Allow Mobile Access"
                  secondary="Enable mobile app access"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.allowMobileAccess}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowMobileAccess: e.target.checked }))}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Tracking
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Require Location Tracking"
                  secondary="Force GPS tracking for punches"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.requireLocationTracking}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, requireLocationTracking: e.target.checked }))}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
            
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Auto Logout Time (minutes)"
                type="number"
                value={systemSettings.autoLogoutTime}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, autoLogoutTime: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Max Daily Hours"
                type="number"
                value={systemSettings.maxDailyHours}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, maxDailyHours: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Weekly Overtime Threshold"
                type="number"
                value={systemSettings.overtimeThreshold}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, overtimeThreshold: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Break Reminder Interval (minutes)"
                type="number"
                value={systemSettings.breakReminderInterval}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, breakReminderInterval: parseInt(e.target.value) }))}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<EditIcon />}>
            Save Settings
          </Button>
        </Box>
      </Grid>
    </Grid>
  );

  // Render Geofences Tab
  const renderGeofencesTab = () => (
    <GeofenceManager />
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminIcon />
          Admin Panel
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage users, departments, and system settings
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
        {activeTab === 0 && renderUsersTab()}
        {activeTab === 1 && renderDepartmentsTab()}
        {activeTab === 2 && renderSystemSettingsTab()}
        {activeTab === 3 && renderGeofencesTab()}
      </Box>

      {/* User Dialog */}
      <Dialog
        open={userDialog.open}
        onClose={() => setUserDialog({ open: false, mode: 'create', data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {userDialog.mode === 'create' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={userForm.firstName}
                onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={userForm.lastName}
                onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={userForm.department}
                  onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                  label="Department"
                >
                  {departments?.map((dept) => (
                    <MenuItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                value={userForm.position}
                onChange={(e) => setUserForm(prev => ({ ...prev, position: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  label="Role"
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Active User"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialog({ open: false, mode: 'create', data: null })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {userDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Dialog */}
      <Dialog
        open={departmentDialog.open}
        onClose={() => setDepartmentDialog({ open: false, mode: 'create', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {departmentDialog.mode === 'create' ? 'Add New Department' : 'Edit Department'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Department Name"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manager"
                value={departmentForm.manager}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, manager: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={departmentForm.location}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={departmentForm.isActive}
                    onChange={(e) => setDepartmentForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Active Department"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialog({ open: false, mode: 'create', data: null })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveDepartment}>
            {departmentDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: '', id: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this {deleteDialog.type}? This will permanently remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: '', id: null })}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;