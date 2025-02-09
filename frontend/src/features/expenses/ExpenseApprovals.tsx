import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useSnackbar } from '@/contexts/SnackbarContext';

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return <ApprovedIcon fontSize="small" />;
    case 'rejected':
      return <RejectedIcon fontSize="small" />;
    case 'pending':
      return <PendingIcon fontSize="small" />;
    default:
      return null;
  }
};

export default function ExpenseApprovals() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState('');

  useEffect(() => {
    loadPendingExpenses();
  }, [user]);

  const loadPendingExpenses = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // First get the manager's employee record to get their ID
      const employeesRef = collection(db, 'employees');
      const employeeQuery = query(employeesRef, where('email', '==', user.email));
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (employeeSnapshot.empty) {
        console.error('Manager employee record not found');
        return;
      }

      const managerData = employeeSnapshot.docs[0];
      const expensesRef = collection(db, 'expenses');
      
      // Query both old and new format expenses
      const [oldFormatSnapshot, newFormatSnapshot] = await Promise.all([
        // Old format using approver.email
        getDocs(
          query(
            expensesRef,
            where('approver.email', '==', user.email),
            where('status', '==', 'pending'),
            orderBy('submittedAt', 'desc')
          )
        ),
        // New format using managerId
        getDocs(
          query(
            expensesRef,
            where('managerId', '==', managerData.id),
            where('status', '==', 'pending'),
            orderBy('submittedAt', 'desc')
          )
        )
      ]);

      // Combine results from both queries
      const oldExpenses = oldFormatSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const newExpenses = newFormatSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Combine and deduplicate in case any expense appears in both queries
      const allExpenses = [...oldExpenses, ...newExpenses];
      const uniqueExpenses = allExpenses.filter((expense, index, self) =>
        index === self.findIndex((e) => e.id === expense.id)
      );

      setPendingExpenses(uniqueExpenses);
    } catch (error) {
      console.error('Error loading pending expenses:', error);
      showSnackbar('Failed to load pending expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expense: any) => {
    try {
      const expenseRef = doc(db, 'expenses', expense.id);
      await updateDoc(expenseRef, {
        status: 'approved',
        statusText: `Approved by ${user?.displayName || user?.email}`,
        lastUpdatedAt: new Date(),
        approvedAt: new Date(),
        managerId: user.uid,
        managerName: user?.displayName || user?.email
      });

      showSnackbar('Expense approved successfully', 'success');
      loadPendingExpenses(); // Refresh the list
    } catch (error) {
      console.error('Error approving expense:', error);
      showSnackbar('Failed to approve expense', 'error');
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;

    try {
      const expenseRef = doc(db, 'expenses', selectedExpense.id);
      await updateDoc(expenseRef, {
        status: 'rejected',
        statusText: `Rejected by ${user?.displayName || user?.email}`,
        rejectionReason: rejectReason,
        lastUpdatedAt: new Date(),
        rejectedAt: new Date(),
        managerId: user.uid,
        managerName: user?.displayName || user?.email
      });

      // Create notification for the user
      const notificationData = {
        userId: selectedExpense.userId,
        type: 'expense_rejected',
        title: 'Expense Request Rejected',
        message: `Your expense request for ${selectedExpense.category} ($${selectedExpense.amount}) was rejected${rejectReason ? ': ' + rejectReason : ''}`,
        status: 'unread',
        data: {
          expenseId: selectedExpense.id,
          rejectionReason: rejectReason
        },
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);

      showSnackbar('Expense rejected', 'success');
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedExpense(null);
      loadPendingExpenses(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting expense:', error);
      showSnackbar('Failed to reject expense', 'error');
    }
  };

  const handleViewReceipt = (receipt: string) => {
    setSelectedReceipt(receipt);
    setShowReceiptDialog(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading pending expenses...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2}>
        {pendingExpenses.length === 0 ? (
          <Typography color="textSecondary">No pending expenses to approve</Typography>
        ) : (
          pendingExpenses.map((expense) => (
            <Paper
              key={expense.id}
              elevation={1}
              sx={{
                p: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar
                      src={expense.userPhotoUrl}
                      alt={expense.userName}
                      sx={{ width: 24, height: 24 }}
                    >
                      {expense.userName[0]}
                    </Avatar>
                    <Typography variant="subtitle1">
                      {expense.userName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      •
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(expense.submittedAt.toDate(), 'MMM d, yyyy')}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {expense.category}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {expense.description}
                  </Typography>

                  {expense.status === 'rejected' && expense.rejectionReason && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      Rejection reason: {expense.rejectionReason}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                      ${parseFloat(expense.amount).toFixed(2)}
                    </Typography>

                    {expense.receiptUrl && (
                      <Tooltip title="View Receipt">
                        <IconButton
                          size="small"
                          onClick={() => handleViewReceipt(expense.receiptUrl)}
                          sx={{ color: 'primary.main' }}
                        >
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleApprove(expense)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setShowRejectDialog(true);
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Stack>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)}>
        <DialogTitle>Reject Expense</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for rejection"
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRejectDialog(false)}>Cancel</Button>
          <Button onClick={handleReject} color="error">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={showReceiptDialog}
        onClose={() => setShowReceiptDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Receipt</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: '500px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={selectedReceipt}
              alt="Receipt"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceiptDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
