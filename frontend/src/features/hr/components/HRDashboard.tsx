import React, { useState } from 'react';
import { Box, Container, Grid, Paper, Typography, Button, Tabs, Tab } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmployeeReports from './EmployeeReports';

const DashboardCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  to: string;
  description: string;
}> = ({ title, icon, to, description }) => (
  <Grid item xs={12} sm={6} lg={4}>
    <Paper
      component={RouterLink}
      to={to}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
          '& .icon': {
            transform: 'scale(1.1)',
          },
          '& .title': {
            color: 'primary.main',
          },
        },
      }}
    >
      <Box
        className="icon"
        sx={{
          mb: 2,
          transition: 'transform 0.3s ease',
          transform: 'scale(1)',
          '& > svg': {
            fontSize: 48,
            color: 'primary.main',
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h6"
        className="title"
        sx={{
          mb: 2,
          transition: 'color 0.3s ease',
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mb: 2,
          flexGrow: 1,
          lineHeight: 1.6,
        }}
      >
        {description}
      </Typography>
    </Paper>
  </Grid>
);

const HRDashboard: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 5 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            mb: 4,
            textAlign: 'center',
            color: (theme) => theme.palette.primary.main
          }}
        >
          Human Resources Dashboard
        </Typography>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          <DashboardCard
            title="Time & Attendance"
            icon={<AccessTimeIcon fontSize="large" />}
            to="/hr/attendance"
            description="Track employee attendance, manage timesheets, and monitor work hours in real-time."
          />
          
          <DashboardCard
            title="Payroll Management"
            icon={<MonetizationOnIcon fontSize="large" />}
            to="/hr/payroll"
            description="Process salaries, manage deductions, and handle all payroll-related operations efficiently."
          />
          
          <DashboardCard
            title="Employee Directory"
            icon={<GroupIcon fontSize="large" />}
            to="/hr/employees"
            description="Access employee profiles, contact information, and organizational structure."
          />
          
          <DashboardCard
            title="Leave Management"
            icon={<AssignmentIcon fontSize="large" />}
            to="/hr/leave"
            description="Handle leave requests, track balances, and maintain attendance policies seamlessly."
          />

          <DashboardCard
            title="Role Configuration"
            icon={<AdminPanelSettingsIcon fontSize="large" />}
            to="/hr/roles"
            description="Configure access levels, manage permissions, and define organizational roles."
          />

          <DashboardCard
            title="Employee Reports"
            icon={<AssessmentIcon fontSize="large" />}
            to="/hr/reports"
            description="View comprehensive employee data including leave history, assets, and work hours."
          />
        </Grid>
      </Box>
    </Container>
  );
};

export default HRDashboard;
