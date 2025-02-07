import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  LinearProgress,
  Grid,
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { LeaveRequest, ExpenseRequest } from '@/hooks/useRequests';

interface RequestListProps {
  type: 'leave' | 'expense';
  requests: (LeaveRequest | ExpenseRequest)[];
  loading: boolean;
}

export default function RequestList({ type, requests, loading }: RequestListProps) {
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | ExpenseRequest | null>(null);
  const [approverNote, setApproverNote] = useState('');
  const { userRole } = useAuth();
  const { updateRequestStatus } = useRequests();
  const { showSnackbar } = useSnackbar();

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    try {
      await updateRequestStatus(type, selectedRequest.id, status, approverNote);
      setSelectedRequest(null);
      setApproverNote('');
      showSnackbar(`Request ${status} successfully`, 'success');
    } catch (error) {
      showSnackbar(`Failed to ${status} request`, 'error');
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        {requests.map((request) => (
          <Grid item xs={12} key={request.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">
                      {type === 'leave' ? (request as LeaveRequest).type : (request as ExpenseRequest).category}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      {type === 'leave' ? (
                        `${format((request as LeaveRequest).startDate, 'MMM dd, yyyy')} - ${format(
                          (request as LeaveRequest).endDate,
                          'MMM dd, yyyy'
                        )}`
                      ) : (
                        `${(request as ExpenseRequest).amount} ${(request as ExpenseRequest).currency}`
                      )}
                    </Typography>
                    <Typography variant="body2">
                      {type === 'leave' ? (request as LeaveRequest).reason : (request as ExpenseRequest).description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={request.status}
                      color={getStatusColor(request.status) as any}
                      size="small"
                    />
                    {userRole === 'manager' && request.status === 'pending' && (
                      <>
                        <IconButton
                          color="success"
                          size="small"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <CloseIcon />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
                {request.approverNote && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Note: {request.approverNote}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Request</DialogTitle>
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
    </>
  );
}
