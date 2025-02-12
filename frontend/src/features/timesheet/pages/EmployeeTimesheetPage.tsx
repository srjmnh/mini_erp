import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import TimeEntryForm from '../components/TimeEntryForm';
import TimeEntriesList from '../components/TimeEntriesList';
import { useAuth } from '@/contexts/AuthContext';

const EmployeeTimesheetPage = () => {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTimeEntrySubmit = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) return null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <TimeEntryForm onSubmit={handleTimeEntrySubmit} />
        <TimeEntriesList 
          employeeId={user.uid} 
          refreshTrigger={refreshTrigger}
        />
      </Box>
    </Container>
  );
};

export default EmployeeTimesheetPage;
