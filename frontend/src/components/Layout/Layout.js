import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fab,
  Zoom,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccessTime as PunchIcon,
  History as HistoryIcon,
  Person as ProfileIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  WifiOff as OfflineIcon,
  Sync as SyncIcon,
  Add as AddIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

// Redux actions
import { logout } from '../../store/slices/authSlice';
import { toggleTheme, clearNotifications } from '../../store/slices/uiSlice';

// Components
import NotificationPanel from '../UI/NotificationPanel';
import QuickPunchFab from '../Punch/QuickPunchFab';

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    theme: themeMode, 
    notifications, 
    isOnline,
    isSyncing 
  } = useSelector((state) => state.ui);

  // Local state
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState(null);

  // Drawer width
  const drawerWidth = 280;

  // Navigation items
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['employee', 'manager', 'admin']
    },
    {
      text: 'Punch Clock',
      icon: <PunchIcon />,
      path: '/punch',
      roles: ['employee', 'manager', 'admin']
    },
    {
      text: 'History',
      icon: <HistoryIcon />,
      path: '/history',
      roles: ['employee', 'manager', 'admin']
    },
    {
      text: 'Profile',
      icon: <ProfileIcon />,
      path: '/profile',
      roles: ['employee', 'manager', 'admin']
    },
    {
      text: 'Reports',
      icon: <HistoryIcon />,
      path: '/reports',
      roles: ['manager', 'admin']
    },
    {
      text: 'Admin',
      icon: <AdminIcon />,
      path: '/admin',
      roles: ['admin']
    }
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'employee')
  );

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  // Handle profile menu
  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  // Handle notification menu
  const handleNotificationMenuOpen = (event) => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
    handleProfileMenuClose();
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  // Handle clear notifications
  const handleClearNotifications = () => {
    dispatch(clearNotifications());
    handleNotificationMenuClose();
  };

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    
    const breadcrumbs = [
      {
        label: 'Home',
        path: '/dashboard',
        icon: <HomeIcon fontSize="small" />
      }
    ];

    pathnames.forEach((pathname, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const navItem = navigationItems.find(item => item.path === path);
      
      if (navItem) {
        breadcrumbs.push({
          label: navItem.text,
          path: path,
          icon: navItem.icon
        });
      } else {
        // Capitalize and format pathname
        const label = pathname.charAt(0).toUpperCase() + pathname.slice(1).replace(/-/g, ' ');
        breadcrumbs.push({
          label: label,
          path: path
        });
      }
    });

    return breadcrumbs;
  };

  // Close drawer on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Momentum
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Time & Attendance
        </Typography>
      </Box>

      {/* User info */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={user?.avatar} 
            alt={user?.name}
            sx={{ width: 40, height: 40 }}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
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
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, py: 1 }}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Status indicators */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {!isOnline && (
            <Chip
              icon={<OfflineIcon />}
              label="Offline"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {isSyncing && (
            <Chip
              icon={<SyncIcon />}
              label="Syncing"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          {/* Menu button */}
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Box sx={{ flex: 1 }}>
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              aria-label="breadcrumb"
            >
              {generateBreadcrumbs().map((crumb, index, array) => {
                const isLast = index === array.length - 1;
                
                return isLast ? (
                  <Box key={crumb.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {crumb.icon}
                    <Typography color="text.primary" variant="body2">
                      {crumb.label}
                    </Typography>
                  </Box>
                ) : (
                  <Link
                    key={crumb.path}
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate(crumb.path)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      cursor: 'pointer'
                    }}
                  >
                    {crumb.icon}
                    <Typography variant="body2">
                      {crumb.label}
                    </Typography>
                  </Link>
                );
              })}
            </Breadcrumbs>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme toggle */}
            <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton color="inherit" onClick={handleThemeToggle}>
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationMenuOpen}>
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile menu */}
            <Tooltip title="Profile">
              <IconButton color="inherit" onClick={handleProfileMenuOpen}>
                <Avatar 
                  src={user?.avatar} 
                  alt={user?.name}
                  sx={{ width: 32, height: 32 }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isMobile ? 0 : (drawerOpen ? 0 : `-${drawerWidth}px`),
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />
        
        {/* Page content */}
        <Box sx={{ flex: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <ProfileIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Notification Panel */}
      <NotificationPanel
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={handleNotificationMenuClose}
        notifications={notifications}
        onClear={handleClearNotifications}
      />

      {/* Quick Punch FAB */}
      {location.pathname !== '/punch' && (
        <Zoom in={true}>
          <Fab
            color="primary"
            aria-label="quick punch"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: theme.zIndex.speedDial,
            }}
            onClick={() => navigate('/punch')}
          >
            <AddIcon />
          </Fab>
        </Zoom>
      )}
    </Box>
  );
};

export default Layout;