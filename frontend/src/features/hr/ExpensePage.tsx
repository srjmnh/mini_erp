import React from 'react';
import { Box, Typography } from '@mui/material';
import ExpenseList from '../expenses/ExpenseList';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useRequests } from '@/contexts/RequestsContext';

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expense Management</Typography>
      </Box>
      <ExpenseList
        expenses={expenseRequests}
        view="hr"
        onStatusChange={async () => {
          // Refresh expense list
          try {
            await updateRequestStatus();
            showSnackbar('Expenses updated successfully', 'success');
          } catch (error) {
            showSnackbar('Failed to update expenses', 'error');
          }
        }}
      />
    </Box>
  );
}
