import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Receipt as ReceiptIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Expense } from '@/types/expense';

interface ExpenseListProps {
  expenses: Expense[];
  view: 'hr' | 'manager' | 'employee';
  onStatusChange: (id: string, status: string, note?: string) => void;
}

export default function ExpenseList({ expenses, view, onStatusChange }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  const handleApprove = () => {
    if (!selectedExpense) return;
    onStatusChange(selectedExpense.id, 'approved', approvalNote);
    setSelectedExpense(null);
    setApprovalNote('');
  };

  const handleReject = () => {
    if (!selectedExpense) return;
    onStatusChange(selectedExpense.id, 'rejected', approvalNote);
    setSelectedExpense(null);
    setApprovalNote('');
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'manager_approved':
        return <Chip label="Manager Approved" color="info" size="small" />;
      case 'approved':
        return <Chip label="Approved" color="success" size="small" />;
      case 'rejected':
        return <Chip label="Rejected" color="error" size="small" />;
      default:
        return null;
    }
  };

  const canApprove = (expense: Expense) => {
    if (view === 'employee') return false;
    if (view === 'manager') return expense.status === 'pending';
    if (view === 'hr') return expense.status === 'manager_approved' || expense.status === 'pending';
    return false;
  };

  const renderApprovalButtons = (expense: Expense) => {
    if (!canApprove(expense)) return null;

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Approve">
          <IconButton
            size="small"
            color="success"
            onClick={() => setSelectedExpense(expense)}
          >
            <ApproveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reject">
          <IconButton
            size="small"
            color="error"
            onClick={() => setSelectedExpense(expense)}
          >
            <RejectIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {expenses.map((expense) => (
          <Box
            key={expense.id}
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="subtitle1">
                  {expense.description}
                </Typography>
                {getStatusChip(expense.status)}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                <Typography variant="body2">
                  Amount: ${expense.amount.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  Category: {expense.category}
                </Typography>
                <Typography variant="body2">
                  Submitted: {format(new Date(expense.submittedAt), 'MMM d, yyyy')}
                </Typography>
              </Box>
              {(expense.managerNote || expense.hrNote) && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" color="info" />
                  <Typography variant="body2" color="text.secondary">
                    {expense.managerNote && `Manager: ${expense.managerNote}`}
                    {expense.hrNote && expense.managerNote && ' | '}
                    {expense.hrNote && `HR: ${expense.hrNote}`}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {expense.receiptUrl && (
                <Tooltip title="View Receipt">
                  <IconButton
                    size="small"
                    onClick={() => window.open(expense.receiptUrl, '_blank')}
                  >
                    <ReceiptIcon />
                  </IconButton>
                </Tooltip>
              )}
              {renderApprovalButtons(expense)}
            </Box>
          </Box>
        ))}
        {expenses.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No expenses found</Typography>
          </Box>
        )}
      </Paper>

      <Dialog
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedExpense?.status === 'rejected' ? 'Reject' : 'Approve'} Expense
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Note"
            fullWidth
            multiline
            rows={3}
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            placeholder="Add a note (optional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedExpense(null)}>Cancel</Button>
          <Button
            onClick={handleReject}
            color="error"
            variant="contained"
            sx={{ display: selectedExpense?.status === 'rejected' ? 'block' : 'none' }}
          >
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            color="success"
            variant="contained"
            sx={{ display: selectedExpense?.status !== 'rejected' ? 'block' : 'none' }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
