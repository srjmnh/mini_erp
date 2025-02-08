import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
  Avatar,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SendIcon from '@mui/icons-material/Send';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SickIcon from '@mui/icons-material/Sick';
import { getEmployeeLeaveBalance, LeaveBalance } from '@/services/employeeManagement';
import { getEmployeeManager } from '@/services/employeeManagement';
import { useRequests } from '@/hooks/useRequests';
import { useFirestore } from '@/contexts/FirestoreContext';
import { LeaveStatus } from '@/config/firestore-schema';
import { useSnackbar } from '@/contexts/SnackbarContext';

export const HRTimeOffPage: React.FC = () => {
  const { leaveRequests, loading, updateRequestStatus, submitLeaveRequest } = useRequests();
  const { departments, employees } = useFirestore();
  const { showSnackbar } = useSnackbar();
  
  // State for filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [note, setNote] = useState('');
  
  // State for leave request form
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loadingManager, setLoadingManager] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'casual' as const,
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });

  const handleSubmit = async () => {
    if (!selectedEmployee) return;
    
    try {
      const duration = differenceInDays(leaveForm.endDate, leaveForm.startDate);
      
      if (duration <= 0) {
        showSnackbar('End date must be after start date', 'error');
        return;
      }

      const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);
      if (!selectedEmployeeData) {
        showSnackbar('Selected employee not found', 'error');
        return;
      }

      await submitLeaveRequest({
        employeeId: selectedEmployee,
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        departmentId: selectedEmployeeData.departmentId,
      });

      showSnackbar('Leave request submitted successfully', 'success');
      setLeaveForm({
        type: 'casual',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
      });
      setSelectedEmployee(null);
      setSelectedManager(null);
      setLeaveBalance(null);
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      showSnackbar('Failed to submit leave request', 'error');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterDepartment !== 'all' && request.departmentId !== filterDepartment) return false;
    if (filterType !== 'all' && request.type !== filterType) return false;
    return true;
  });

  const handleStatusUpdate = async (requestId: string, status: LeaveStatus) => {
    try {
      await updateRequestStatus(requestId, status, note);
      showSnackbar('Leave request updated successfully', 'success');
      setNote('');
    } catch (error) {
      showSnackbar('Failed to update leave request', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Submit Leave Request Section */}
      <Box 
        sx={{ 
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '350px 1fr' },
          mb: 4,
        }}
      >
        {/* Left Column - Employee Selection */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: '#ffffff',
            border: '1px solid',
            borderColor: 'grey.200',
            height: 'fit-content'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'grey.800' }}>
            Select Employee
          </Typography>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Employee"
              value={selectedEmployee || ''}
              onChange={async (e) => {
                const empId = e.target.value;
                setSelectedEmployee(empId);
                if (empId) {
                  setLoadingManager(true);
                  try {
                    const [manager, balance] = await Promise.all([
                      getEmployeeManager(empId),
                      getEmployeeLeaveBalance(empId)
                    ]);
                    setSelectedManager(manager);
                    setLeaveBalance(balance);
                  } catch (error) {
                    console.error('Error fetching employee data:', error);
                    showSnackbar('Error fetching employee information', 'error');
                  }
                  setLoadingManager(false);
                } else {
                  setSelectedManager(null);
                  setLeaveBalance(null);
                }
              }}
              required
            >
              <MenuItem value="">
                <em>Select an employee</em>
              </MenuItem>
              {Array.from(new Set(employees.map(emp => emp.department))).sort().map(department => [
                <MenuItem 
                  key={department} 
                  disabled 
                  sx={{ 
                    bgcolor: 'grey.50', 
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px',
                    py: 1,
                    '&.Mui-disabled': {
                      opacity: 1
                    }
                  }}
                >
                  {department || 'Unassigned'}
                </MenuItem>,
                ...employees
                  .filter(emp => emp.department === department)
                  .sort((a, b) => {
                    const nameA = a.fullName || `${a.firstName} ${a.lastName}`;
                    const nameB = b.fullName || `${b.firstName} ${b.lastName}`;
                    return nameA.localeCompare(nameB);
                  })
                  .map(emp => (
                    <MenuItem 
                      key={emp.id} 
                      value={emp.id} 
                      sx={{ 
                        pl: 4,
                        py: 1.5,
                        '&:hover': {
                          bgcolor: 'primary.50'
                        },
                        '&.Mui-selected': {
                          bgcolor: 'primary.50',
                          '&:hover': {
                            bgcolor: 'primary.100'
                          }
                        }
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" width="100%">
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            fontSize: '0.9rem',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 500
                          }}
                        >
                          {(emp.fullName || `${emp.firstName} ${emp.lastName}`).split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Typography>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))
              ])}
            </TextField>
          </Box>
        </Paper>

        {/* Right Column - Leave Form */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            background: '#ffffff',
            border: '1px solid',
            borderColor: 'grey.200',
            display: selectedEmployee ? 'block' : 'none'
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'grey.800', mb: 3 }}>
            Leave Request Details
          </Typography>

          {/* Leave Balance Cards */}
          {leaveBalance && (
            <Box sx={{ mb: 4, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'primary.50',
                  border: '1px solid',
                  borderColor: 'primary.100',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 40,
                    height: 40
                  }}
                >
                  <EventAvailableIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="primary.main" fontWeight={500}>
                    Casual Leave Balance
                  </Typography>
                  <Typography variant="h6" color="primary.dark" fontWeight={600}>
                    {leaveBalance.casualLeaves} days
                  </Typography>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'success.50',
                  border: '1px solid',
                  borderColor: 'success.100',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'success.main',
                    width: 40,
                    height: 40
                  }}
                >
                  <SickIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="success.main" fontWeight={500}>
                    Sick Leave Balance
                  </Typography>
                  <Typography variant="h6" color="success.dark" fontWeight={600}>
                    {leaveBalance.sickLeaves === 999999 ? '∞' : leaveBalance.sickLeaves} days
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

          {selectedManager && (
            <Box sx={{ 
              mb: 4, 
              p: 3.5, 
              bgcolor: 'primary.50', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'primary.100',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                bgcolor: 'primary.main',
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8
              }
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={selectedManager.photoUrl}
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    bgcolor: 'primary.dark',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    border: '2px solid',
                    borderColor: 'primary.main'
                  }}
                >
                  {(selectedManager.fullName || `${selectedManager.firstName} ${selectedManager.lastName}`).split(' ').map(n => n[0]).join('')}
                </Avatar>
                <Box>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'primary.dark',
                      mb: 0.5
                    }}
                  >
                    {selectedManager.fullName || `${selectedManager.firstName} ${selectedManager.lastName}`}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '& svg': {
                        fontSize: '1rem'
                      }
                    }}
                  >
                    <BusinessIcon />
                    Manager • {selectedManager.department}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}

          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as 'casual' | 'sick' })}
                label="Leave Type"
              >
                <MenuItem value="casual">Casual Leave</MenuItem>
                <MenuItem value="sick">Sick Leave</MenuItem>
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={leaveForm.startDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setLeaveForm({ ...leaveForm, startDate: newValue });
                    }
                  }}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={leaveForm.endDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setLeaveForm({ ...leaveForm, endDate: newValue });
                    }
                  }}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Stack>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'primary.200' },
                  '&:hover fieldset': { borderColor: 'primary.300' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.500' },
                },
              }}
            />

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={!selectedEmployee || !leaveForm.reason}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                {loadingManager ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <>
                    <SendIcon sx={{ fontSize: '1.2rem' }} />
                    Submit Request
                  </>
                )}
              </Stack>
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Typography variant="h5" gutterBottom>Leave Management</Typography>
      
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Department"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <MenuItem value="all">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Leave Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="casual">Casual Leave</MenuItem>
            <MenuItem value="sick">Sick Leave</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pending Requests</Typography>
              <Typography variant="h3">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Approved This Month</Typography>
              <Typography variant="h3">
                {leaveRequests.filter(r => {
                  if (!r.createdAt) return false;
                  const createdDate = r.createdAt instanceof Date ? r.createdAt : r.createdAt.toDate();
                  const isThisMonth = createdDate.getMonth() === new Date().getMonth();
                  return r.status === 'approved' && isThisMonth;
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Requests</Typography>
              <Typography variant="h3">{leaveRequests.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leave Requests */}
      <Stack spacing={2}>
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon />
                    <Box>
                      <Typography variant="subtitle1">
                        {request.employeeId}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {request.type} Leave
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BusinessIcon />
                    <Typography>
                      {departments.find(d => d.id === request.departmentId)?.name || 'Unknown'}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Stack>
                    <Typography variant="body2">
                      {request.startDate && format(new Date(request.startDate instanceof Date ? request.startDate : request.startDate.toDate()), 'MMM dd, yyyy')} - 
                      {request.endDate && format(new Date(request.endDate instanceof Date ? request.endDate : request.endDate.toDate()), 'MMM dd, yyyy')}
                    </Typography>
                    <Chip
                      size="small"
                      label={request.status}
                      color={
                        request.status === 'approved' ? 'success' :
                        request.status === 'rejected' ? 'error' :
                        'warning'
                      }
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={2}>
                  {request.status === 'pending' && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Approve">
                        <IconButton
                          color="success"
                          onClick={() => handleStatusUpdate(request.id, 'approved')}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          color="error"
                          onClick={() => handleStatusUpdate(request.id, 'rejected')}
                        >
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};
