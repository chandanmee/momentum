import React from 'react';
import {
  Menu,
  Typography,
  Box,
  Divider,
  IconButton,
  Chip,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Fade
} from '@mui/material';
import {
  Clear as ClearIcon,
  NotificationsNone as NoNotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Delete as DeleteIcon,
  MarkAsUnread as MarkAsUnreadIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = ({ 
  anchorEl, 
  open, 
  onClose, 
  notifications = [], 
  onClear,
  onMarkAsRead,
  onDelete
}) => {
  // Get notification icon based on type
  const getNotificationIcon = (type, severity = 'info') => {
    const iconProps = { fontSize: 'small' };
    
    switch (type) {
      case 'punch':
        return <TimeIcon {...iconProps} />;
      case 'admin':
        return <AdminIcon {...iconProps} />;
      case 'user':
        return <PersonIcon {...iconProps} />;
      case 'system':
        switch (severity) {
          case 'error':
            return <ErrorIcon {...iconProps} />;
          case 'warning':
            return <WarningIcon {...iconProps} />;
          case 'success':
            return <SuccessIcon {...iconProps} />;
          default:
            return <InfoIcon {...iconProps} />;
        }
      default:
        return <InfoIcon {...iconProps} />;
    }
  };

  // Get notification color based on type and severity
  const getNotificationColor = (type, severity = 'info') => {
    switch (type) {
      case 'punch':
        return 'primary';
      case 'admin':
        return 'secondary';
      case 'user':
        return 'info';
      case 'system':
        switch (severity) {
          case 'error':
            return 'error';
          case 'warning':
            return 'warning';
          case 'success':
            return 'success';
          default:
            return 'info';
        }
      default:
        return 'info';
    }
  };

  // Handle individual notification actions
  const handleMarkAsRead = (notificationId) => {
    if (onMarkAsRead) {
      onMarkAsRead(notificationId);
    }
  };

  const handleDelete = (notificationId) => {
    if (onDelete) {
      onDelete(notificationId);
    }
  };

  // Format notification time
  const formatNotificationTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 3,
        textAlign: 'center',
        minHeight: 200
      }}
    >
      <NoNotificationsIcon 
        sx={{ 
          fontSize: 48, 
          color: 'text.secondary', 
          mb: 2 
        }} 
      />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No notifications
      </Typography>
      <Typography variant="body2" color="text.secondary">
        You're all caught up!
      </Typography>
    </Box>
  );

  // Render notification item
  const renderNotificationItem = (notification) => {
    const {
      id,
      title,
      message,
      type,
      severity,
      timestamp,
      read = false,
      avatar,
      actions = []
    } = notification;

    return (
      <ListItem
        key={id}
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          py: 2,
          px: 2,
          backgroundColor: read ? 'transparent' : 'action.hover',
          borderLeft: 3,
          borderColor: `${getNotificationColor(type, severity)}.main`,
          '&:hover': {
            backgroundColor: 'action.selected'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
          <ListItemAvatar sx={{ minWidth: 40 }}>
            {avatar ? (
              <Avatar src={avatar} sx={{ width: 32, height: 32 }} />
            ) : (
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: `${getNotificationColor(type, severity)}.main` 
                }}
              >
                {getNotificationIcon(type, severity)}
              </Avatar>
            )}
          </ListItemAvatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: read ? 'normal' : 'bold',
                  flex: 1
                }}
                noWrap
              >
                {title}
              </Typography>
              
              {!read && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'primary.main'
                  }}
                />
              )}
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {message}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {formatNotificationTime(timestamp)}
              </Typography>
              
              <Chip
                label={type}
                size="small"
                color={getNotificationColor(type, severity)}
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
          </Box>
          
          {/* Action buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
            {!read && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(id);
                }}
                title="Mark as read"
              >
                <MarkAsUnreadIcon fontSize="small" />
              </IconButton>
            )}
            
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(id);
              }}
              title="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {/* Custom actions */}
        {actions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                variant={action.variant || 'outlined'}
                color={action.color || 'primary'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (action.onClick) {
                    action.onClick(notification);
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </ListItem>
    );
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '90vw',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      TransitionComponent={Fade}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Notifications
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {notifications.length > 0 && (
            <Chip
              label={notifications.filter(n => !n.read).length}
              size="small"
              color="primary"
              variant="filled"
            />
          )}
          
          {notifications.length > 0 && onClear && (
            <IconButton
              size="small"
              onClick={onClear}
              title="Clear all"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      
      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <List sx={{ py: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                {renderNotificationItem(notification)}
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
      
      {/* Footer */}
      {notifications.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }}
        >
          <Button
            size="small"
            onClick={() => {
              // Navigate to full notifications page
              onClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      )}
    </Menu>
  );
};

export default NotificationPanel;