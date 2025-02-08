import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
  Link,
  IconButton,
  Avatar,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, differenceInDays } from 'date-fns';
import {
  AccessTime as AccessTimeIcon,
  Sick as SickIcon,
  BeachAccess as BeachAccessIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

import { LeaveType, LeaveStatus } from '@/config/firestore-schema';
import { calculateLeaveDuration } from '@/services/leaveManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { getLeaveBalance, uploadMedicalCertificate } from '@/services/leaveManagement';
import { getEmployeeManager } from '@/services/employeeManagement';
import { ApprovedIcon, RejectedIcon } from '@/components/icons';
import { Comment as CommentIcon } from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';

const CASUAL_LEAVE_DEFAULT = 25;

const leaveTypes = [
  { 
    value: 'casual', 
    label: 'Casual Leave',
    icon: <BeachAccessIcon />,
    color: '#4CAF50',
    description: `Personal time off and vacations (${CASUAL_LEAVE_DEFAULT} days per year)`,
    defaultBalance: CASUAL_LEAVE_DEFAULT
  },
  { 
    value: 'sick', 
    label: 'Sick Leave',
    icon: <SickIcon />,
    color: '#F44336',
    description: 'Medical reasons (requires certificate for >3 days)',
    defaultBalance: -1 // -1 indicates unlimited
  },
];

export function TimeOffPage() {
  const { showSnackbar } = useSnackbar();
  const { user, userRole } = useAuth();
  const { employees } = useFirestore();
  
  const {
    leaveRequests,
    loading,
    submitLeaveRequest,
    updateRequestStatus,
  } = useRequests();

  // Filter states for HR view
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Get filtered leave requests
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter(request => {
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      const matchesType = filterType === 'all' || request.type === filterType;
      const matchesDepartment = filterDepartment === 'all' || request.departmentId === filterDepartment;
      return matchesStatus && matchesType && matchesDepartment;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [leaveRequests, filterStatus, filterType, filterDepartment]);

  const [leaveForm, setLeaveForm] = useState({
    type: 'casual' as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
    medicalCertificate: null as File | null,
  });

  const needsMedicalCertificate = leaveForm.type === 'sick' && 
    differenceInDays(leaveForm.endDate, leaveForm.startDate) > 3;

  const [leaveBalance, setLeaveBalance] = useState<{
    casual: number;
    sick: number;
    year: number;
    used: {
      casual: number;
      sick: number;
    };
  } | null>(null);

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingManager, setLoadingManager] = useState(true);
  const [manager, setManager] = useState<{
    name: string;
    position: string;
    photoUrl?: string;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const targetUid = selectedEmployee || user.uid;
        
        // Load leave balance
        setLoadingBalance(true);
        const balance = await getLeaveBalance(targetUid);
        setLeaveBalance({
          casual: balance?.casual ?? CASUAL_LEAVE_DEFAULT,
          sick: -1, // Unlimited sick leave
          year: balance?.year ?? new Date().getFullYear(),
          used: {
            casual: balance?.used?.casual ?? 0,
            sick: balance?.used?.sick ?? 0
          }
        });

        // Load manager info
        setLoadingManager(true);
        const managerData = await getEmployeeManager(targetUid);
        if (managerData) {
          setManager({
            name: `${managerData.firstName} ${managerData.lastName}`,
            position: managerData.position,
            photoUrl: managerData.photoUrl
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        showSnackbar('Failed to load leave data', 'error');
      } finally {
        setLoadingBalance(false);
        setLoadingManager(false);
      }
    };

    loadData();
  }, [user, selectedEmployee]);

  const handleSubmit = async () => {
    try {
      const duration = calculateLeaveDuration(leaveForm.startDate, leaveForm.endDate);
      
      if (duration <= 0) {
        showSnackbar('End date must be after start date', 'error');
        return;
      }

      if (leaveForm.type === 'casual' && leaveBalance) {
        if (duration > leaveBalance.casual) {
          showSnackbar('Not enough casual leave balance', 'error');
          return;
        }
      }

      if (needsMedicalCertificate && !leaveForm.medicalCertificate) {
        showSnackbar('Medical certificate is required for sick leave longer than 3 days', 'error');
        return;
      }

      let medicalCertificateUrl = '';
      if (leaveForm.medicalCertificate) {
        medicalCertificateUrl = await uploadMedicalCertificate(
          user!.uid,
          leaveForm.medicalCertificate
        );
      }

      await submitLeaveRequest({
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        medicalCertificateUrl,
      });

      showSnackbar('Leave request submitted successfully', 'success');
      setLeaveForm({
        type: 'casual',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
        medicalCertificate: null,
      });
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      showSnackbar('Failed to submit leave request', 'error');
    }
  };

  const handleStatusUpdate = async (requestId: string, status: LeaveStatus) => {
    try {
      await updateRequestStatus(requestId, status);
      showSnackbar('Leave request updated successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to update leave request', 'error');
    }
  };

  if (loading || loadingBalance) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={3}>
        <Grid container spacing={3}>
          {/* HR View */}
          {(userRole === 'HR0' || userRole === 'hr') && (
            <Grid item xs={12}>
              <Box mb={4}>
                <Typography variant="h6" gutterBottom>
                  All Leave Requests
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
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
                      label="Leave Type"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="casual">Casual Leave</MenuItem>
                      <MenuItem value="sick">Sick Leave</MenuItem>
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
                      {employees.map((emp) => (
                        <MenuItem key={emp.departmentId} value={emp.departmentId}>
                          {emp.department}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <Stack spacing={2}>
                  {filteredLeaveRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PersonIcon />
                              <Box>
                                <Typography variant="subtitle1">
                                  {employees.find(emp => emp.id === request.employeeId)?.firstName || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {request.type} Leave
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AccessTimeIcon />
                              <Typography variant="body2">
                                {format(request.startDate, 'MMM dd')} - {format(request.endDate, 'MMM dd')}
                              </Typography>
                            </Stack>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Chip
                              label={request.status}
                              color={
                                request.status === 'approved' ? 'success' :
                                request.status === 'rejected' ? 'error' :
                                'warning'
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            {request.status === 'pending' && (
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Approve">
                                  <IconButton
                                    color="success"
                                    onClick={() => handleStatusUpdate(request.id, 'approved')}
                                  >
                                    <ApprovedIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    color="error"
                                    onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                  >
                                    <RejectedIcon />
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
            </Grid>
          )}

          {/* Leave Balance Cards */}
          <Grid item xs={12}>
            <Grid container spacing={3} mb={4}>
              {leaveTypes.map((type) => (
                <Grid item xs={12} sm={6} key={type.value}>
                  <Card sx={{ bgcolor: alpha(type.color, 0.05) }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(type.color, 0.2), color: type.color }}>
                          {type.icon}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {type.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {type.description}
                          </Typography>
                          {loadingBalance ? (
                            <LinearProgress />
                          ) : (
                            <>
                              <LinearProgress
                                variant="determinate"
                                value={type.value === 'casual' && leaveBalance ?
                                  (leaveBalance.used.casual / (leaveBalance.casual + leaveBalance.used.casual)) * 100 :
                                  0
                                }
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: alpha(type.color, 0.1),
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: type.color,
                                  }
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {type.value === 'casual' && leaveBalance ?
                                  `${leaveBalance.casual} days remaining of ${leaveBalance.casual + leaveBalance.used.casual} days` :
                                  'Unlimited days available'
                                }
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Submit Leave Request Section */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              {(userRole === 'HR0' || userRole === 'hr') && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Employee
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    value={selectedEmployee || ''}
                    onChange={(e) => {
                      setSelectedEmployee(e.target.value || null);
                      setManager(null);
                      setLeaveBalance(null);
                    }}
                    label="Employee"
                  >
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.department}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Request Time Off
              </Typography>

              {leaveForm.type === 'sick' && 
               differenceInDays(leaveForm.endDate, leaveForm.startDate) > 3 && 
               !leaveForm.medicalCertificate && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Medical certificate is required for sick leave longer than 3 days
                </Alert>
              )}
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Leave Type"
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType })}
                  >
                    {leaveTypes.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Start Date"
                    value={leaveForm.startDate}
                    onChange={(date) => date && setLeaveForm({ ...leaveForm, startDate: date })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="End Date"
                    value={leaveForm.endDate}
                    onChange={(date) => date && setLeaveForm({ ...leaveForm, endDate: date })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Reason"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </Grid>

                {needsMedicalCertificate && (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        border: '1px dashed',
                        borderColor: 'warning.main',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLeaveForm({ ...leaveForm, medicalCertificate: file });
                          }
                        }}
                      />
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => document.querySelector('input[type="file"]')?.click()}
                        startIcon={<UploadIcon />}
                      >
                        Upload Medical Certificate
                      </Button>
                      {leaveForm.medicalCertificate && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Selected: {leaveForm.medicalCertificate.name}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={!leaveForm.reason || (needsMedicalCertificate && !leaveForm.medicalCertificate)}
                  >
                    Submit Request
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}
