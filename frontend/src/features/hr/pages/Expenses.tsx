import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HRExpensePage } from '../components/HRExpensePage';
import { ManagerExpensePanel } from '../../expenses/ManagerExpensePanel';
import ExpenseList from '../../expenses/ExpenseList';

export const Expenses: React.FC = () => {
  const { userRole } = useAuth();

  if (userRole === 'HR0' || userRole === 'hr') {
    return <HRExpensePage />;
  }

  if (userRole === 'manager') {
    return <ManagerExpensePanel />;
  }

  return (
    <ExpenseList
      expenses={[]}  // This will be populated from Firebase
      view="employee"
      onStatusChange={() => {
        // This will refresh the expense list
      }}
    />
  );
};
