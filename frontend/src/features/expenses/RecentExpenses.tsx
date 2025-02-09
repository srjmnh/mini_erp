import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';

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
    photoUrl: string;
    role: string;
  };
  receiptUrl?: string;
  rejectionReason?: string;
  lastUpdatedAt: Timestamp;
}

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

export default function RecentExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expensesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  if (loading) {
    return <Typography>Loading recent expenses...</Typography>;
  }

  if (expenses.length === 0) {
    return <Typography>No recent expenses found.</Typography>;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Recent Expenses
      </Typography>
      <Stack spacing={2}>
        {expenses.map((expense) => (
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
                  <Typography variant="subtitle1" component="span">
                    {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    •
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(expense.submittedAt)}
                  </Typography>
                </Box>

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
                    {formatCurrency(expense.amount)}
                  </Typography>

                  {expense.receiptUrl && (
                    <Tooltip title="View Receipt">
                      <IconButton
                        size="small"
                        onClick={() => console.log('View receipt')}
                        sx={{ color: 'primary.main' }}
                      >
                        <ReceiptIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Chip
                  icon={getStatusIcon(expense.status)}
                  label={expense.status.toUpperCase()}
                  color={getStatusColor(expense.status) as any}
                  size="small"
                />
                
                {expense.approver && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Avatar
                      src={expense.approver.photoUrl}
                      alt={expense.approver.name}
                      sx={{ width: 24, height: 24 }}
                    >
                      {expense.approver.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="caption" display="block">
                        {expense.status === 'pending' ? 'Pending Approval from:' : 'Reviewed by:'}
                      </Typography>
                      <Typography variant="body2">
                        {expense.approver.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {expense.approver.role}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
