import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Stack,
  useTheme,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Description as DocumentsIcon,
  Work as HRIcon,
  Assignment as ProjectsIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Receipt as ExpenseIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import ManagerDashboard from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';

export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, userRole } = useAuth();
  const { employees, departments, loading } = useFirestore();
  const { projects } = useProjects();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Route based on user role
  if (userRole === 'manager') {
    return <ManagerDashboard />;
  }

  if (userRole === 'employee') {
    return <EmployeeDashboard />;
  }

  // HR roles get the full dashboard with modules
  const hrModules = [
    {
      title: 'Time Off',
      icon: AccessTimeIcon,
      link: '/hr/time-off',
      description: 'Manage employee leave requests and balances'
    },
    {
      title: 'Expenses',
      icon: ExpenseIcon,
      link: '/hr/expenses',
      description: 'Review and manage expense reports'
    },
    {
      title: 'Employees',
      icon: PeopleIcon,
      link: '/hr/employees',
      description: 'View and manage employee information'
    },
    {
      title: 'Departments',
      icon: BusinessIcon,
      link: '/hr/departments',
      description: 'Manage department structure and assignments'
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        HR Dashboard
      </Typography>

      <Grid container spacing={3}>
        {hrModules.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[4],
                  transform: 'translateY(-4px)',
                  transition: 'all 0.3s'
                }
              }}
              onClick={() => navigate(module.link)}
            >
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <module.icon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" component="div">
                    {module.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {module.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
