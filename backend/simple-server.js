const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Basic API routes for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Auth endpoints that frontend expects
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    success: true,
    token: 'dummy-token',
    refreshToken: 'dummy-refresh-token',
    user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'employee' }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ 
    success: true,
    user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'employee' }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Dashboard endpoint
app.get('/api/reports/dashboard', (req, res) => {
  res.json({ 
    success: true,
    data: {
      todayStats: {
        total_punches_today: '0',
        total_hours_today: '0',
        invalid_location_punches: '0'
      },
      weeklyTrends: [],
      userRole: 'employee'
    }
  });
});

// Other API endpoints
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/departments', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/geofences', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/punches', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/reports', (req, res) => {
  res.json({ success: true, data: [] });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Simple Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = app;