import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tab,
  Tabs,
  Divider,
  Avatar,
  AvatarGroup,
  Tooltip,
  Card,
  CardContent,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  VideoCall as VideoCallIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as TodoIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Flag as FlagIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useProjects } from '@/contexts/ProjectContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  starred?: boolean;
  userId: string;
  assigneeId?: string;
  assigneeName?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  projectId?: string;
  type: 'event' | 'project' | 'meeting';
  attendees?: string[];
  meetingLink?: string;
  userId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { projects } = useProjects();
  
  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(true);
  const [taskTabValue, setTaskTabValue] = useState(0);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'starred'>('all');

  // Events State
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Partial<Event> | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(true);

  // Load Tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(tasksQuery);
      
      const loadedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate()
      })) as Task[];
      
      setTasks(loadedTasks.sort((a, b) => {
        if (a.completed === b.completed) {
          return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
        }
        return a.completed ? 1 : -1;
      }));
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    }
  }, [user, showSnackbar]);

  // Load Events
  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(eventsQuery);
      
      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      })) as Event[];

      // Add projects as events
      const projectEvents = projects.map(project => ({
        id: project.id,
        title: project.name,
        start: new Date(project.startDate),
        end: new Date(project.endDate),
        projectId: project.id,
        type: 'project' as const,
        userId: user.uid
      }));
      
      setEvents([...loadedEvents, ...projectEvents]);
    } catch (error) {
      console.error('Error loading events:', error);
      showSnackbar('Failed to load events', 'error');
    }
  }, [user, projects, showSnackbar]);

  // Load Users
  const loadUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().email
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    loadTasks();
    loadEvents();
    loadUsers();
  }, [loadTasks, loadEvents]);

  // Task Handlers
  const handleAddTask = () => {
    setSelectedTask({
      completed: false,
      priority: 'medium'
    });
    setAssigneeId('');
    setIsNewTask(true);
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    try {
      if (!selectedTask?.title || !user) return;

      const taskData = {
        ...selectedTask,
        userId: user.uid,
        assigneeId: assigneeId || null,
        assigneeName: assigneeId ? users.find(u => u.id === assigneeId)?.name : null,
        updatedAt: new Date()
      };

      if (isNewTask) {
        await addDoc(collection(db, 'tasks'), taskData);
      } else if (selectedTask.id) {
        await updateDoc(doc(db, 'tasks', selectedTask.id), taskData);
      }

      await loadTasks();
      setIsTaskDialogOpen(false);
      showSnackbar('Task saved successfully', 'success');
    } catch (error) {
      console.error('Error saving task:', error);
      showSnackbar('Failed to save task', 'error');
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: !task.completed
      });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleToggleStarred = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        starred: !task.starred
      });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      await loadTasks();
      showSnackbar('Task deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showSnackbar('Failed to delete task', 'error');
    }
  };

  // Event Handlers
  const handleDateClick = (info: any) => {
    setSelectedEvent({
      start: info.date,
      end: new Date(info.date.getTime() + 60 * 60 * 1000), // 1 hour later
      type: 'event'
    });
    setIsNewEvent(true);
    setIsEventDialogOpen(true);
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      description: event.extendedProps?.description,
      start: event.start,
      end: event.end,
      projectId: event.extendedProps?.projectId,
      type: event.extendedProps?.type || 'event'
    });
    setIsNewEvent(false);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (!selectedEvent?.title || !selectedEvent.start || !selectedEvent.end || !user) return;

      // Don't allow editing project events
      if (selectedEvent.type === 'project') {
        showSnackbar('Cannot edit project events', 'error');
        return;
      }

      const eventData = {
        ...selectedEvent,
        userId: user.uid,
        updatedAt: new Date()
      };

      if (isNewEvent) {
        await addDoc(collection(db, 'events'), eventData);
      } else if (selectedEvent.id) {
        await updateDoc(doc(db, 'events', selectedEvent.id), eventData);
      }

      await loadEvents();
      setIsEventDialogOpen(false);
      showSnackbar('Event saved successfully', 'success');
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar('Failed to save event', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    try {
      if (!selectedEvent?.id) return;

      // Don't allow deleting project events
      if (selectedEvent.type === 'project') {
        showSnackbar('Cannot delete project events', 'error');
        return;
      }

      await deleteDoc(doc(db, 'events', selectedEvent.id));
      await loadEvents();
      setIsEventDialogOpen(false);
      showSnackbar('Event deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      showSnackbar('Failed to delete event', 'error');
    }
  };

  const getEventColor = (event: any) => {
    if (event.extendedProps?.type === 'project') return '#4caf50';
    return '#2196f3';
  };

  if (!user) {
    return <Box>Please log in to access the calendar.</Box>;
  }

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'today') {
      return task.dueDate?.toDateString() === new Date().toDateString();
    }
    if (taskFilter === 'starred') {
      return task.starred;
    }
    return true;
  });

  return (
    <Box sx={{ height: '100vh', p: 4, bgcolor: 'white' }}>
      <Grid container spacing={4} sx={{ height: '100%' }}>
        {/* Left Panel - Tasks */}
        <Grid item xs={4}>
          <Paper sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            {/* Task Header */}
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>Tasks</Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={handleAddTask}
                  sx={{
                    borderRadius: 50,
                    px: 3,
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0'
                    }
                  }}
                >
                  Add Task
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={taskFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setTaskFilter('all')}
                  startIcon={<TodoIcon />}
                  sx={{
                    borderRadius: 2,
                    flex: 1,
                    backgroundColor: taskFilter === 'all' ? '#1976d2' : 'transparent',
                    borderColor: taskFilter === 'all' ? 'transparent' : '#e0e0e0',
                    color: taskFilter === 'all' ? 'white' : '#666',
                    '&:hover': {
                      backgroundColor: taskFilter === 'all' ? '#1565c0' : '#f5f5f5'
                    }
                  }}
                >
                  All
                </Button>
                <Button
                  variant={taskFilter === 'today' ? 'contained' : 'outlined'}
                  onClick={() => setTaskFilter('today')}
                  startIcon={<TodayIcon />}
                  sx={{
                    borderRadius: 2,
                    flex: 1,
                    backgroundColor: taskFilter === 'today' ? '#1976d2' : 'transparent',
                    borderColor: taskFilter === 'today' ? 'transparent' : '#e0e0e0',
                    color: taskFilter === 'today' ? 'white' : '#666',
                    '&:hover': {
                      backgroundColor: taskFilter === 'today' ? '#1565c0' : '#f5f5f5'
                    }
                  }}
                >
                  Today
                </Button>
                <Button
                  variant={taskFilter === 'starred' ? 'contained' : 'outlined'}
                  onClick={() => setTaskFilter('starred')}
                  startIcon={<StarIcon />}
                  sx={{
                    borderRadius: 2,
                    flex: 1,
                    backgroundColor: taskFilter === 'starred' ? '#1976d2' : 'transparent',
                    borderColor: taskFilter === 'starred' ? 'transparent' : '#e0e0e0',
                    color: taskFilter === 'starred' ? 'white' : '#666',
                    '&:hover': {
                      backgroundColor: taskFilter === 'starred' ? '#1565c0' : '#f5f5f5'
                    }
                  }}
                >
                  Starred
                </Button>
              </Box>
            </Box>

            {/* Task List */}
            <List sx={{ overflow: 'auto', flexGrow: 1, p: 2 }}>
              {filteredTasks.map((task) => (
                <ListItem
                  key={task.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: '#f8f9fa',
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: '#f0f0f0',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', gap: 2 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        icon={<TodoIcon />}
                        checkedIcon={<CheckCircleIcon />}
                        checked={task.completed}
                        onChange={() => handleToggleTask(task)}
                        sx={{
                          '&.Mui-checked': {
                            color: 'success.main',
                          },
                        }}
                      />
                    </ListItemIcon>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'text.secondary' : 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.title}
                        </Typography>
                        {task.priority === 'high' && (
                          <FlagIcon color="error" fontSize="small" sx={{ flexShrink: 0 }} />
                        )}
                      </Box>
                      {task.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {task.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {task.assigneeName && (
                          <Chip
                            size="small"
                            icon={<Avatar sx={{ width: 16, height: 16 }}>{task.assigneeName[0]}</Avatar>}
                            label={task.assigneeName}
                            sx={{ maxWidth: 150 }}
                          />
                        )}
                        {task.dueDate && (
                          <Chip
                            size="small"
                            icon={<TimeIcon />}
                            label={task.dueDate.toLocaleDateString()}
                            color={new Date() > task.dueDate ? 'error' : 'default'}
                          />
                        )}
                        <Chip
                          size="small"
                          label={task.priority}
                          color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStarred(task)}
                        sx={{ color: task.starred ? 'warning.main' : 'action.disabled' }}
                      >
                        {task.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsNewTask(false);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTask(task.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Main Calendar */}
        <Grid item xs={8}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                Calendar
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2, color: '#666', borderColor: '#e0e0e0' }}
                >
                  Month
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2, color: '#666', borderColor: '#e0e0e0' }}
                >
                  Week
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2, color: '#666', borderColor: '#e0e0e0' }}
                >
                  Day
                </Button>
              </Box>
            </Box>
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: ''
              }}
              height="auto"
              aspectRatio={1.5}
              stickyHeaderDates={false}
              dayHeaderFormat={{ weekday: 'short' }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              expandRows={true}
              dayHeaderClassNames="calendar-header"
              dayCellClassNames="calendar-cell"
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventColor={getEventColor}
              height="100%"
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onClose={() => setIsTaskDialogOpen(false)}>
        <DialogTitle>{isNewTask ? 'Add Task' : 'Edit Task'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={selectedTask?.title || ''}
              onChange={(e) => setSelectedTask(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={selectedTask?.description || ''}
              onChange={(e) => setSelectedTask(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />

            <DateTimePicker
              label="Due Date"
              value={selectedTask?.dueDate || null}
              onChange={(date) => setSelectedTask(prev => ({ ...prev, dueDate: date }))}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={selectedTask?.priority || 'medium'}
                onChange={(e) => setSelectedTask(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Assign To (Optional)</InputLabel>
              <Select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                label="Assign To (Optional)"
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTask} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event/Meeting Dialog */}
      <Dialog 
        open={isEventDialogOpen} 
        onClose={() => setIsEventDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedEvent?.type === 'meeting' ? <VideoCallIcon color="primary" /> : <EventIcon color="primary" />}
            {isNewEvent ? 'Schedule ' : 'Edit '}
            {selectedEvent?.type === 'meeting' ? 'Meeting' : 'Event'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={selectedEvent?.title || ''}
              onChange={(e) => setSelectedEvent(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
              disabled={selectedEvent?.type === 'project'}
            />
            
            <TextField
              label="Description"
              value={selectedEvent?.description || ''}
              onChange={(e) => setSelectedEvent(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              disabled={selectedEvent?.type === 'project'}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DateTimePicker
                  label="Start Date & Time"
                  value={selectedEvent?.start || null}
                  onChange={(date) => setSelectedEvent(prev => ({ ...prev, start: date }))}
                  disabled={selectedEvent?.type === 'project'}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={6}>
                <DateTimePicker
                  label="End Date & Time"
                  value={selectedEvent?.end || null}
                  onChange={(date) => setSelectedEvent(prev => ({ ...prev, end: date }))}
                  disabled={selectedEvent?.type === 'project'}
                  sx={{ width: '100%' }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={selectedEvent?.type || 'event'}
                onChange={(e) => setSelectedEvent(prev => ({ ...prev, type: e.target.value }))}
                disabled={selectedEvent?.type === 'project'}
              >
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
              </Select>
            </FormControl>

            {selectedEvent?.type === 'meeting' && (
              <>
                <TextField
                  label="Meeting Link"
                  value={selectedEvent?.meetingLink || ''}
                  onChange={(e) => setSelectedEvent(prev => ({ ...prev, meetingLink: e.target.value }))}
                  fullWidth
                  placeholder="https://meet.google.com/..."
                />

                <FormControl fullWidth>
                  <InputLabel>Attendees</InputLabel>
                  <Select
                    multiple
                    value={selectedEvent?.attendees || []}
                    onChange={(e) => setSelectedEvent(prev => ({ 
                      ...prev, 
                      attendees: typeof e.target.value === 'string' ? 
                        e.target.value.split(',') : 
                        e.target.value 
                    }))}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {['john@example.com', 'jane@example.com', 'bob@example.com'].map((email) => (
                      <MenuItem key={email} value={email}>
                        {email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {!isNewEvent && selectedEvent?.type !== 'project' && (
            <Button 
              onClick={handleDeleteEvent} 
              color="error"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
          {selectedEvent?.type !== 'project' && (
            <Button 
              onClick={handleSaveEvent} 
              variant="contained"
              startIcon={selectedEvent?.type === 'meeting' ? <VideoCallIcon /> : <EventIcon />}
            >
              {isNewEvent ? 'Schedule' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;
