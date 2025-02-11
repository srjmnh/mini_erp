import React from 'react';
import { Box, Container, Grid, Paper, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';

const DashboardCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  to: string;
  description: string;
}> = ({ title, icon, to, description }) => (
  <Grid item xs={12} md={6} lg={4}>
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
        {description}
      </Typography>
      <Button
        component={RouterLink}
        to={to}
        variant="contained"
        fullWidth
      >
        View
      </Button>
    </Paper>
  </Grid>
);

const HRDashboard: React.FC = () => {
  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          HR Dashboard
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <DashboardCard
            title="Attendance"
            icon={<AccessTimeIcon fontSize="large" color="primary" />}
            to="/hr/attendance"
            description="Monitor and manage employee attendance records, view check-in/out times, and handle attendance requests."
          />
          
          <DashboardCard
            title="Payroll"
            icon={<MonetizationOnIcon fontSize="large" color="primary" />}
            to="/hr/payroll"
            description="Generate and manage monthly payroll, including overtime calculations and salary processing."
          />
          
          <DashboardCard
            title="Employees"
            icon={<GroupIcon fontSize="large" color="primary" />}
            to="/hr/employees"
            description="View and manage employee information, roles, and departments."
          />
          
          <DashboardCard
            title="Leave Management"
            icon={<AssignmentIcon fontSize="large" color="primary" />}
            to="/hr/leave"
            description="Process leave requests, track employee leave balances, and manage leave policies."
          />
        </Grid>
      </Box>
    </Container>
  );
};

export default HRDashboard;
