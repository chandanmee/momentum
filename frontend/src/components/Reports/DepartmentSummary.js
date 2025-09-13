import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Divider,
  Grid,
  Skeleton,
  useTheme
} from '@mui/material';
import {
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const DepartmentSummary = ({ data = [], loading = false }) => {
  const theme = useTheme();
  const [expandedDept, setExpandedDept] = useState(null);

  // Handle department expansion
  const handleExpand = (deptId) => {
    setExpandedDept(expandedDept === deptId ? null : deptId);
  };

  // Format duration
  const formatDuration = (hours) => {
    if (!hours || hours < 0) return '0h';
    
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
  };

  // Get department color
  const getDepartmentColor = (department) => {
    const colors = {
      'Engineering': theme.palette.primary.main,
      'Sales': theme.palette.success.main,
      'Marketing': theme.palette.warning.main,
      'HR': theme.palette.info.main,
      'Finance': theme.palette.secondary.main,
      'Operations': theme.palette.error.main
    };
    
    return colors[department] || theme.palette.grey[500];
  };

  // Get performance status
  const getPerformanceStatus = (score) => {
    if (score >= 90) return { color: 'success', label: 'Excellent', icon: <StarIcon /> };
    if (score >= 80) return { color: 'primary', label: 'Good', icon: <TrendingUpIcon /> };
    if (score >= 70) return { color: 'warning', label: 'Average', icon: <AssessmentIcon /> };
    return { color: 'error', label: 'Needs Improvement', icon: <WarningIcon /> };
  };

  // Calculate department rankings
  const rankedDepartments = React.useMemo(() => {
    return [...data]
      .sort((a, b) => (b.productivity || 0) - (a.productivity || 0))
      .map((dept, index) => ({ ...dept, rank: index + 1 }));
  }, [data]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, dept) => ({
        employees: acc.employees + (dept.employees || 0),
        workHours: acc.workHours + (dept.workHours || 0),
        productivity: acc.productivity + (dept.productivity || 0)
      }),
      { employees: 0, workHours: 0, productivity: 0 }
    );
  }, [data]);

  const avgProductivity = data.length > 0 ? totals.productivity / data.length : 0;

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <ListItem key={index}>
        <ListItemAvatar>
          <Skeleton variant="circular" width={40} height={40} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant="text" width="60%" />}
          secondary={<Skeleton variant="text" width="40%" />}
        />
      </ListItem>
    ));
  };

  // Empty state
  const renderEmptyState = () => {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        py: 4,
        color: 'text.secondary'
      }}>
        <BusinessIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Department Data
        </Typography>
        <Typography variant="body2" textAlign="center">
          Department analytics will appear here once data is available.
        </Typography>
      </Box>
    );
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h6">
            Department Summary
          </Typography>
        </Box>

        {/* Overall Stats */}
        {!loading && data.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main">
                  {totals.employees}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Employees
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="success.main">
                  {formatDuration(totals.workHours)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Hours
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="info.main">
                  {avgProductivity.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg Productivity
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Department List */}
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            renderLoadingSkeleton()
          ) : data.length === 0 ? (
            renderEmptyState()
          ) : (
            rankedDepartments.map((department) => {
              const performanceStatus = getPerformanceStatus(department.productivity || 0);
              const isExpanded = expandedDept === department.id;
              
              return (
                <React.Fragment key={department.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: isExpanded ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => handleExpand(department.id)}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: getDepartmentColor(department.name),
                          width: 40,
                          height: 40
                        }}
                      >
                        <BusinessIcon />
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {department.name}
                          </Typography>
                          
                          {department.rank === 1 && (
                            <Chip
                              icon={<StarIcon />}
                              label="#1"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                          
                          <Chip
                            icon={performanceStatus.icon}
                            label={performanceStatus.label}
                            size="small"
                            color={performanceStatus.color}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {department.employees || 0} employees • {formatDuration(department.workHours || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(department.productivity || 0).toFixed(1)}%
                            </Typography>
                          </Box>
                          
                          <LinearProgress
                            variant="determinate"
                            value={department.productivity || 0}
                            color={performanceStatus.color}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      }
                    />
                    
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItem>
                  
                  {/* Expanded Details */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Active Employees
                            </Typography>
                          </Box>
                          <Typography variant="h6">
                            {department.employees || 0}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Average Hours
                            </Typography>
                          </Box>
                          <Typography variant="h6">
                            {department.employees > 0 ? 
                              formatDuration((department.workHours || 0) / department.employees) : 
                              '0h'
                            }
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <AssessmentIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Attendance Rate
                            </Typography>
                          </Box>
                          <Typography variant="h6">
                            {(department.attendance || 0).toFixed(1)}%
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TrendingUpIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Overtime Hours
                            </Typography>
                          </Box>
                          <Typography variant="h6">
                            {formatDuration(department.overtimeHours || 0)}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {/* Department Insights */}
                      {department.insights && department.insights.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Key Insights:
                          </Typography>
                          {department.insights.map((insight, index) => (
                            <Typography key={index} variant="caption" display="block" sx={{ mb: 0.5 }}>
                              • {insight}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      
                      {/* Top Performers */}
                      {department.topPerformers && department.topPerformers.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Top Performers:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {department.topPerformers.slice(0, 3).map((performer, index) => (
                              <Chip
                                key={index}
                                label={performer.name}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </React.Fragment>
              );
            })
          )}
        </List>

        {/* Department Comparison */}
        {!loading && data.length > 1 && (
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Department Rankings (by Productivity)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {rankedDepartments.slice(0, 3).map((dept, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <Chip
                    key={dept.id}
                    label={`${medals[index]} ${dept.name} (${(dept.productivity || 0).toFixed(1)}%)`}
                    size="small"
                    color={index === 0 ? 'warning' : index === 1 ? 'default' : 'default'}
                    variant={index === 0 ? 'filled' : 'outlined'}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DepartmentSummary;