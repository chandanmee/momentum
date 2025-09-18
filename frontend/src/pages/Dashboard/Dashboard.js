import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AccessTime,
  TrendingUp,
  People,
  Assignment,
  PlayArrow,
  Stop,
  Refresh,
  Schedule,
  CheckCircle,
  Person,
  Business,
} from '@mui/icons-material';
import { formatDate, calculateDuration, calculateTotalHours } from '../../utils/helpers';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { todaysPunches: punches } = useSelector((state) => state.punch);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockingIn, setIsClockingIn] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Note: Auth status is already checked in App.js, no need to duplicate here

  // Calculate today's stats
  const todayStats = useMemo(() => {
    if (!punches || !Array.isArray(punches)) {
      return {
        totalHours: 0,
        punchCount: 0,
        lastPunch: null,
      };
    }
    
    const today = new Date().toDateString();
    const todayPunches = punches.filter(punch => 
      new Date(punch.timestamp).toDateString() === today
    );
    
    return {
      totalHours: calculateTotalHours(todayPunches),
      punchCount: todayPunches.length,
      lastPunch: todayPunches[todayPunches.length - 1],
    };
  }, [punches]);

  // Handle quick clock action
  const handleQuickClock = useCallback(async () => {
    setIsClockingIn(true);
    try {
      // This would dispatch a punch action
      // await dispatch(createPunch({ type: 'in', timestamp: getCurrentTimestamp() }));
      console.log('Clock action triggered');
    } catch (error) {
      console.error('Clock action failed:', error);
    } finally {
      setIsClockingIn(false);
    }
  }, []);

  // Recent activity data
  const recentActivity = useMemo(() => {
    if (!punches || !Array.isArray(punches)) {
      return [];
    }
    
    return punches
      .slice(-5)
      .reverse()
      .map(punch => ({
        ...punch,
        formattedTime: formatDate(punch.timestamp),
      }));
  }, [punches]);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Welcome Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: { xs: 2, sm: 3 }, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          borderRadius: 2
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Avatar sx={{ 
              width: { xs: 50, sm: 60 }, 
              height: { xs: 50, sm: 60 }, 
              bgcolor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              fontWeight: 600
            }}>
              Welcome back, {user?.firstName || 'User'}!
            </Typography>
            <Typography variant="h6" sx={{ 
              opacity: 0.9,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
            }}>
              {currentTime.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              size="large"
              startIcon={isClockingIn ? <Stop /> : <PlayArrow />}
              onClick={handleQuickClock}
              disabled={isClockingIn}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
            >
              {isClockingIn ? 'Processing...' : 'Quick Clock'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            height: '100%',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontWeight: 500 }}>
                    Today's Hours
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ 
                    fontWeight: 700,
                    color: 'primary.main',
                    fontSize: { xs: '1.75rem', sm: '2.125rem' }
                  }}>
                    {todayStats.totalHours}
                  </Typography>
                </Box>
                <AccessTime color="primary" sx={{ fontSize: { xs: 35, sm: 40 }, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            height: '100%',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontWeight: 500 }}>
                    Punch Count
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ 
                    fontWeight: 700,
                    color: 'success.main',
                    fontSize: { xs: '1.75rem', sm: '2.125rem' }
                  }}>
                    {todayStats.punchCount}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: { xs: 35, sm: 40 }, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            height: '100%',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontWeight: 500 }}>
                    Department
                  </Typography>
                  <Typography variant="h6" component="div" sx={{ 
                    fontWeight: 600,
                    color: 'info.main',
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    {user?.department || 'N/A'}
                  </Typography>
                </Box>
                <People color="info" sx={{ fontSize: { xs: 35, sm: 40 }, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ 
            height: '100%',
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
            }
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontWeight: 500 }}>
                    Status
                  </Typography>
                  <Chip 
                    label={todayStats.lastPunch?.type === 'in' ? 'Clocked In' : 'Clocked Out'}
                    color={todayStats.lastPunch?.type === 'in' ? 'success' : 'default'}
                    variant="filled"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  />
                </Box>
                <Assignment color="warning" sx={{ fontSize: { xs: 35, sm: 40 }, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 1, sm: 2 } }}>
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ 
            borderRadius: 2,
            height: 'fit-content'
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" component="div" sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}>
                  Recent Activity
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Refresh />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recentActivity.length > 0 ? (
                <List>
                  {recentActivity.map((activity, index) => (
                    <ListItem key={index} divider={index < recentActivity.length - 1}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={activity.type.toUpperCase()}
                              size="small"
                              color={activity.type === 'in' ? 'success' : 'error'}
                              variant="outlined"
                            />
                            <Typography variant="body1">
                              {activity.formattedTime}
                            </Typography>
                          </Box>
                        }
                        secondary={activity.location || 'No location data'}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No recent activity
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AccessTime />}
                  onClick={() => console.log('View timesheet')}
                >
                  View Timesheet
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Assignment />}
                  onClick={() => console.log('Generate report')}
                >
                  Generate Report
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  onClick={() => console.log('Team overview')}
                >
                  Team Overview
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;