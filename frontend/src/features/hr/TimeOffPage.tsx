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

const leaveTypes = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'wfh', label: 'Work From Home' },
];

interface LeaveRequest {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
}

export default function TimeOffPage() {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [leaveType, setLeaveType] = useState('');
  const [description, setDescription] = useState('');

  const [requests] = useState<LeaveRequest[]>([
    {
      id: '1',
      type: 'vacation',
      startDate: new Date(2025, 2, 15),
      endDate: new Date(2025, 2, 20),
      status: 'approved',
      description: 'Annual family vacation',
    },
    {
      id: '2',
      type: 'sick',
      startDate: new Date(2025, 1, 5),
      endDate: new Date(2025, 1, 6),
      status: 'rejected',
      description: 'Not feeling well',
    },
    {
      id: '3',
      type: 'wfh',
      startDate: new Date(2025, 2, 1),
      endDate: new Date(2025, 2, 1),
      status: 'pending',
      description: 'Working from home',
    },
  ]);

  const handleSubmit = () => {
    // Handle submit logic here
    setOpenDialog(false);
    setSelectedDates({ start: null, end: null });
    setLeaveType('');
    setDescription('');
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              Time Off Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Request and manage your time off
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<EventIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Request Time Off
            </Button>
          </Grid>
        </Grid>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              }}
            >
              <TimeIcon
                sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
              />
              <Typography variant="h4" gutterBottom>
                15
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Days Available
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.1),
              }}
            >
              <ApprovedIcon
                sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
              />
              <Typography variant="h4" gutterBottom>
                5
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Days Used
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.1),
              }}
            >
              <PendingIcon
                sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
              />
              <Typography variant="h4" gutterBottom>
                2
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Requests
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.1),
              }}
            >
              <EventIcon
                sx={{ fontSize: 40, color: 'info.main', mb: 1 }}
              />
              <Typography variant="h4" gutterBottom>
                8
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming Days Off
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Requests List */}
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Leave Requests
            </Typography>
            <Grid container spacing={2}>
              {requests.map((request) => (
                <Grid item xs={12} key={request.id}>
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>{getStatusIcon(request.status)}</Grid>
                      <Grid item xs>
                        <Typography variant="subtitle1">
                          {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.startDate.toLocaleDateString()} -{' '}
                          {request.endDate.toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Typography
                          variant="body2"
                          sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: alpha(
                              theme.palette[
                                request.status === 'approved'
                                  ? 'success'
                                  : request.status === 'rejected'
                                  ? 'error'
                                  : 'warning'
                              ].main,
                              0.1
                            ),
                            color:
                              theme.palette[
                                request.status === 'approved'
                                  ? 'success'
                                  : request.status === 'rejected'
                                  ? 'error'
                                  : 'warning'
                              ].main,
                          }}
                        >
                          {request.status.toUpperCase()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        {/* Request Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Leave Type"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
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
                    value={selectedDates.start}
                    onChange={(date) =>
                      setSelectedDates({ ...selectedDates, start: date })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="End Date"
                    value={selectedDates.end}
                    onChange={(date) =>
                      setSelectedDates({ ...selectedDates, end: date })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!leaveType || !selectedDates.start || !selectedDates.end}
            >
              Submit Request
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
