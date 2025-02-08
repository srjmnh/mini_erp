import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import { format } from 'date-fns';
import { useRequests } from '@/hooks/useRequests';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { LeaveStatus } from '@/config/firestore-schema';
import { Check as ApproveIcon, Close as RejectIcon, Comment as CommentIcon } from '@mui/icons-material';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (status: LeaveStatus, note: string) => void;
  action: 'approve' | 'reject';
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({ open, onClose, onSubmit, action }) => {
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    onSubmit(action === 'approve' ? 'approved' : 'rejected', note);
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Add a note (optional)"
          fullWidth
          multiline
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          color={action === 'approve' ? 'primary' : 'error'}
        >
          {action === 'approve' ? 'Approve' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const LeaveRequestsManager: React.FC = () => {
  const { leaveRequests, loading, updateRequestStatus } = useRequests();
  const { showSnackbar } = useSnackbar();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const handleApprovalAction = async (requestId: string, status: LeaveStatus, note: string) => {
    try {
      await updateRequestStatus('leave', requestId, status, note);
      showSnackbar(
        `Leave request ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error updating request status:', error);
      showSnackbar('Failed to update request status', 'error');
    }
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading requests...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Leave Requests
      </Typography>
      
      <Grid container spacing={2}>
        {leaveRequests.map((request) => (
          <Grid item xs={12} key={request.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>{request.employeeId.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="subtitle1">
                          {request.employeeId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.type} Leave • {format(request.startDate, 'MMM d, yyyy')} - {format(request.endDate, 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip 
                      label={request.status.toUpperCase()} 
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2">
                    {request.reason}
                  </Typography>

                  {request.status === 'pending' && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Approve">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedRequest(request.id);
                            setApprovalAction('approve');
                          }}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setSelectedRequest(request.id);
                            setApprovalAction('reject');
                          }}
                        >
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}

                  {request.approverNote && (
                    <Box bgcolor="grey.50" p={1} borderRadius={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CommentIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                          {request.approverNote}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {leaveRequests.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                No leave requests to review
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <ApprovalDialog
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onSubmit={(status, note) => {
          if (selectedRequest) {
            handleApprovalAction(selectedRequest, status, note);
          }
        }}
        action={approvalAction}
      />
    </Box>
  );
};
