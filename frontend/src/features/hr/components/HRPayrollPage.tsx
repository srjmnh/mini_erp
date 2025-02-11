import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import { PayrollGenerator } from '../../payroll/components/PayrollGenerator';

const HRPayrollPage: React.FC = () => {
  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Payroll Management
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <PayrollGenerator />
        </Paper>
      </Box>
    </Container>
  );
};

export default HRPayrollPage;
