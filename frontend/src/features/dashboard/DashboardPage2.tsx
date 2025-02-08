import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import ManagerDashboard from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';

export default function DashboardPage() {
  const { userRole } = useAuth();
  const { loading } = useFirestore();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Route to appropriate dashboard based on role
  if (userRole === 'manager') {
    return <ManagerDashboard />;
  }

  // Default to employee dashboard
  return <EmployeeDashboard />;
}
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
                            alt={employee?.name || ''}
                          >
                            {employee?.name ? employee.name[0] : 'U'}
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
