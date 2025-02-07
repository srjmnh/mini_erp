import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Stack,
  useTheme,
  Divider,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Assignment as ProjectsIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useManagerData } from '@/hooks/useManagerData';

export default function ManagerDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { department, departmentEmployees = [], departmentProjects = [], loading, error } = useManagerData();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!department) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Department not found</Typography>
      </Box>
    );
  }

  const stats = [
    {
      title: 'Department',
      value: department.name,
      icon: <BusinessIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />,
    },
    {
      title: 'Team Members',
      value: departmentEmployees.length,
      icon: <PeopleIcon sx={{ fontSize: 24, color: theme.palette.success.main }} />,
    },
    {
      title: 'Active Projects',
      value: departmentProjects.length,
      icon: <ProjectsIcon sx={{ fontSize: 24, color: theme.palette.warning.main }} />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {department?.name || 'Department'} Dashboard
      </Typography>

      {/* Department Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {stat.icon}
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5">{stat.value}</Typography>
                  </Box>
                </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Team Members */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Team Members
          </Typography>
          <Grid container spacing={2}>
            {departmentEmployees.map((employee) => (
              <Grid item xs={12} sm={6} md={4} key={employee.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pointerEvents: 'none' }}>
                  <Avatar>{employee.firstName?.[0] || ''}{employee.lastName?.[0] || ''}</Avatar>
                  <Box>
                    <Typography variant="subtitle1">{employee.firstName || ''} {employee.lastName || ''}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {employee.role}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
      </Paper>

      {/* Active Projects */}
      <Paper elevation={1} sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Department Projects
          </Typography>
          <Grid container spacing={2}>
            {departmentProjects.map((project) => (
              <Grid item xs={12} key={project.id}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    },
                    p: 1,
                    borderRadius: 1
                  }}
                  onClick={() => navigate(`/projects/${project.id}`)}>
                  <ProjectsIcon color="primary" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">{project.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {project.status}
                    </Typography>
                  </Box>
                  <Box>
                    <AvatarGroup max={3} sx={{ justifyContent: 'flex-end' }}>
                      {project.assignedEmployees?.map((empId: string) => {
                        const employee = departmentEmployees.find(emp => emp.id === empId);
                        return employee ? (
                          <Avatar key={employee.id} alt={employee.name}>
                            {employee.name[0]}
                          </Avatar>
                        ) : null;
                      })}
                    </AvatarGroup>
                  </Box>
                </Box>
                <Box sx={{ mt: 1, bgcolor: 'background.default', borderRadius: 1, p: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress || 0}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
      </Paper>
    </Box>
  );
}
