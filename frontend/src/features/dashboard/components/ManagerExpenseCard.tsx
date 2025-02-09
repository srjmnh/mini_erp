import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { format } from 'date-fns';
import { Expense } from '@/types/expense';

export default function ManagerExpenseCard() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  const fetchPendingExpenses = async () => {
    if (!user) return;

    try {
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('departmentId', '==', user.departmentId),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(expensesQuery);
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];

      setPendingExpenses(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  useEffect(() => {
    fetchPendingExpenses();
  }, [user]);

  const handleStatusChange = async (status: 'approved' | 'rejected') => {
    if (!selectedExpense) return;

    try {
      const expenseRef = doc(db, 'expenses', selectedExpense.id);
      const updateData = {
        status: status === 'approved' ? 'manager_approved' : 'rejected',
        managerApprovedAt: new Date(),
        managerNote: approvalNote,
        lastUpdatedAt: new Date(),
      };

      await updateDoc(expenseRef, updateData);
      showSnackbar('Expense status updated successfully', 'success');
      setSelectedExpense(null);
      setApprovalNote('');
      fetchPendingExpenses();
    } catch (error) {
      showSnackbar('Failed to update expense status', 'error');
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Pending Expense Approvals
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.location.href = '/expenses'}
          >
            View All
          </Button>
        </Box>

        <Stack spacing={2}>
          {pendingExpenses.map((expense) => (
            <Box
              key={expense.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.default',
              }}
            >
              <Box>
                <Typography variant="body2">
                  {expense.userName} - ${expense.amount.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {expense.category} • {format(new Date(expense.submittedAt), 'MMM d, yyyy')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {expense.receiptUrl && (
                  <IconButton
                    size="small"
                    onClick={() => window.open(expense.receiptUrl, '_blank')}
                  >
                    <ReceiptIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => setSelectedExpense(expense)}
                >
                  <ApproveIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setSelectedExpense(expense)}
                >
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
          {pendingExpenses.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center">
              No pending approvals
            </Typography>
          )}
        </Stack>
      </CardContent>

      <Dialog
        open={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {`${selectedExpense?.userName}'s Expense Request`}
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
          <Button onClick={() => setSelectedExpense(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => handleStatusChange('rejected')}
            color="error"
            variant="contained"
          >
            Reject
          </Button>
          <Button
            onClick={() => handleStatusChange('approved')}
            color="success"
            variant="contained"
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
