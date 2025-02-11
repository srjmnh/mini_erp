import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Tab,
  Tabs,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  Event as EventIcon,
  Group as TeamIcon,
  Chat as ChatIcon,
  AccessTime as TimeIcon,
  Star as StarIcon,
  Flag as FlagIcon,
  MoreVert as MoreIcon,
  Comment as CommentIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { TaskStatus } from '@/config/project-schema';
import { MiniCalendar } from '../calendar/components/MiniCalendar';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  progress: number;
  comments: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: Date;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 2 }}>
    {value === index && children}
  </Box>
);

// Task Card Component
const TaskCard: React.FC<{ task: Task; onStatusChange: (id: string, completed: boolean) => void }> = ({ task, onStatusChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                size="small"
                onClick={() => onStatusChange(task.id, !task.completed)}
                color={task.completed ? 'success' : 'default'}
              >
                <CheckCircleIcon />
              </IconButton>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {task.title}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {task.description}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip
                size="small"
                icon={<FlagIcon />}
                label={task.priority}
                color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'}
              />
              {task.dueDate && (
                <Chip
                  size="small"
                  icon={<TimeIcon />}
                  label={format(task.dueDate, 'MMM d')}
                  color={new Date() > task.dueDate ? 'error' : 'default'}
                />
              )}
              {task.comments?.length > 0 && (
                <Chip
                  size="small"
                  icon={<CommentIcon />}
                  label={task.comments.length}
                />
              )}
            </Box>
            <Box sx={{ width: '100%', mt: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={task.progress}
                  color={task.progress < 50 ? 'error' : task.progress < 100 ? 'warning' : 'success'}
                  sx={{ flex: 1, height: 6, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {task.progress}%
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton onClick={handleMenuClick}>
            <MoreIcon />
          </IconButton>
        </Box>
      </CardContent>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Edit Task</MenuItem>
        <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
        <MenuItem onClick={handleMenuClose}>Add Comment</MenuItem>
      </Menu>
    </Card>
  );
};

export const EmployeeDashboardNew = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load tasks from calendar and projects
  const loadTasks = useCallback(async () => {
    if (!user) return;

    try {
      // Get tasks from calendar
      const calendarTasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        orderBy('dueDate', 'asc')
      );
      const calendarTasksSnapshot = await getDocs(calendarTasksQuery);
      const calendarTasks = calendarTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate()
      })) as Task[];

      // Get project tasks
      const projectTasksPromises = (await getDocs(collection(db, 'projects'))).docs.map(async (projectDoc) => {
        const tasksQuery = query(
          collection(db, `projects/${projectDoc.id}/tasks`),
          where('assigneeId', '==', user.uid)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        return tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          projectId: projectDoc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate()
        }));
      });
      const projectTasks = (await Promise.all(projectTasksPromises)).flat();

      // Combine and sort all tasks
      const allTasks = [...calendarTasks, ...projectTasks].sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        return 0;
      });

      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showSnackbar]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskStatusChange = async (taskId: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        completed,
        updatedAt: new Date()
      });
      await loadTasks();
      showSnackbar('Task status updated', 'success');
    } catch (error) {
      console.error('Error updating task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  const getTodaysTasks = () => tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    return (
      task.dueDate.getDate() === today.getDate() &&
      task.dueDate.getMonth() === today.getMonth() &&
      task.dueDate.getFullYear() === today.getFullYear()
    );
  });

  const getUpcomingTasks = () => tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    return task.dueDate > today;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Tasks Section */}
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <TaskIcon />
                  <Typography variant="h6">Tasks & Activities</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab
                  icon={<TodayIcon />}
                  label="Today"
                  iconPosition="start"
                />
                <Tab
                  icon={<CalendarIcon />}
                  label="Upcoming"
                  iconPosition="start"
                />
                <Tab
                  icon={<StarIcon />}
                  label="All Tasks"
                  iconPosition="start"
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {getTodaysTasks().map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                  />
                ))}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {getUpcomingTasks().map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                  />
                ))}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                  />
                ))}
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Mini Calendar */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon />
                  <Typography variant="h6">Calendar</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <MiniCalendar />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EventIcon />
                  <Typography variant="h6">Quick Stats</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Badge badgeContent={getTodaysTasks().length} color="primary">
                      <TodayIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary="Today's Tasks"
                    secondary={`${getTodaysTasks().filter(t => t.completed).length} completed`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Badge badgeContent={getUpcomingTasks().length} color="warning">
                      <CalendarIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary="Upcoming Tasks"
                    secondary={`Due in next 7 days`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Badge badgeContent={tasks.filter(t => t.completed).length} color="success">
                      <CheckCircleIcon />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary="Completed Tasks"
                    secondary={`${Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}% completion rate`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EmployeeDashboardNew;
