import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  DatePicker
} from '@mui/x-date-pickers';
import {
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  differenceInMinutes
} from 'date-fns';

// Redux actions
import { 
  getPunchHistory, 
  updatePunch, 
  deletePunch,
  exportTimeData 
} from '../../store/slices/punchSlice';
import { showNotification } from '../../store/slices/uiSlice';

// Components
import TimeTrackingChart from '../../components/TimeTracking/TimeTrackingChart';
import PunchDetailsDialog from '../../components/TimeTracking/PunchDetailsDialog';
import EditPunchDialog from '../../components/TimeTracking/EditPunchDialog';

const TimeTracking = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();

  // Redux state
  const { user } = useSelector((state) => state.auth);
  const { 
    punchHistory,
    totalCount 
  } = useSelector((state) => state.punch);

  // Local state
  const [currentTab, setCurrentTab] = useState(0);
  const [filters, setFilters] = useState({
    startDate: startOfWeek(new Date()),
    endDate: endOfWeek(new Date()),
    status: 'all',
    searchTerm: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPunch, setSelectedPunch] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch punch history when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(getPunchHistory({
          startDate: filters.startDate.toISOString(),
          endDate: filters.endDate.toISOString(),
          page: page + 1,
          limit: rowsPerPage,
          search: filters.searchTerm,
          status: filters.status !== 'all' ? filters.status : undefined
        }));
      } catch (error) {
        console.error('Failed to fetch punch history:', error);
      }
    };

    fetchData();
  }, [dispatch, filters, page, rowsPerPage]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    
    // Update date filters based on tab
    const now = new Date();
    let startDate, endDate;
    
    switch (newValue) {
      case 0: // This Week
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 1: // This Month
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 2: // Custom
        return; // Don't update filters for custom
      default:
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
    }
    
    setFilters(prev => ({ ...prev, startDate, endDate }));
    setPage(0);
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  // Handle pagination
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle punch actions
  const handleViewPunch = (punch) => {
    setSelectedPunch(punch);
    setDetailsDialogOpen(true);
  };

  const handleEditPunch = (punch) => {
    setSelectedPunch(punch);
    setEditDialogOpen(true);
  };

  const handleDeletePunch = (punch) => {
    setSelectedPunch(punch);
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePunch = async () => {
    if (!selectedPunch) return;
    
    try {
      await dispatch(deletePunch(selectedPunch.id)).unwrap();
      
      dispatch(showNotification({
        type: 'success',
        title: 'Punch Deleted',
        message: 'The punch record has been deleted successfully'
      }));
      
      setDeleteConfirmOpen(false);
      setSelectedPunch(null);
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Failed to delete punch record'
      }));
    }
  };

  // Handle export
  const handleExport = async (format = 'csv') => {
    setExportLoading(true);
    
    try {
      const result = await dispatch(exportTimeData({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        format,
        userId: user.id
      })).unwrap();
      
      // Create download link
      const blob = new Blob([result.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `time-tracking-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      dispatch(showNotification({
        type: 'success',
        title: 'Export Complete',
        message: `Time tracking data exported as ${format.toUpperCase()}`
      }));
    } catch (error) {
      dispatch(showNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.message || 'Failed to export time tracking data'
      }));
    } finally {
      setExportLoading(false);
    }
  };



  // Calculate session duration
  const calculateSessionDuration = (punch) => {
    if (!punch.punch_in_time) return 'N/A';
    
    const startTime = parseISO(punch.punch_in_time);
    const endTime = punch.punch_out_time ? parseISO(punch.punch_out_time) : new Date();
    
    let totalMinutes = differenceInMinutes(endTime, startTime);
    
    // Subtract break time if any
    if (punch.break_start_time && punch.break_end_time) {
      const breakStart = parseISO(punch.break_start_time);
      const breakEnd = parseISO(punch.break_end_time);
      totalMinutes -= differenceInMinutes(breakEnd, breakStart);
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Calculate total hours for current filter period
  const calculateTotalHours = () => {
    if (!punchHistory || punchHistory.length === 0) return 0;
    
    let totalMinutes = 0;
    
    punchHistory.forEach(punch => {
      if (punch.punch_in_time && punch.punch_out_time) {
        const start = parseISO(punch.punch_in_time);
        const end = parseISO(punch.punch_out_time);
        totalMinutes += differenceInMinutes(end, start);
        
        // Subtract break time
        if (punch.break_start_time && punch.break_end_time) {
          const breakStart = parseISO(punch.break_start_time);
          const breakEnd = parseISO(punch.break_end_time);
          totalMinutes -= differenceInMinutes(breakEnd, breakStart);
        }
      }
    });
    
    return totalMinutes / 60; // Convert to hours
  };

  const totalHours = calculateTotalHours();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Time Tracking
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your time tracking records
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimeIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h4" component="div">
                {totalHours.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalendarIcon sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h4" component="div">
                {punchHistory?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.info.main, mb: 1 }} />
              <Typography variant="h4" component="div">
                {punchHistory?.length > 0 ? (totalHours / punchHistory.length).toFixed(1) : '0.0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Hours/Session
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h4" component="div">
                {format(new Date(), 'MMM d')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Date
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Time Period Tabs */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{ mb: 3 }}
          >
            <Tab label="This Week" />
            <Tab label="This Month" />
            <Tab label="Custom Range" />
          </Tabs>

          {/* Filters */}
          <Grid container spacing={2} alignItems="center">
            {currentTab === 2 && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="complete">Complete</MenuItem>
                  <MenuItem value="incomplete">Incomplete</MenuItem>
                  <MenuItem value="on_break">On Break</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Search notes..."
              />
            </Grid>
            
            <Grid item xs={12} md={"auto"}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                size="small"
              >
                Export CSV
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Time Tracking Overview
          </Typography>
          <TimeTrackingChart 
            data={punchHistory}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </CardContent>
      </Card>

      {/* Punch History Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Punch History
          </Typography>
          
          {punchHistory && punchHistory.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Punch In</TableCell>
                      <TableCell>Punch Out</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {punchHistory.map((punch) => {
                      const isComplete = punch.punch_in_time && punch.punch_out_time;
                      const isOnBreak = punch.break_start_time && !punch.break_end_time;
                      
                      return (
                        <TableRow key={punch.id}>
                          <TableCell>
                            {punch.punch_in_time ? 
                              format(parseISO(punch.punch_in_time), 'MMM d, yyyy') : 
                              'N/A'
                            }
                          </TableCell>
                          
                          <TableCell>
                            {punch.punch_in_time ? 
                              format(parseISO(punch.punch_in_time), 'h:mm a') : 
                              'N/A'
                            }
                          </TableCell>
                          
                          <TableCell>
                            {punch.punch_out_time ? 
                              format(parseISO(punch.punch_out_time), 'h:mm a') : 
                              <Chip label="Active" color="success" size="small" />
                            }
                          </TableCell>
                          
                          <TableCell>
                            {calculateSessionDuration(punch)}
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={
                                isOnBreak ? 'On Break' :
                                isComplete ? 'Complete' : 'Active'
                              }
                              color={
                                isOnBreak ? 'warning' :
                                isComplete ? 'default' : 'success'
                              }
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell>
                            {punch.location ? (
                              <Tooltip title={`${punch.location.latitude}, ${punch.location.longitude}`}>
                                <LocationIcon color="action" />
                              </Tooltip>
                            ) : (
                              <span>N/A</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewPunch(punch)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Edit">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditPunch(punch)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeletePunch(punch)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                component="div"
                count={totalCount || 0}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          ) : (
            <Alert severity="info">
              No punch records found for the selected period.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PunchDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        punch={selectedPunch}
      />
      
      <EditPunchDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        punch={selectedPunch}
        onSave={(updatedPunch) => {
          dispatch(updatePunch(updatedPunch));
          setEditDialogOpen(false);
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this punch record? This action cannot be undone.
          </Typography>
          {selectedPunch && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Date:</strong> {selectedPunch.punch_in_time ? 
                  format(parseISO(selectedPunch.punch_in_time), 'MMM d, yyyy h:mm a') : 
                  'N/A'
                }
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {calculateSessionDuration(selectedPunch)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeletePunch} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeTracking;