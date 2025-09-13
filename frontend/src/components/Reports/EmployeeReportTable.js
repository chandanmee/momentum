import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Skeleton,
  Alert,
  useTheme
} from '@mui/material';
import {
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NeutralIcon,
  Schedule as ScheduleIcon,
  Coffee as BreakIcon,
  Work as WorkIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

const EmployeeReportTable = ({ 
  data = [], 
  loading = false, 
  page = 0, 
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onViewDetails
}) => {
  const theme = useTheme();
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('totalHours');

  // Table columns configuration
  const columns = [
    {
      id: 'employee',
      label: 'Employee',
      sortable: true,
      minWidth: 200,
      align: 'left'
    },
    {
      id: 'department',
      label: 'Department',
      sortable: true,
      minWidth: 120,
      align: 'left'
    },
    {
      id: 'totalHours',
      label: 'Total Hours',
      sortable: true,
      minWidth: 120,
      align: 'right'
    },
    {
      id: 'workHours',
      label: 'Work Hours',
      sortable: true,
      minWidth: 120,
      align: 'right'
    },
    {
      id: 'breakHours',
      label: 'Break Hours',
      sortable: true,
      minWidth: 120,
      align: 'right'
    },
    {
      id: 'overtimeHours',
      label: 'Overtime',
      sortable: true,
      minWidth: 100,
      align: 'right'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      sortable: true,
      minWidth: 120,
      align: 'center'
    },
    {
      id: 'productivity',
      label: 'Productivity',
      sortable: true,
      minWidth: 130,
      align: 'center'
    },
    {
      id: 'trend',
      label: 'Trend',
      sortable: false,
      minWidth: 80,
      align: 'center'
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      minWidth: 80,
      align: 'center'
    }
  ];

  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort comparator
  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (orderBy === 'employee') {
      return b.name.localeCompare(a.name);
    }
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  // Sort and paginate data
  const sortedData = React.useMemo(() => {
    return [...data].sort(getComparator(order, orderBy));
  }, [data, order, orderBy]);

  const paginatedData = React.useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

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

  // Get attendance status
  const getAttendanceStatus = (rate) => {
    if (rate >= 95) return { color: 'success', label: 'Excellent' };
    if (rate >= 85) return { color: 'primary', label: 'Good' };
    if (rate >= 75) return { color: 'warning', label: 'Fair' };
    return { color: 'error', label: 'Poor' };
  };

  // Get productivity status
  const getProductivityStatus = (score) => {
    if (score >= 90) return { color: 'success', label: 'High' };
    if (score >= 75) return { color: 'primary', label: 'Good' };
    if (score >= 60) return { color: 'warning', label: 'Average' };
    return { color: 'error', label: 'Low' };
  };

  // Get trend icon and color
  const getTrendIndicator = (trend) => {
    if (!trend || trend === 0) {
      return { icon: <NeutralIcon />, color: 'default', tooltip: 'No change' };
    }
    
    if (trend > 0) {
      return { 
        icon: <TrendingUpIcon />, 
        color: 'success', 
        tooltip: `+${trend.toFixed(1)}% increase` 
      };
    }
    
    return { 
      icon: <TrendingDownIcon />, 
      color: 'error', 
      tooltip: `${trend.toFixed(1)}% decrease` 
    };
  };

  // Get employee avatar
  const getEmployeeAvatar = (employee) => {
    if (employee.avatar) {
      return (
        <Avatar 
          src={employee.avatar} 
          alt={employee.name}
          sx={{ width: 40, height: 40 }}
        />
      );
    }
    
    const initials = employee.name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
        {initials}
      </Avatar>
    );
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={index}>
        {columns.map((column) => (
          <TableCell key={column.id} align={column.align}>
            <Skeleton variant="text" width="100%" />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  // Empty state
  const renderEmptyState = () => {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <WorkIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              No employee data available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Employee reports will appear here once data is available for the selected period.
            </Typography>
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                      {orderBy === column.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {loading ? (
              renderLoadingSkeleton()
            ) : paginatedData.length === 0 ? (
              renderEmptyState()
            ) : (
              paginatedData.map((employee) => {
                const attendanceStatus = getAttendanceStatus(employee.attendance || 0);
                const productivityStatus = getProductivityStatus(employee.productivity || 0);
                const trendIndicator = getTrendIndicator(employee.trend);
                
                return (
                  <TableRow key={employee.id} hover>
                    {/* Employee */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getEmployeeAvatar(employee)}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.email}
                          </Typography>
                          {employee.isTopPerformer && (
                            <Chip
                              icon={<StarIcon />}
                              label="Top Performer"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    
                    {/* Department */}
                    <TableCell>
                      <Chip
                        label={employee.department || 'N/A'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    {/* Total Hours */}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatDuration(employee.totalHours || 0)}
                      </Typography>
                    </TableCell>
                    
                    {/* Work Hours */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatDuration(employee.workHours || 0)}
                      </Typography>
                    </TableCell>
                    
                    {/* Break Hours */}
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatDuration(employee.breakHours || 0)}
                      </Typography>
                    </TableCell>
                    
                    {/* Overtime Hours */}
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={employee.overtimeHours > 0 ? 'warning.main' : 'text.primary'}
                      >
                        {formatDuration(employee.overtimeHours || 0)}
                      </Typography>
                    </TableCell>
                    
                    {/* Attendance */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {(employee.attendance || 0).toFixed(1)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={employee.attendance || 0}
                          color={attendanceStatus.color}
                          sx={{ width: 60, height: 4 }}
                        />
                        <Chip
                          label={attendanceStatus.label}
                          size="small"
                          color={attendanceStatus.color}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    
                    {/* Productivity */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {(employee.productivity || 0).toFixed(0)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={employee.productivity || 0}
                          color={productivityStatus.color}
                          sx={{ width: 60, height: 4 }}
                        />
                        <Chip
                          label={productivityStatus.label}
                          size="small"
                          color={productivityStatus.color}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    
                    {/* Trend */}
                    <TableCell align="center">
                      <Tooltip title={trendIndicator.tooltip}>
                        <IconButton 
                          size="small" 
                          color={trendIndicator.color}
                          sx={{ 
                            bgcolor: `${trendIndicator.color}.light`,
                            '&:hover': {
                              bgcolor: `${trendIndicator.color}.main`,
                              color: 'white'
                            }
                          }}
                        >
                          {trendIndicator.icon}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => onViewDetails && onViewDetails(employee)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      {!loading && data.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </Paper>
  );
};

export default EmployeeReportTable;