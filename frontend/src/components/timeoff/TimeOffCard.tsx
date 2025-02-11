import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import { format } from 'date-fns';

interface TimeOff {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  reason?: string;
}

interface TimeOffCardProps {
  timeOffBalance: {
    vacation: number;
    sick: number;
    personal: number;
  };
  onRequestTimeOff: (request: Omit<TimeOff, 'id' | 'status'>) => Promise<void>;
}

export const TimeOffCard: React.FC<TimeOffCardProps> = ({
  timeOffBalance,
  onRequestTimeOff,
}) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('vacation');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;

    await onRequestTimeOff({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      reason,
    });

    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setStartDate('');
    setEndDate('');
    setType('vacation');
    setReason('');
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Time Off Balance
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between">
              <Typography>Vacation Days</Typography>
              <Typography>{timeOffBalance.vacation} days</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography>Sick Leave</Typography>
              <Typography>{timeOffBalance.sick} days</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography>Personal Days</Typography>
              <Typography>{timeOffBalance.personal} days</Typography>
            </Box>
          </Stack>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => setOpen(true)}
            >
              Request Time Off
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              fullWidth
            >
              <MenuItem value="vacation">Vacation</MenuItem>
              <MenuItem value="sick">Sick Leave</MenuItem>
              <MenuItem value="personal">Personal</MenuItem>
            </TextField>
            <TextField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!startDate || !endDate}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimeOffCard;
