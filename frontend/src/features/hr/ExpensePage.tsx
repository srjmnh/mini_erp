import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  Check as ApprovedIcon,
  Close as RejectedIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRequests } from '@/hooks/useRequests';
import { ExpenseCategory, ExpenseStatus } from '@/config/firestore-schema';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { alpha, useTheme } from '@mui/material/styles';

const expenseCategories = [
  { value: 'travel' as ExpenseCategory, label: 'Travel' },
  { value: 'office' as ExpenseCategory, label: 'Office Supplies' },
  { value: 'equipment' as ExpenseCategory, label: 'Equipment' },
  { value: 'other' as ExpenseCategory, label: 'Other' },
];

const currencies = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
];

export default function ExpensePage() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { userRole } = useAuth();
  const {
    expenseRequests,
    loading,
    submitExpenseRequest,
    updateRequestStatus,
  } = useRequests();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approverNote, setApproverNote] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    category: 'travel' as ExpenseCategory,
    amount: '',
    currency: 'USD',
    description: '',
    receiptUrl: '',
  });

  const handleSubmit = async () => {
    if (!expenseForm.amount || !expenseForm.description) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      await submitExpenseRequest({
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      });
      setOpenDialog(false);
      showSnackbar('Expense request submitted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to submit expense request', 'error');
    }
  };

  const handleAction = async (status: ExpenseStatus) => {
    if (!selectedRequest) return;

    try {
      await updateRequestStatus('expense', selectedRequest.id, status, approverNote);
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
        <Typography variant="h4" gutterBottom>Expenses</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography>Loading expense requests...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expenses</Typography>
        <Button
          variant="contained"
          startIcon={<MoneyIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Submit Expense
        </Button>
      </Box>

      <Grid container spacing={3}>
        {expenseRequests.map((request) => (
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
                  {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
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
                <MoneyIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2">
                  {request.amount} {request.currency}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {request.description}
              </Typography>
              {request.receiptUrl && (
                <Button
                  startIcon={<ReceiptIcon />}
                  size="small"
                  sx={{ mt: 1 }}
                  href={request.receiptUrl}
                  target="_blank"
                >
                  View Receipt
                </Button>
              )}
              {request.approverNote && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  Note: {request.approverNote}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* New Expense Request Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Expense</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Expense Category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                >
                  {expenseCategories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Currency"
                  value={expenseForm.currency}
                  onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Receipt URL"
                  value={expenseForm.receiptUrl}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                  placeholder="https://"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Expense Request</DialogTitle>
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
  );
}
