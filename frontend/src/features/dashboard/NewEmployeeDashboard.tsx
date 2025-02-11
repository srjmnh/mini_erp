import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTasks } from '@/hooks/useTasks';
import { TaskSection } from './components/TaskSection';
import { TeamMemberCard } from '@/components/team/TeamMemberCard';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { TimeOffCard } from '@/components/timeoff/TimeOffCard';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';

class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export const NewEmployeeDashboard: React.FC = () => {
  // State
  const [tabValue, setTabValue] = useState(0);

  // Hooks
  const navigate = useNavigate();
  const { user, loading: authLoading, userRole } = useAuth();
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask } = useTasks();
  const { 
    teamMembers, 
    projects, 
    timeOffBalance,
    loading: dashboardLoading, 
    error: dashboardError 
  } = useDashboardData();

  // Effects
  useEffect(() => {
    if (!user || !userRole) return;

    console.log('Dashboard State:', {
      user: { uid: user.uid, email: user.email },
      userRole,
      tasksCount: tasks?.length || 0,
      teamMembersCount: teamMembers?.length || 0,
      projectsCount: projects?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [user, userRole, tasks, teamMembers, projects]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Show error if no user is found after auth is done loading
  if (!authLoading && !user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Authentication Error
        </Typography>
        <Typography color="error">
          Please log in to access the dashboard.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  // Show loading state while fetching data
  if (dashboardLoading || tasksLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading dashboard data...
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (dashboardError || tasksError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Dashboard
        </Typography>
        <Typography color="error">
          {dashboardError || tasksError}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            navigate(0); // This will refresh the current route
          }}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const tabs = [
    {
      label: 'Overview',
      content: (
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Tasks Section */}
            <Grid item xs={12} md={8}>
              <TaskSection
                tasks={tasks || []}
                onAddTask={() => addTask({ title: '', description: '', dueDate: new Date() })}
                onUpdateTask={(taskId, progress, comment, completed) => 
                  updateTask(taskId, { progress, comment, completed })
                }
                onDeleteTask={deleteTask}
                onEditTask={(task) => updateTask(task.id, task)}
              />
            </Grid>

            {/* Time Off Section */}
            <Grid item xs={12} md={4}>
              <TimeOffCard
                timeOffBalance={timeOffBalance}
                onRequestTimeOff={async (request) => {
                  // Implement time off request logic
                  console.log('Time off request:', request);
                }}
              />
            </Grid>

            {/* Calendar Section */}
            <Grid item xs={12}>
              <MiniCalendar
                userId={user?.id || ''}
                events={tasks.map(task => ({
                  id: task.id,
                  title: task.title,
                  start: task.dueDate,
                  end: task.dueDate,
                }))}
                selectedDate={new Date()}
                onDateChange={() => {}}
              />
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Projects',
      content: (
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} md={4} key={project.id}>
                <ProjectCard project={project} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
    },
    {
      label: 'Team',
      content: (
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {teamMembers.map((member) => (
              <Grid item xs={12} md={4} key={member.id}>
                <TeamMemberCard member={member} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Employee Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {tabs[tabValue].content}
    </Container>
  );
};

const WrappedDashboard: React.FC = () => (
  <DashboardErrorBoundary>
    <NewEmployeeDashboard />
  </DashboardErrorBoundary>
);

export default WrappedDashboard;
