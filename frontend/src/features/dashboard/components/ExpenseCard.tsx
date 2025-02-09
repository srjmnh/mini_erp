import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  Stack,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import ExpenseForm from '../../expenses/ExpenseForm';
import { formatCurrency } from '@/utils/format';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  status: string;
  statusText: string;
  submittedAt: Timestamp;
  userId: string;
  userEmail: string;
  userName: string;
  userDepartment: string;
  departmentName: string;
  approver: {
    id: string;
    name: string;
    email: string;
  };
  receiptUrl?: string;
  lastUpdatedAt: Timestamp;
}

export default function ExpenseCard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [openExpenseForm, setOpenExpenseForm] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expensesList);
      setLoading(false);
    });

    const pendingQuery = query(
      expensesRef,
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    onSnapshot(pendingQuery, (snapshot) => {
      setTotalPending(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusChip = (expense: Expense) => {
    const statusLabel = expense.approver?.name 
      ? `Pending from ${expense.approver.name}`
      : expense.statusText || expense.status;

    switch (expense.status) {
      case 'pending':
        return <Chip label={statusLabel} color="warning" size="small" />;
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

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return 'Invalid date';
    }
    try {
      return format(timestamp.toDate(), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Expenses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalPending} pending approval{totalPending !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenExpenseForm(true)}
          >
            New Expense
          </Button>
        </Box>

        <Stack spacing={2}>
          {expenses.map((expense) => (
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon color="action" />
                <Box>
                  <Typography variant="body2">
                    {formatCurrency(expense.amount)} - {expense.category}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(expense.submittedAt)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusChip(expense)}
                {expense.receiptUrl && (
                  <IconButton
                    size="small"
                    onClick={() => window.open(expense.receiptUrl, '_blank')}
                  >
                    <ReceiptIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}
          {expenses.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center">
              No recent expenses
            </Typography>
          )}
        </Stack>
      </CardContent>

      <Dialog
        open={openExpenseForm}
        onClose={() => setOpenExpenseForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Submit New Expense
          </Typography>
          <ExpenseForm
            onSubmit={() => {
              setOpenExpenseForm(false);
              setExpenses([]);
              setLoading(true);
            }}
            onClose={() => setOpenExpenseForm(false)}
          />
        </Box>
      </Dialog>
    </Card>
  );
}
