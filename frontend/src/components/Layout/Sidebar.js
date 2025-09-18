import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  useTheme,
  alpha,
  Avatar,
  Skeleton,
} from '@mui/material';
import {
  Dashboard,
  AccessTime,
  Assessment,
  People,
  Settings,
  Business,
  Schedule,
  Person as PersonIcon,
} from '@mui/icons-material';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { clearError } from '../../store/slices/authSlice';
import { getInitials } from '../../utils/helpers';

const drawerWidth = 260;

const menuItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/dashboard',
    roles: ['admin', 'manager', 'employee'],
  },
  {
    text: 'Punch Clock',
    icon: <AccessTime />,
    path: '/punch',
    roles: ['admin', 'manager', 'employee'],
  },
  {
    text: 'Time Tracking',
    icon: <Schedule />,
    path: '/timesheet',
    roles: ['admin', 'manager', 'employee'],
  },
  {
    text: 'Reports',
    icon: <Assessment />,
    path: '/reports',
    roles: ['admin', 'manager'],
  },
  {
    text: 'Employees',
    icon: <People />,
    path: '/employees',
    roles: ['admin', 'manager'],
  },
  {
    text: 'Departments',
    icon: <Business />,
    path: '/departments',
    roles: ['admin'],
  },
  {
    text: 'Settings',
    icon: <Settings />,
    path: '/settings',
    roles: ['admin', 'manager', 'employee'],
  },
];

const Sidebar = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { user, isLoading, error } = useSelector((state) => state.auth);

  const handleNavigation = (path) => {
    navigate(path);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth < theme.breakpoints.values.sm) {
      dispatch(toggleSidebar());
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Clear any auth errors when component mounts
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [dispatch, error]);

  const hasAccess = (roles) => {
    // During loading, show all items to prevent flickering
    if (isLoading) return true;
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  const filteredMenuItems = menuItems.filter(item => hasAccess(item.roles));

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      color: 'white',
      position: 'relative',
    }}>
      <Toolbar sx={{ 
        background: alpha(theme.palette.common.white, 0.08),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.15)}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <AccessTime sx={{ 
            mr: 2, 
            color: 'white',
            fontSize: 28,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }} />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              color: 'white',
              fontWeight: 600,
              fontSize: '1.25rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          >
            Momentum
          </Typography>
        </Box>
      </Toolbar>
      
      <Divider sx={{ 
        borderColor: alpha(theme.palette.common.white, 0.15),
        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.1)}`
      }} />
      
      <List sx={{ flex: 1, py: 1 }}>
        {filteredMenuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                mx: 1,
                borderRadius: 2,
                minHeight: 48,
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                overflow: 'hidden',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.common.white, 0.12),
                  color: 'white',
                  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                    transform: 'scale(1.05)',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '50%',
                    backgroundColor: 'white',
                    borderRadius: '0 2px 2px 0',
                    boxShadow: '0 0 6px rgba(255,255,255,0.4)',
                  }
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.08),
                  '& .MuiListItemIcon-root': {
                    transform: 'scale(1.02)',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'white' : alpha(theme.palette.common.white, 0.85),
                  minWidth: 40,
                  transition: 'all 0.2s ease',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: '0.95rem',
                    color: isActive(item.path) ? 'white' : alpha(theme.palette.common.white, 0.9),
                    textShadow: isActive(item.path) ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ 
        borderColor: alpha(theme.palette.common.white, 0.15),
        boxShadow: `0 -1px 2px ${alpha(theme.palette.common.black, 0.1)}`
      }} />
      
      <Box sx={{ 
        p: 2, 
        background: alpha(theme.palette.common.black, 0.08),
        backdropFilter: 'blur(10px)'
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            color: alpha(theme.palette.common.white, 0.7),
            display: 'block',
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          Momentum v1.0.0
        </Typography>
        
        {/* User Info Section with Loading and Error States */}
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
            <Skeleton 
              variant="circular" 
              width={24} 
              height={24} 
              sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), mr: 1 }} 
            />
            <Skeleton 
              variant="text" 
              width={120} 
              sx={{ bgcolor: alpha(theme.palette.common.white, 0.2) }} 
            />
          </Box>
        ) : user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.75rem',
                bgcolor: alpha(theme.palette.common.white, 0.2),
                color: 'white',
                mr: 1,
                border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`
              }}
            >
              {getInitials(user.name)}
            </Avatar>
            <Typography 
              variant="caption" 
              sx={{ 
                color: alpha(theme.palette.common.white, 0.8),
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {user.name} • {user.role}
            </Typography>
          </Box>
        ) : error ? (
          <Typography 
            variant="caption" 
            sx={{ 
              color: alpha(theme.palette.error.light, 0.8),
              display: 'block',
              textAlign: 'center',
              fontWeight: 500,
              mt: 0.5
            }}
          >
            <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Authentication Error
          </Typography>
        ) : (
          <Typography 
            variant="caption" 
            sx={{ 
              color: alpha(theme.palette.common.white, 0.6),
              display: 'block',
              textAlign: 'center',
              fontWeight: 500,
              mt: 0.5
            }}
          >
            <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Not Authenticated
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => dispatch(toggleSidebar())}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            boxShadow: theme.shadows[8],
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            boxShadow: theme.shadows[4],
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;