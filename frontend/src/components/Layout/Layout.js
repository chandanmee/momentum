import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Toolbar } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';

const drawerWidth = 260; // Match the sidebar width

const Layout = ({ children }) => {
  const { sidebarOpen } = useSelector((state) => state.ui);

  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Sidebar />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 2.5, md: 3 }, // Consistent padding
          width: { 
            xs: '100%', // Full width on mobile
            sm: '100%' // Always full width, let flexbox handle the space
          },
          transition: (theme) =>
            theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          backgroundColor: '#f8fafc',
          position: 'relative',
          minHeight: '100vh', // Ensure full height
        }}
      >
        <Toolbar /> {/* This creates space for the fixed header */}
        {children}
      </Box>
    </Box>
  );
};

export default Layout;