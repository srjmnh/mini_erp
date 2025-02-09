import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as DeclineIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Expense } from '@/types/expense';
import { format } from 'date-fns';

export default function ManagerExpensePanel() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [comment, setComment] = useState('');

  const loadPendingExpenses = async () => {
    if (!user) return;

    try {
      const expenseQuery = query(
        collection(db, 'expenses'),
        where('managerId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(expenseQuery);
      const expenses = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Expense[];

      setPendingExpenses(expenses);
    } catch (error) {
      console.error('Error loading pending expenses:', error);
    }
  };

  useEffect(() => {
    loadPendingExpenses();
  }, [user]);

  const handleApproval = async (status: 'approved' | 'declined') => {
    if (!selectedExpense || !user) return;

    try {
      const expenseRef = doc(db, 'expenses', selectedExpense.id);
      await updateDoc(expenseRef, {
        'managerApproval.status': status,
        'managerApproval.approvedAt': new Date(),
        'managerApproval.comment': comment,
        ...(status === 'declined' && { status: 'declined' })
      });

      showSnackbar(`Expense ${status}`, 'success');
      setApprovalDialog(false);
      setSelectedExpense(null);
      setComment('');
      loadPendingExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      showSnackbar('Failed to update expense', 'error');
    }
  };

  if (pendingExpenses.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2 }}>
        <Typography variant="subtitle1" color="text.secondary">
          No pending expense approvals
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={0}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Pending Expense Approvals
          </Typography>
          <List>
            {pendingExpenses.map((expense) => (
              <ListItem key={expense.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {expense.userName}
                      <Chip
                        label={`$${expense.amount.toFixed(2)}`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  }
                  secondary={`${format(expense.submittedAt.toDate(), 'MMM d, yyyy')} - ${
                    expense.category.replace('_', ' ')
                  }`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    onClick={() => setSelectedExpense(expense)}
                    title="View Details"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    color="success"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setApprovalDialog(true);
                    }}
                    title="Approve"
                  >
                    <ApproveIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      setSelectedExpense(expense);
                      setApprovalDialog(true);
                    }}
                    title="Decline"
                  >
                    <DeclineIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      </Paper>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Manager Approval</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button onClick={() => handleApproval('declined')} color="error">
            Decline
          </Button>
          <Button onClick={() => handleApproval('approved')} color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      {selectedExpense && !approvalDialog && (
        <Dialog
          open={true}
          onClose={() => setSelectedExpense(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Expense Details</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <Typography variant="body2">
                <strong>Submitted by:</strong> {selectedExpense.userName}
              </Typography>
              <Typography variant="body2">
                <strong>Department:</strong> {selectedExpense.userDepartment}
              </Typography>
              <Typography variant="body2">
                <strong>Amount:</strong> ${selectedExpense.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong>{' '}
                {selectedExpense.category.replace('_', ' ')}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {selectedExpense.description}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedExpense(null)}>Close</Button>
            <Button
              href={selectedExpense.receiptUrl}
              target="_blank"
              color="primary"
            >
              View Receipt
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
