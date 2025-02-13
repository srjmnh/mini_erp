import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import EmployeeReports from '../components/EmployeeReports';

export default function EmployeeReportPage() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Employee Reports
        </Typography>
        <EmployeeReports />
      </Box>
    </Container>
  );
}
