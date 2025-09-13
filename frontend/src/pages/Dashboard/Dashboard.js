import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationsIcon,
  Assessment as ReportsIcon,
  AdminPanelSettings as AdminIcon,
  PlayArrow as PunchInIcon,
  Stop as PunchOutIcon,
  Pause as BreakIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, differenceInHours, parseISO } from 'date-fns';

// Redux actions
import { getPunchStatus, getPunchHistory } from '../../store/slices/punchSlice';
import { getDashboardData } from '../../store/slices/reportSlice';
import { showNotification } from '../../store/slices/uiSlice';

// Components
import WeeklyHoursChart from '../../components/Dashboard/WeeklyHoursChart';
import RecentActivityList from '../../components/Dashboard/RecentActivityList';
import StatusCard from '../../components/Dashboard/StatusCard';
import MapboxMap from '../../components/UI/MapboxMap';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    currentPunch, 
    recentPunches, 
    isLoading: punchLoading 
  } = useSelector((state) => state.punch);
  const {
    dashboardData: stats,
    loading: statsLoading,
    error: statsError
  } = useSelector((state) => state.report);
  const { isOnline } = useSelector((state) => state.ui);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          dispatch(getPunchStatus()),
          dispatch(getPunchHistory({ limit: 10 })),
          dispatch(getDashboardData())
        ]);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchData();
  }, [dispatch]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(getPunchStatus()),
        dispatch(getPunchHistory({ limit: 10 })),
        dispatch(getDashboardData())
      ]);
      
      dispatch(showNotification({
        type: 'success',
        title: 'Dashboard Updated',
        message: 'Dashboard data has been refreshed'
      }));
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh dashboard data'
      }));
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate current work session duration
  const getCurrentSessionDuration = () => {
    if (!currentPunch || currentPunch.punch_out_time) {
      return null;
    }

    const startTime = parseISO(currentPunch.punch_in_time);
    const now = new Date();
    const duration = differenceInHours(now, startTime, { includeSeconds: true });
    
    return {
      hours: Math.floor(duration),
      minutes: Math.floor((duration % 1) * 60),
      seconds: Math.floor(((duration % 1) * 60 % 1) * 60)
    };
  };

  // Get current status
  const getCurrentStatus = () => {
    if (!currentPunch || currentPunch.punch_out_time) {
      return {
        status: 'clocked_out',
        label: 'Clocked Out',
        color: 'default',
        icon: <PunchOutIcon />
      };
    }

    if (currentPunch.break_start_time && !currentPunch.break_end_time) {
      return {
        status: 'on_break',
        label: 'On Break',
        color: 'warning',
        icon: <BreakIcon />
      };
    }

    return {
      status: 'clocked_in',
      label: 'Clocked In',
      color: 'success',
      icon: <PunchInIcon />
    };
  };

  const currentStatus = getCurrentStatus();
  const sessionDuration = getCurrentSessionDuration();

  // Quick action cards for different user roles
  const getQuickActions = () => {
    const baseActions = [
      {
        title: 'Punch Clock',
        description: 'Clock in/out and manage breaks',
        icon: <TimeIcon />,
        color: 'primary',
        path: '/punch'
      },
      {
        title: 'Time History',
        description: 'View your punch history',
        icon: <HistoryIcon />,
        color: 'info',
        path: '/history'
      },
      {
        title: 'Profile',
        description: 'Update your profile settings',
        icon: <Avatar sx={{ width: 24, height: 24 }}>{user?.name?.charAt(0)}</Avatar>,
        color: 'secondary',
        path: '/profile'
      }
    ];

    if (user?.role === 'manager' || user?.role === 'admin') {
      baseActions.push({
        title: 'Reports',
        description: 'View team reports and analytics',
        icon: <ReportsIcon />,
        color: 'success',
        path: '/reports'
      });
    }

    if (user?.role === 'admin') {
      baseActions.push({
        title: 'Administration',
        description: 'Manage users and system settings',
        icon: <AdminIcon />,
        color: 'error',
        path: '/admin'
      });
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

  // Render loading skeleton
  const renderSkeleton = () => (
    <Grid container spacing={3}>
      {[...Array(6)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="text" sx={{ mt: 1 }} />
              <Skeleton variant="text" width="60%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm:ss a')}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isOnline && (
              <Chip
                icon={<WarningIcon />}
                label="Offline"
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
            
            <Tooltip title="Refresh dashboard">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon sx={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Current status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: `${currentStatus.color}.main` }}>
                {currentStatus.icon}
              </Avatar>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                  Current Status: {currentStatus.label}
                </Typography>
                
                {sessionDuration && (
                  <Typography variant="body2" color="text.secondary">
                    Session Duration: {sessionDuration.hours}h {sessionDuration.minutes}m {sessionDuration.seconds}s
                  </Typography>
                )}
                
                {currentPunch && !currentPunch.punch_out_time && (
                  <Typography variant="body2" color="text.secondary">
                    Started at {format(parseISO(currentPunch.punch_in_time), 'h:mm a')}
                  </Typography>
                )}
              </Box>
              
              <Button
                variant="contained"
                color={currentStatus.color}
                onClick={() => navigate('/punch')}
                startIcon={currentStatus.icon}
              >
                Go to Punch Clock
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Error state */}
      {statsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load dashboard data. Please try refreshing the page.
        </Alert>
      )}

      {/* Loading state */}
      {(punchLoading || statsLoading) ? (
        renderSkeleton()
      ) : (
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: `${action.color}.main` }}>
                          {action.icon}
                        </Avatar>
                        <Typography variant="h6" component="div">
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Statistics */}
          {stats && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatusCard
                  title="Today's Hours"
                  value={`${stats.todayHours || 0}h`}
                  icon={<TimeIcon />}
                  color="primary"
                  trend={stats.todayHoursTrend}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatusCard
                  title="This Week"
                  value={`${stats.weekHours || 0}h`}
                  icon={<CalendarIcon />}
                  color="success"
                  trend={stats.weekHoursTrend}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatusCard
                  title="Attendance Rate"
                  value={`${stats.attendanceRate || 0}%`}
                  icon={<CheckIcon />}
                  color="info"
                  trend={stats.attendanceTrend}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatusCard
                  title="Total Punches"
                  value={stats.totalPunches || 0}
                  icon={<TrendingUpIcon />}
                  color="secondary"
                  trend={stats.punchesTrend}
                />
              </Grid>
            </>
          )}

          {/* Weekly Hours Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Hours Overview
                </Typography>
                <WeeklyHoursChart data={stats?.weeklyHours} />
              </CardContent>
            </Card>
          </Grid>

          {/* Location Overview */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Location Overview
                </Typography>
                <MapboxMap
                  height="300px"
                  showGeofences={true}
                  showUserLocation={true}
                  interactive={false}
                />
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/punch')}
                  startIcon={<LocationIcon />}
                >
                  Go to Punch Clock
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <RecentActivityList 
                  activities={recentPunches} 
                  loading={punchLoading}
                />
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/history')}
                  startIcon={<HistoryIcon />}
                >
                  View All History
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Notifications/Alerts */}
          {stats?.alerts && stats.alerts.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notifications & Alerts
                  </Typography>
                  <List>
                    {stats.alerts.map((alert, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemIcon>
                            <NotificationsIcon color={alert.severity || 'info'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={alert.title}
                            secondary={alert.message}
                          />
                        </ListItem>
                        {index < stats.alerts.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;