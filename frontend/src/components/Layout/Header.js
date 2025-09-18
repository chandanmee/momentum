import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Skeleton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Settings,
  Person,
} from '@mui/icons-material';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout, clearError } from '../../store/slices/authSlice';
import { getInitials } from '../../utils/helpers';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, error } = useSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await dispatch(logout()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userInitials = user ? getInitials(user.name) : 'U';
  const userName = user ? user.name : 'User';

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'primary.main',
      }}
    >
      <Toolbar sx={{ 
        minHeight: { xs: 56, sm: 64 }, // Responsive toolbar height
        px: { xs: 1, sm: 2 }, // Responsive padding
      }}>
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          edge="start"
          onClick={handleSidebarToggle}
          sx={{ 
            mr: { xs: 1, sm: 2 },
            display: { xs: 'block', sm: 'block' }, // Always show on mobile and desktop
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }, // Responsive font size
            fontWeight: 'bold',
          }}
        >
          Momentum
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {isLoading ? (
            // Show loading skeleton during auth rehydration
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton 
                variant="text" 
                width={100} 
                height={20}
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  bgcolor: 'rgba(255,255,255,0.2)'
                }}
              />
              <Skeleton 
                variant="circular" 
                width={{ xs: 32, sm: 40 }} 
                height={{ xs: 32, sm: 40 }}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              />
            </Box>
          ) : user ? (
            <>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: { xs: 'none', sm: 'block' }, // Hide on mobile to save space
                  mr: 1,
                  color: 'inherit',
                }}
              >
                Welcome, {user.firstName || user.name}
              </Typography>
              
              <IconButton
                onClick={handleMenuClick}
                size="small"
                sx={{ 
                  ml: { xs: 0, sm: 1 },
                  p: { xs: 0.5, sm: 1 }, // Responsive padding
                }}
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar 
                  sx={{ 
                    width: { xs: 32, sm: 40 }, // Responsive avatar size
                    height: { xs: 32, sm: 40 },
                    bgcolor: 'secondary.main',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  }}
                >
                  {userInitials}
                </Avatar>
              </IconButton>
            </>
          ) : null}
        </Box>
      </Toolbar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;