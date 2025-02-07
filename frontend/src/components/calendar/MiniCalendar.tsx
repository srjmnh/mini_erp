import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  Divider,
  Chip,
  TextField,
} from '@mui/material';
import {
  Today as CalendarIcon,
  OpenInNew as OpenInNewIcon,
  Event as EventIcon,
  Assignment as TaskIcon,
  CheckCircle as TodoIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format, isSameDay } from 'date-fns';
import { useProjects } from '@/contexts/ProjectContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface MiniCalendarProps {
  userId: string;
}

type EventPriority = 'low' | 'medium' | 'high';

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ userId }) => {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedDate] = React.useState(new Date());
  const [newTask, setNewTask] = useState('');
  const { showSnackbar } = useSnackbar();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenFullCalendar = () => {
    handleClose();
    window.location.href = '/calendar';
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTask.trim(),
        completed: false,
        priority: 'medium',
        dueDate: selectedDate,
        userId: userId,
        createdAt: serverTimestamp(),
      });
      setNewTask('');
      showSnackbar('Task created successfully', 'success');
    } catch (error) {
      console.error('Error creating task:', error);
      showSnackbar('Failed to create task', 'error');
    }
  };

  // Get today's events and tasks
  const [todaysEvents, setTodaysEvents] = React.useState<Array<{
    type: 'project' | 'task' | 'event';
    title: string;
    priority?: 'low' | 'medium' | 'high';
  }>>([]);

  React.useEffect(() => {
    const loadTodaysEvents = async () => {
      const events: Array<{
        type: 'project' | 'task' | 'event';
        title: string;
        priority?: 'low' | 'medium' | 'high';
      }> = [];
      
      try {
        // Load calendar events
        const eventsRef = collection(db, 'events');
        const eventsQuery = query(eventsRef, where('userId', '==', userId));
        const eventsSnap = await getDocs(eventsQuery);
        
        eventsSnap.docs.forEach(doc => {
          const eventData = doc.data();
          if (eventData.start && isSameDay(eventData.start.toDate(), selectedDate)) {
            events.push({
              type: 'event',
              title: eventData.title,
            });
          }
        });

        // Load tasks
        const tasksRef = collection(db, 'tasks');
        const tasksQuery = query(tasksRef, where('userId', '==', userId));
        const tasksSnap = await getDocs(tasksQuery);
        
        tasksSnap.docs.forEach(doc => {
          const taskData = doc.data();
          if (taskData.dueDate && isSameDay(taskData.dueDate.toDate(), selectedDate)) {
            events.push({
              type: 'task',
              title: taskData.title,
              priority: taskData.priority,
            });
          }
        });
        
        // Add project deadlines
        projects.forEach(project => {
          if (project.endDate && isSameDay(new Date(project.endDate), selectedDate)) {
            events.push({
              type: 'project',
              title: `${project.name} Due`,
              priority: (project.priority === 'urgent' ? 'high' : project.priority) as EventPriority,
            });
          }
        });

        setTodaysEvents(events);
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };

    loadTodaysEvents();
  }, [userId, selectedDate, projects]);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ ml: 2 }}
        aria-controls={open ? 'calendar-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <CalendarIcon />
      </IconButton>

      <Popover
        id="calendar-menu"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <Button
              endIcon={<OpenInNewIcon />}
              onClick={handleOpenFullCalendar}
              size="small"
            >
              Open Calendar
            </Button>
          </Stack>

          <Divider />

          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add a quick task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTask.trim()) {
                  handleAddTask();
                }
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={handleAddTask}
                  >
                    <AddIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>

          <Divider />

          <List sx={{ py: 0 }}>
            {todaysEvents.length > 0 ? (
              todaysEvents.map((event, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        {event.type === 'project' ? (
                          <EventIcon color="primary" fontSize="small" />
                        ) : event.type === 'task' ? (
                          <TaskIcon color="success" fontSize="small" />
                        ) : (
                          <TodoIcon color="warning" fontSize="small" />
                        )}
                        <Typography variant="body2">{event.title}</Typography>
                        {event.priority && (
                          <Chip
                            label={event.priority}
                            size="small"
                            color={
                              event.priority === 'high' ? 'error' :
                              event.priority === 'medium' ? 'warning' :
                              'success'
                            }
                          />
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary" align="center">
                      No events for today
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>

          <Divider />

          <Box sx={{ p: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Legend:
            </Typography>
            <Stack direction="row" spacing={2} mt={0.5}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EventIcon color="primary" fontSize="small" />
                <Typography variant="caption">Projects</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TaskIcon color="success" fontSize="small" />
                <Typography variant="caption">Tasks</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TodoIcon color="warning" fontSize="small" />
                <Typography variant="caption">Todos</Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Popover>
    </>
  );
};
