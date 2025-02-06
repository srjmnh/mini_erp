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
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useProjects } from '@/contexts/ProjectContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { employees, departments } = useFirestore();
  const { projects } = useProjects();

  const menuCards = [
    {
      title: 'Employees',
      icon: <PeopleIcon sx={{ fontSize: 24 }} />,
      to: '/employees',
      color: '#4CAF50',
      count: employees.length,
      subtitle: 'Total team members',
    },
    {
      title: 'Departments',
      icon: <BusinessIcon sx={{ fontSize: 24 }} />,
      to: '/departments',
      color: '#2196F3',
      count: departments.length,
      subtitle: 'Active departments',
    },
    {
      title: 'Projects',
      icon: <ProjectsIcon sx={{ fontSize: 24 }} />,
      to: '/projects',
      color: '#9C27B0',
      count: projects.length,
      subtitle: 'Ongoing projects',
    },
    {
      title: 'Documents',
      icon: <DocumentsIcon sx={{ fontSize: 24 }} />,
      to: '/documents',
      color: '#FF9800',
      subtitle: 'Document management',
    },
    {
      title: 'HR',
      icon: <HRIcon sx={{ fontSize: 24 }} />,
      to: '/hr',
      color: '#F44336',
      subtitle: 'Human resources',
    },
    {
      title: 'Settings',
      icon: <SettingsIcon sx={{ fontSize: 24 }} />,
      to: '/settings',
      color: '#607D8B',
      subtitle: 'System preferences',
    },
  ];

  const recentProjects = projects.slice(0, 3);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        Welcome back!
      </Typography>

      {/* Main Menu Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {menuCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
              onClick={() => navigate(card.to)}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Avatar
                      sx={{
                        bgcolor: card.color,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {card.icon}
                    </Avatar>
                    <IconButton
                      size="small"
                      sx={{
                        bgcolor: theme.palette.action.hover,
                        '&:hover': { bgcolor: theme.palette.action.selected },
                      }}
                    >
                      <ArrowForwardIcon />
                    </IconButton>
                  </Stack>

                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>

                  {card.count !== undefined && (
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {card.count}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Projects */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Recent Projects
      </Typography>
      <Grid container spacing={3}>
        {recentProjects.map((project) => (
          <Grid item xs={12} md={4} key={project.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Typography variant="h6">{project.name}</Typography>
                    <Avatar
                      sx={{
                        bgcolor: project.priority === 'high' ? '#F44336' : 
                                project.priority === 'medium' ? '#FF9800' : '#4CAF50',
                        width: 32,
                        height: 32,
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {project.description}
                  </Typography>

                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2">
                        {project.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={project.progress}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: theme.palette.action.hover,
                      }}
                    />
                  </Box>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 30, height: 30 } }}>
                      {project.members.map((member) => {
                        const employee = employees.find(e => e.id === member.employeeId);
                        return (
                          <Avatar
                            key={member.employeeId}
                            src={employee?.photoUrl}
                            alt={employee ? `${employee.firstName} ${employee.lastName}` : ''}
                          >
                            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : ''}
                          </Avatar>
                        );
                      })}
                    </AvatarGroup>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(project.startDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
