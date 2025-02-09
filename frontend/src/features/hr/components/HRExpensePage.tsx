import React from 'react';
import { Box } from '@mui/material';
import ExpenseList from '../../expenses/ExpenseList';
import { useAuth } from '@/contexts/AuthContext';

export const HRExpensePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <ExpenseList
        expenses={[]}  // This will be populated from Firebase
        view="hr"
        onStatusChange={() => {
          // This will refresh the expense list
        }}
      />
    </Box>
  );
};
