import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useSupabase } from '@/hooks/useSupabase';
import { LeaveRequest, LeaveType, LeaveStatus } from './types';
import { differenceInDays, format } from 'date-fns';

const DEFAULT_CASUAL_LEAVES = 25;

interface LeaveFormData {
  type: LeaveType;
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
  medicalCertificate?: File;
}

import TimeOffPage from '../hr/components/TimeOffPage';

import { makeUserAdmin } from '@/utils/makeAdmin';

export default function LeavesPage() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Add admin button for demo user
  if (user?.email === 'demo@demo.com') {
    return (
      <Box p={3}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => makeUserAdmin()}
          sx={{ mb: 3 }}
        >
          Make HR Admin
        </Button>
        {userRole === 'HR0' ? <TimeOffPage /> : (
          <Typography>Click the button above to become an HR admin</Typography>
        )}
      </Box>
    );
  }

  // For HR users, show the TimeOffPage component
  if (userRole === 'HR0' || userRole === 'hr') {
    console.log('Showing HR view for role:', userRole);
    return <TimeOffPage />;
  }
  const { user } = useAuth();
  const { employees, departments } = useFirestore();
  const { showSnackbar } = useSnackbar();
  const { supabase } = useSupabase();

  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<LeaveFormData>({
    type: 'casual',
    startDate: null,
    endDate: null,
    reason: '',
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState({ casual: DEFAULT_CASUAL_LEAVES, sick: 0 });
  const [uploading, setUploading] = useState(false);

  const isManager = departments.some(dept => dept.managerId === user?.uid);
  const currentEmployee = employees.find(emp => emp.id === user?.uid);
  const currentDepartment = departments.find(dept => dept.id === currentEmployee?.departmentId);
  const departmentManager = employees.find(emp => emp.id === currentDepartment?.managerId);

  const needsMedicalCertificate = formData.type === 'sick' && 
    formData.startDate && 
    formData.endDate && 
    differenceInDays(formData.endDate, formData.startDate) > 3;

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, [user]);

  const fetchLeaveRequests = async () => {
    try {
      const leaveRequestsRef = collection(db, 'leaveRequests');
      let query = leaveRequestsRef;

      if (!isManager) {
        // Regular employees see only their requests
        query = query.where('employeeId', '==', user?.uid);
      } else {
        // Managers see requests from their department
        query = query.where('departmentId', '==', currentDepartment?.id);
      }

      const snapshot = await getDocs(query);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];

      setLeaveRequests(requests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      showSnackbar('Failed to fetch leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const balanceRef = doc(db, 'leaveBalances', user?.uid || '');
      const balanceDoc = await getDoc(balanceRef);

      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setLeaveBalance({
          casual: data.casualLeaves,
          sick: data.sickLeaves
        });
      } else {
        // Initialize default balance
        await setDoc(balanceRef, {
          employeeId: user?.uid,
          casualLeaves: DEFAULT_CASUAL_LEAVES,
          sickLeaves: 0,
          updatedAt: new Date().toISOString()
        });
        setLeaveBalance({ casual: DEFAULT_CASUAL_LEAVES, sick: 0 });
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      showSnackbar('Failed to fetch leave balance', 'error');
    }
  };

  const handleUploadCertificate = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const path = `medical-certificates/${user?.uid}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('leave-documents')
        .getPublicUrl(path);

      setFormData(prev => ({
        ...prev,
        medicalCertificate: file
      }));

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      showSnackbar('Failed to upload medical certificate', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    if (needsMedicalCertificate && !formData.medicalCertificate) {
      showSnackbar('Please upload a medical certificate', 'error');
      return;
    }

    try {
      const days = differenceInDays(formData.endDate, formData.startDate) + 1;
      
      if (formData.type === 'casual' && days > leaveBalance.casual) {
        showSnackbar('Insufficient casual leave balance', 'error');
        return;
      }

      let certificateUrl = '';
      if (formData.medicalCertificate) {
        certificateUrl = await handleUploadCertificate(formData.medicalCertificate);
        if (!certificateUrl) return;
      }

      const leaveRequest: Omit<LeaveRequest, 'id'> = {
        employeeId: user?.uid || '',
        employeeName: currentEmployee?.name || '',
        departmentId: currentDepartment?.id || '',
        type: formData.type,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        reason: formData.reason,
        status: 'pending',
        medicalCertificate: certificateUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'leaveRequests'), leaveRequest);
      
      // Update leave balance
      if (formData.type === 'casual') {
        const balanceRef = doc(db, 'leaveBalances', user?.uid || '');
        await updateDoc(balanceRef, {
          casualLeaves: leaveBalance.casual - days,
          updatedAt: new Date().toISOString()
        });
      }

      showSnackbar('Leave request submitted successfully', 'success');
      setOpenDialog(false);
      setFormData({
        type: 'casual',
        startDate: null,
        endDate: null,
        reason: '',
      });
      fetchLeaveRequests();
      fetchLeaveBalance();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showSnackbar('Failed to submit leave request', 'error');
    }
  };

  const handleLeaveAction = async (requestId: string, action: 'approved' | 'declined', comment: string) => {
    try {
      const requestRef = doc(db, 'leaveRequests', requestId);
      const request = leaveRequests.find(r => r.id === requestId);

      if (!request) return;

      await updateDoc(requestRef, {
        status: action,
        managerComment: comment,
        updatedAt: new Date().toISOString()
      });

      // If declined, restore leave balance
      if (action === 'declined' && request.type === 'casual') {
        const days = differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1;
        const balanceRef = doc(db, 'leaveBalances', request.employeeId);
        const balanceDoc = await getDoc(balanceRef);

        if (balanceDoc.exists()) {
          await updateDoc(balanceRef, {
            casualLeaves: balanceDoc.data().casualLeaves + days,
            updatedAt: new Date().toISOString()
          });
        }
      }

      showSnackbar(`Leave request ${action}`, 'success');
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error updating leave request:', error);
      showSnackbar(`Failed to ${action} leave request`, 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 2,
          background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Leave Management
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
              Request and manage your time off
            </Typography>
          </Box>
          {!isManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: alpha('#ffffff', 0.9),
                },
              }}
            >
              Request Leave
            </Button>
          )}
        </Box>

        {/* Leave Balance Cards */}
        {!isManager && (
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.1) }}>
                <Typography variant="subtitle2" sx={{ color: 'white', opacity: 0.7 }}>
                  Casual Leave Balance
                </Typography>
                <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                  {leaveBalance.casual} days
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, bgcolor: alpha('#ffffff', 0.1) }}>
                <Typography variant="subtitle2" sx={{ color: 'white', opacity: 0.7 }}>
                  Sick Leave Balance
                </Typography>
                <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                  Unlimited
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Leave Requests */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {isManager ? 'Department Leave Requests' : 'Your Leave Requests'}
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : leaveRequests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No leave requests found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {leaveRequests.map(request => (
            <Grid item xs={12} key={request.id}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Chip
                          label={request.type.toUpperCase()}
                          color={request.type === 'casual' ? 'primary' : 'secondary'}
                          size="small"
                        />
                        <Chip
                          label={request.status.toUpperCase()}
                          color={
                            request.status === 'approved'
                              ? 'success'
                              : request.status === 'declined'
                              ? 'error'
                              : 'warning'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="subtitle1" gutterBottom>
                        {isManager ? request.employeeName : 'Your Leave Request'}
                      </Typography>
                      
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(new Date(request.startDate), 'PP')} - {format(new Date(request.endDate), 'PP')}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1} days
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary">
                          Reason: {request.reason}
                        </Typography>
                        
                        {request.medicalCertificate && (
                          <Button
                            startIcon={<UploadIcon />}
                            variant="outlined"
                            size="small"
                            href={request.medicalCertificate}
                            target="_blank"
                            sx={{ alignSelf: 'flex-start' }}
                          >
                            View Medical Certificate
                          </Button>
                        )}
                        
                        {request.managerComment && (
                          <Typography variant="body2" color="textSecondary">
                            Manager Comment: {request.managerComment}
                          </Typography>
                        )}
                      </Stack>
                    </Grid>
                    
                    {isManager && request.status === 'pending' && (
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Approve">
                            <IconButton
                              color="success"
                              onClick={() => handleLeaveAction(request.id, 'approved', 'Approved')}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Decline">
                            <IconButton
                              color="error"
                              onClick={() => handleLeaveAction(request.id, 'declined', 'Declined')}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Leave Request Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Leave</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Leave Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
                >
                  <MenuItem value="casual">Casual Leave</MenuItem>
                  <MenuItem value="sick">Sick Leave</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => setFormData({ ...formData, endDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </Grid>
              
              {needsMedicalCertificate && (
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Medical Certificate'}
                    <input
                      type="file"
                      hidden
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, medicalCertificate: file });
                        }
                      }}
                    />
                  </Button>
                  {formData.medicalCertificate && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Selected: {formData.medicalCertificate.name}
                    </Typography>
                  )}
                </Grid>
              )}
              
              {departmentManager && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Your request will be reviewed by: {departmentManager.name}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={uploading}>
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
