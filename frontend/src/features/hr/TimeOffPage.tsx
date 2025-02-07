import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Event as EventIcon,
  AccessTime as TimeIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { useRequests } from '@/hooks/useRequests';
import { LeaveType, LeaveStatus } from '@/config/firestore-schema';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

const leaveTypes = [
  { value: 'vacation' as LeaveType, label: 'Vacation' },
  { value: 'sick' as LeaveType, label: 'Sick Leave' },
  { value: 'personal' as LeaveType, label: 'Personal Leave' },
  { value: 'other' as LeaveType, label: 'Other' },
];

export default function TimeOffPage() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { userRole } = useAuth();
  const {
    leaveRequests,
    loading,
    submitLeaveRequest,
    updateRequestStatus,
  } = useRequests();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approverNote, setApproverNote] = useState('');
  
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation' as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });

  const handleSubmit = async () => {
    try {
      await submitLeaveRequest(leaveForm);
      setOpenDialog(false);
      showSnackbar('Leave request submitted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to submit leave request', 'error');
    }
  };

  const handleAction = async (status: LeaveStatus) => {
    if (!selectedRequest) return;

    try {
      await updateRequestStatus('leave', selectedRequest.id, status, approverNote);
      setSelectedRequest(null);
      setApproverNote('');
      showSnackbar(`Request ${status} successfully`, 'success');
    } catch (error) {
      showSnackbar(`Failed to ${status} request`, 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <ApprovedIcon sx={{ color: 'success.main' }} />;
      case 'rejected':
        return <RejectedIcon sx={{ color: 'error.main' }} />;
      default:
        return <PendingIcon sx={{ color: 'warning.main' }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" gutterBottom>Time Off</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography>Loading leave requests...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Time Off</Typography>
          <Button
            variant="contained"
            startIcon={<EventIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Request Time Off
          </Button>
        </Box>

        <Grid container spacing={3}>
          {leaveRequests.map((request) => (
            <Grid item xs={12} md={6} lg={4} key={request.id}>
              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  bgcolor: (theme) =>
                    request.status === 'approved'
                      ? alpha(theme.palette.success.main, 0.1)
                      : request.status === 'rejected'
                      ? alpha(theme.palette.error.main, 0.1)
                      : alpha(theme.palette.warning.main, 0.1),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                  </Typography>
                  {getStatusIcon(request.status)}
                  {userRole === 'manager' && request.status === 'pending' && (
                    <Box sx={{ ml: 1 }}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <ApprovedIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <RejectedIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimeIcon sx={{ mr: 1, fontSize: 20 }} />
                  <Typography variant="body2">
                    {format(request.startDate, 'MMM dd, yyyy')} -{' '}
                    {format(request.endDate, 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {request.reason}
                </Typography>
                {request.approverNote && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Note: {request.approverNote}
                  </Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* New Leave Request Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Leave Type"
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType })}
                  >
                    {leaveTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
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
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">Submit</Button>
          </DialogActions>
        </Dialog>

        {/* Review Request Dialog */}
        <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Leave Request</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Note (Optional)"
              value={approverNote}
              onChange={(e) => setApproverNote(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button onClick={() => handleAction('rejected')} color="error">
              Reject
            </Button>
            <Button onClick={() => handleAction('approved')} color="success" variant="contained">
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
