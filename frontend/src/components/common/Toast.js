import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide,
} from '@mui/material';
import { removeNotification } from '../../store/slices/uiSlice';

const SlideTransition = (props) => {
  return <Slide {...props} direction="up" />;
};

const Toast = () => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.ui);

  const handleClose = (event, reason, notificationId) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(removeNotification(notificationId));
  };

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 6000}
          onClose={(event, reason) => handleClose(event, reason, notification.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbar-root': {
              position: 'fixed',
            },
          }}
        >
          <Alert
            onClose={(event) => handleClose(event, 'close', notification.id)}
            severity={notification.type || 'info'}
            variant="filled"
            sx={{
              width: '100%',
              minWidth: 300,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '& .MuiAlert-message': {
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              },
            }}
          >
            {notification.title && (
              <AlertTitle sx={{ mb: 0 }}>{notification.title}</AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default Toast;