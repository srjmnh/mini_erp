import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Stack,
  LinearProgress,
  Slider
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
  AccessTime as AccessTimeIcon,
  MoreVert as MoreVertIcon,
  List as ListIcon
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useProjects } from '@/contexts/ProjectContext';
import { format, isAfter } from 'date-fns';

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
  assignee?: {
    id: string;
    name: string;
    photoURL?: string;
  };
  projectId: string;
  projectName: string;
  progress: number;
  comments?: Array<{
    text: string;
    timestamp: Date;
    userId: string;
    userName: string;
    progress?: number;
  }>;
  latestComment?: {
    text: string;
    userName: string;
    timestamp: Date;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  projectId?: string;
  type: 'event' | 'project' | 'meeting';
  attendees: Array<{
    id: string;
    name: string;
    photoURL?: string;
    status?: 'pending' | 'accepted' | 'declined';
  }>;
  meetingLink?: string;
  userId: string;
  createdBy?: {
    id: string;
    name: string;
    photoURL?: string;
  };
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
  const [users, setUsers] = useState<Array<{ id: string; name: string; photoURL?: string }>>([]);
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
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      
      let allTasks = [];
      
      // Get tasks from each project
      for (const projectDoc of projectsSnapshot.docs) {
        const tasksRef = collection(db, `projects/${projectDoc.id}/tasks`);
        const tasksQuery = query(tasksRef);
        const tasksSnapshot = await getDocs(tasksQuery);
        
        // Get all unique user IDs from tasks
        const userIds = new Set(tasksSnapshot.docs.map(doc => doc.data().assigneeId).filter(Boolean));
        
        // Fetch user details in batch
        const usersRef = collection(db, 'users');
        const userSnapshots = await Promise.all(
          Array.from(userIds).map(userId => 
            getDoc(doc(usersRef, userId))
          )
        );
        
        // Create a map of user details
        const userMap = new Map(
          userSnapshots.map(snapshot => [
            snapshot.id,
            snapshot.data()
          ])
        );
        
        const projectTasks = tasksSnapshot.docs.map(doc => {
          const taskData = doc.data();
          const assigneeId = taskData.assigneeId;
          const assigneeData = assigneeId ? userMap.get(assigneeId) : null;
          
          return {
            id: doc.id,
            projectId: projectDoc.id,
            projectName: projectDoc.data().name,
            ...taskData,
            dueDate: taskData.dueDate?.toDate(),
            assignee: assigneeData ? {
              id: assigneeId,
              name: assigneeData.displayName || assigneeData.email,
              photoURL: assigneeData.photoURL
            } : null
          };
        });
        
        allTasks = [...allTasks, ...projectTasks];
      }

      // Also get tasks from root collection
      const rootTasksRef = collection(db, 'tasks');
      const rootTasksQuery = query(rootTasksRef);
      const rootTasksSnapshot = await getDocs(rootTasksQuery);
      
      // Get all unique user IDs from root tasks
      const rootUserIds = new Set(rootTasksSnapshot.docs.map(doc => doc.data().assigneeId).filter(Boolean));
      
      // Fetch user details in batch
      const rootUsersRef = collection(db, 'users');
      const rootUserSnapshots = await Promise.all(
        Array.from(rootUserIds).map(userId => 
          getDoc(doc(rootUsersRef, userId))
        )
      );
      
      // Create a map of user details
      const rootUserMap = new Map(
        rootUserSnapshots.map(snapshot => [
          snapshot.id,
          snapshot.data()
        ])
      );
      
      const rootTasks = rootTasksSnapshot.docs.map(doc => {
        const taskData = doc.data();
        const assigneeId = taskData.assigneeId;
        const assigneeData = assigneeId ? rootUserMap.get(assigneeId) : null;
        
        return {
          id: doc.id,
          ...taskData,
          dueDate: taskData.dueDate?.toDate(),
          assignee: assigneeData ? {
            id: assigneeId,
            name: assigneeData.displayName || assigneeData.email,
            photoURL: assigneeData.photoURL
          } : null
        };
      });
      
      allTasks = [...allTasks, ...rootTasks];
      
      // Sort tasks
      const sortedTasks = allTasks.sort((a, b) => {
        if (a.completed === b.completed) {
          return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
        }
        return a.completed ? 1 : -1;
      });

      console.log('Loaded tasks:', sortedTasks);
      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    }
  }, [user, showSnackbar]);

  // Load Events
  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      // Load all events
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      
      // Load project events
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      
      let allEvents = [];
      
      // Process regular events with visibility rules
      const regularEvents = eventsSnapshot.docs.map(doc => {
        const eventData = doc.data();
        const attendees = eventData.attendees || [];
        const isPublic = attendees.length === 0;
        const isCreator = eventData.userId === user.uid;
        const isInvited = attendees.some((a: any) => a.id === user.uid);

        // Only include event if it's public, user is creator, or user is invited
        if (isPublic || isCreator || isInvited) {
          return {
            id: doc.id,
            ...eventData,
            start: eventData.start?.toDate(),
            end: eventData.end?.toDate(),
            backgroundColor: isPublic ? '#4caf50' : '#2196f3',
            borderColor: isPublic ? '#4caf50' : '#2196f3',
            title: `${eventData.title}${isCreator ? ' (Created)' : isInvited ? ' (Invited)' : ''}`,
            extendedProps: {
              ...eventData,
              isPublic,
              isCreator,
              isInvited
            }
          };
        }
        return null;
      }).filter(Boolean);
      
      // Get project events (these are always visible to all)
      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        
        // Add project itself as an event if it has start and end dates
        if (projectData.startDate && projectData.endDate) {
          allEvents.push({
            id: `project-${projectDoc.id}`,
            title: `Project: ${projectData.name}`,
            start: new Date(projectData.startDate),
            end: new Date(projectData.endDate),
            type: 'project',
            projectId: projectDoc.id,
            description: projectData.description,
            backgroundColor: '#9c27b0',
            borderColor: '#9c27b0',
            extendedProps: {
              type: 'project',
              isPublic: true
            }
          });
        }
        
        // Get project-specific events
        const projectEventsRef = collection(db, `projects/${projectDoc.id}/events`);
        const projectEventsSnapshot = await getDocs(projectEventsRef);
        
        const projectEvents = projectEventsSnapshot.docs.map(doc => ({
          id: doc.id,
          projectId: projectDoc.id,
          projectName: projectData.name,
          ...doc.data(),
          start: doc.data().start?.toDate(),
          end: doc.data().end?.toDate(),
          backgroundColor: '#9c27b0',
          borderColor: '#9c27b0',
          extendedProps: {
            type: 'project',
            isPublic: true
          }
        }));
        
        allEvents = [...allEvents, ...projectEvents];
      }
      
      // Combine and sort all events
      const combinedEvents = [...regularEvents, ...allEvents].sort((a, b) => 
        (a.start?.getTime() || 0) - (b.start?.getTime() || 0)
      );

      setEvents(combinedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      showSnackbar('Failed to load events', 'error');
    }
  }, [user, showSnackbar]);

  // Load Users
  const loadUsers = useCallback(async () => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().displayName || doc.data().email,
        photoURL: doc.data().photoURL
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      showSnackbar('Failed to load users', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadTasks();
    loadEvents();
    loadUsers();
  }, [loadTasks, loadEvents, loadUsers]);

  // Task Handlers
  const handleAddTask = () => {
    setSelectedTask({
      completed: false,
      priority: 'medium'
    });
    setIsNewTask(true);
    setIsTaskDialogOpen(true);
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      
      // Determine if it's a project task or root task
      let taskRef;
      if (task.projectId) {
        // Project task
        taskRef = doc(db, `projects/${task.projectId}/tasks/${task.id}`);
      } else {
        // Root task
        taskRef = doc(db, `tasks/${task.id}`);
      }

      await updateDoc(taskRef, {
        completed: updatedTask.completed
      });

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id ? updatedTask : t
        )
      );

      showSnackbar(
        `Task ${updatedTask.completed ? 'completed' : 'uncompleted'}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string, projectId?: string) => {
    try {
      // Determine if it's a project task or root task
      let taskRef;
      if (projectId) {
        // Project task
        taskRef = doc(db, `projects/${projectId}/tasks/${taskId}`);
      } else {
        // Root task
        taskRef = doc(db, `tasks/${taskId}`);
      }

      await deleteDoc(taskRef);

      // Update local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      showSnackbar('Task deleted', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showSnackbar('Failed to delete task', 'error');
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTask?.title) return;

    try {
      const taskData = {
        title: selectedTask.title,
        description: selectedTask.description || '',
        completed: selectedTask.completed || false,
        priority: selectedTask.priority || 'medium',
        dueDate: selectedTask.dueDate || null,
        assigneeId: selectedTask.assigneeId || null,
        userId: user?.uid,
        updatedAt: new Date()
      };

      if (isNewTask) {
        let newTaskRef;
        if (selectedTask.projectId) {
          // Create task in project
          newTaskRef = collection(db, `projects/${selectedTask.projectId}/tasks`);
        } else {
          // Create task in root collection
          newTaskRef = collection(db, 'tasks');
        }

        const docRef = await addDoc(newTaskRef, {
          ...taskData,
          createdAt: new Date()
        });

        const newTask: Task = {
          id: docRef.id,
          projectId: selectedTask.projectId || '',
          projectName: projects.find(p => p.id === selectedTask.projectId)?.name || '',
          ...taskData
        };

        setTasks(prevTasks => [...prevTasks, newTask]);
        showSnackbar('Task created', 'success');
      } else {
        // Update existing task
        let taskRef;
        if (selectedTask.projectId) {
          // Update project task
          taskRef = doc(db, `projects/${selectedTask.projectId}/tasks/${selectedTask.id}`);
        } else {
          // Update root task
          taskRef = doc(db, `tasks/${selectedTask.id}`);
        }

        await updateDoc(taskRef, taskData);

        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === selectedTask.id
              ? { ...task, ...taskData }
              : task
          )
        );
        showSnackbar('Task updated', 'success');
      }

      setIsTaskDialogOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      showSnackbar('Failed to save task', 'error');
    }
  };

  const handleToggleStarred = async (task: Task) => {
    try {
      const projectId = task.projectId;
      if (!projectId) {
        console.error('Task has no project ID');
        return;
      }
      await updateDoc(doc(db, `projects/${projectId}/tasks`, task.id), {
        starred: !task.starred
      });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  // Event Handlers
  const handleDateClick = (info: any) => {
    setSelectedEvent({
      title: '',
      description: '',
      start: info.date,
      end: new Date(info.date.getTime() + 60 * 60 * 1000), // 1 hour later
      type: 'event',
      attendees: [],
      meetingLink: '',
      userId: user?.uid || '',
      createdBy: user ? {
        id: user.uid,
        name: user.displayName || user.email || 'Anonymous',
        photoURL: user.photoURL || null
      } : undefined
    });
    setIsNewEvent(true);
    setIsEventDialogOpen(true);
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title || '',
      description: event.extendedProps?.description || '',
      start: event.start || new Date(),
      end: event.end || new Date(event.start.getTime() + 60 * 60 * 1000),
      type: event.extendedProps?.type || 'event',
      attendees: event.extendedProps?.attendees || [],
      meetingLink: event.extendedProps?.meetingLink || '',
      userId: event.extendedProps?.userId || user?.uid || '',
      createdBy: event.extendedProps?.createdBy || (user ? {
        id: user.uid,
        name: user.displayName || user.email || 'Anonymous',
        photoURL: user.photoURL || null
      } : undefined)
    });
    setIsNewEvent(false);
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (!selectedEvent?.title || !selectedEvent.start || !selectedEvent.end || !user) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      // Don't allow editing project events
      if (selectedEvent.type === 'project') {
        showSnackbar('Cannot edit project events', 'error');
        return;
      }

      // Clean up attendees data to ensure valid format
      const cleanAttendees = (selectedEvent.attendees || []).map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        photoURL: attendee.photoURL || null,
        status: attendee.status || 'pending'
      }));

      // Create a clean event object with no undefined values
      const eventData = {
        title: selectedEvent.title.trim(),
        description: (selectedEvent.description || '').trim(),
        start: selectedEvent.start,
        end: selectedEvent.end,
        type: selectedEvent.type || 'event',
        attendees: cleanAttendees,
        meetingLink: (selectedEvent.meetingLink || '').trim() || null,
        userId: user.uid,
        createdBy: {
          id: user.uid,
          name: user.displayName || user.email || 'Anonymous',
          photoURL: user.photoURL || null
        },
        isPublic: cleanAttendees.length === 0,
        updatedAt: new Date()
      };

      let eventId: string;
      
      if (isNewEvent) {
        // Add creation timestamp for new events
        const newEventData = {
          ...eventData,
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'events'), newEventData);
        eventId = docRef.id;
        
        console.log('Created new event:', { eventId, data: newEventData });
      } else if (selectedEvent.id) {
        eventId = selectedEvent.id;
        await updateDoc(doc(db, 'events', eventId), eventData);
        console.log('Updated event:', { eventId, data: eventData });
      } else {
        throw new Error('Invalid event state: missing ID for existing event');
      }

      // Only send notifications for private events with attendees
      if (cleanAttendees.length > 0) {
        const notificationsRef = collection(db, 'notifications');
        const notificationPromises = cleanAttendees.map(attendee => 
          addDoc(notificationsRef, {
            userId: attendee.id,
            type: 'event_invitation',
            eventId: eventId,
            title: eventData.title,
            message: `You have been invited to "${eventData.title}" by ${eventData.createdBy.name}`,
            createdAt: new Date(),
            read: false,
            createdBy: eventData.createdBy
          })
        );
        await Promise.all(notificationPromises);
      }

      await loadEvents();
      setIsEventDialogOpen(false);
      showSnackbar('Event saved successfully', 'success');
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar(`Failed to save event: ${error.message}`, 'error');
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
    if (event.extendedProps?.type === 'project') return '#9c27b0';
    return event.extendedProps?.isPublic ? '#4caf50' : '#2196f3';
  };

  const calendarEvents = useMemo(() => {
    const allEvents = [
      // Add tasks as events
      ...tasks.filter(task => task.dueDate).map(task => ({
        id: `task-${task.id}`,
        title: `${task.title} ${task.projectName ? `(${task.projectName})` : ''}`,
        start: task.dueDate,
        end: task.dueDate,
        backgroundColor: task.completed ? '#4caf50' : '#f44336',
        borderColor: task.completed ? '#4caf50' : '#f44336',
        extendedProps: {
          description: task.description,
          type: 'task',
          completed: task.completed,
          priority: task.priority,
          projectId: task.projectId,
          projectName: task.projectName
        }
      })),
      // Add regular events
      ...events.map(event => ({
        id: `event-${event.id}`,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: getEventColor(event),
        borderColor: getEventColor(event),
        extendedProps: {
          description: event.description,
          type: event.type,
          projectId: event.projectId,
          attendees: event.attendees
        }
      }))
    ];

    console.log('Calendar events:', allEvents); // Debug log
    return allEvents;
  }, [tasks, events]);

  const renderEventContent = (eventInfo: any) => {
    const event = eventInfo.event;
    const isTask = event.extendedProps.type === 'task';
    
    return (
      <Box sx={{ p: 0.5 }}>
        <Typography variant="caption" sx={{ 
          display: 'block', 
          fontWeight: 'bold',
          color: event.extendedProps.completed ? '#4caf50' : 'inherit'
        }}>
          {event.title}
        </Typography>
        {isTask && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {event.extendedProps.completed ? (
              <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
            ) : (
              <TodoIcon fontSize="small" sx={{ color: 'warning.main' }} />
            )}
            <Typography variant="caption" sx={{ 
              color: getPriorityColor(event.extendedProps.priority)
            }}>
              {event.extendedProps.priority}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error.main';
      case 'medium':
        return 'warning.main';
      case 'low':
        return 'success.main';
      default:
        return 'text.secondary';
    }
  };

  const isOverdue = (dueDate: Date) => {
    return isAfter(new Date(), dueDate);
  };

  const formatTaskDate = (date: any): string => {
    if (!date) return '';
    try {
      // If it's a Firebase Timestamp
      if (date?.toDate) {
        return format(date.toDate(), 'MMM d, yyyy HH:mm');
      }
      
      // If it's already a Date
      if (date instanceof Date) {
        return format(date, 'MMM d, yyyy HH:mm');
      }
      
      // If it's an ISO string
      if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'MMM d, yyyy HH:mm');
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '';
    }
  };

  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [selectedTaskProgress, setSelectedTaskProgress] = useState<{
    taskId: string;
    progress: number;
    comment: string;
  }>({
    taskId: '',
    progress: 0,
    comment: ''
  });

  const handleUpdateProgress = async () => {
    try {
      const { taskId, progress, comment } = selectedTaskProgress;
      const task = tasks.find(t => t.id === taskId);
      if (!task || !user) return;

      // Get current user's name
      let userName = user.displayName;
      if (!userName) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        userName = userDoc.data()?.name || userDoc.data()?.email || 'Unknown User';
      }

      const taskRef = task.projectId 
        ? doc(db, `projects/${task.projectId}/tasks/${taskId}`)
        : doc(db, 'tasks', taskId);

      // Create new comment
      const newComment = {
        text: comment,
        timestamp: new Date(),
        userId: user.uid,
        userName: userName,
        progress
      };

      const update = {
        progress,
        lastUpdated: new Date(),
        comments: [newComment, ...(task.comments || [])],
        latestComment: {
          text: comment,
          userName: userName,
          timestamp: new Date()
        }
      };

      await updateDoc(taskRef, update);
      await loadTasks(); // Reload tasks to get updated comments
      showSnackbar('Task progress updated', 'success');
      setShowProgressDialog(false);
      setSelectedTaskProgress({ taskId: '', progress: 0, comment: '' });
    } catch (error) {
      console.error('Error updating task progress:', error);
      showSnackbar('Failed to update task progress', 'error');
    }
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
    <Box sx={{ height: '100vh', bgcolor: 'white', p: 4 }}>
      <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, color: '#1a1a1a', ml: 2 }}>
        Calendar
      </Typography>
      
      <Grid container spacing={3} sx={{ height: 'calc(100vh - 180px)' }}>
        {/* Left Panel - Tasks */}
        <Grid item xs={12} md={5} sx={{ height: '100%' }}>
          <Paper 
            sx={{ 
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Tasks Header */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Tasks</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={taskFilter === 'all' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setTaskFilter('all')}
                  startIcon={<ListIcon />}
                >
                  All
                </Button>
                <Button
                  variant={taskFilter === 'today' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setTaskFilter('today')}
                  startIcon={<TodayIcon />}
                >
                  Today
                </Button>
                <Button
                  variant={taskFilter === 'starred' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setTaskFilter('starred')}
                  startIcon={<StarIcon />}
                >
                  Starred
                </Button>
              </Box>
            </Box>

            {/* Tasks List - Scrollable */}
            <Box 
              sx={{ 
                flex: 1,
                overflowY: 'auto',
                minHeight: 0,
                maxHeight: 'calc(100vh - 340px)',
                mr: -2,
                pr: 2,
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#bdbdbd',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#9e9e9e'
                  }
                }
              }}
            >
              {filteredTasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Checkbox 
                        checked={task.completed}
                        onChange={() => handleToggleTask(task)}
                        sx={{ 
                          ml: -1,
                          '&.Mui-checked': {
                            color: 'success.main'
                          }
                        }}
                      />
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 500,
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {task.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {task.assignee && (
                            <Chip
                              avatar={
                                <Avatar 
                                  src={task.assignee.photoURL} 
                                  sx={{ width: 20, height: 20 }}
                                >
                                  {task.assignee.name.charAt(0)}
                                </Avatar>
                              }
                              label={task.assignee.name}
                              size="small"
                              variant="outlined"
                              sx={{ height: 24 }}
                            />
                          )}
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              height: 24,
                              bgcolor: 
                                task.priority === 'high' ? 'error.main' :
                                task.priority === 'medium' ? 'warning.main' : 'success.main',
                              color: '#fff'
                            }}
                          />
                          {task.dueDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              {format(new Date(task.dueDate), 'MMM d')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStarred(task)}
                        sx={{ color: task.starred ? 'warning.main' : 'action.disabled' }}
                      >
                        {task.starred ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsNewTask(false);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTask(task.id, task.projectId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Progress Section */}
                  <Box sx={{ mb: task.comments?.length ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress: {task.progress || 0}%
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedTaskProgress({
                            taskId: task.id,
                            progress: task.progress || 0,
                            comment: ''
                          });
                          setShowProgressDialog(true);
                        }}
                        sx={{ 
                          ml: 'auto',
                          minWidth: 'auto',
                          color: 'primary.main',
                          '&:hover': { bgcolor: 'primary.50' }
                        }}
                      >
                        Update
                      </Button>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={task.progress || 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.100',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: task.completed ? 'success.main' : 'primary.main',
                          borderRadius: 3
                        }
                      }}
                    />
                  </Box>

                  {/* Latest Comment Section */}
                  {task.comments && task.comments.length > 0 && (
                    <Box 
                      sx={{ 
                        mt: 2,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.100'
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {task.comments[0].text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24,
                            fontSize: '0.875rem',
                            bgcolor: 'primary.main'
                          }}
                        >
                          {task.comments[0].userName.charAt(0)}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {task.comments[0].userName} • {format(task.comments[0].timestamp.toDate(), 'MMM d, HH:mm')}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>

            {/* Add Task Button - Fixed at bottom */}
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedTask(null);
                  setIsNewTask(true);
                  setIsTaskDialogOpen(true);
                }}
              >
                Add Task
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel - Calendar */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ 
            p: 3, 
            height: '700px', 
            borderRadius: 2,
            '& .fc': {
              height: '100%'
            }
          }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={calendarEvents}
              editable={false}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              height="100%"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onClose={() => setIsTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewTask ? 'Add Task' : 'Edit Task'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={selectedTask?.title || ''}
              onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={selectedTask?.description || ''}
              onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Assignee</InputLabel>
              <Select
                value={selectedTask?.assigneeId || ''}
                onChange={(e) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value })}
                label="Assignee"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.photoURL ? (
                        <Avatar src={user.photoURL} sx={{ width: 24, height: 24 }} />
                      ) : (
                        <Avatar sx={{ width: 24, height: 24 }}>{user.name[0]}</Avatar>
                      )}
                      <Typography>{user.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={selectedTask?.priority || 'medium'}
                onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <DateTimePicker
              label="Due Date"
              value={selectedTask?.dueDate || null}
              onChange={(date) => setSelectedTask({ ...selectedTask, dueDate: date })}
              renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTask} variant="contained" disabled={!selectedTask?.title}>
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
          {isNewEvent ? 'Create Event' : 'Edit Event'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={selectedEvent?.title || ''}
              onChange={(e) => setSelectedEvent(prev => prev ? { ...prev, title: e.target.value } : null)}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={selectedEvent?.description || ''}
              onChange={(e) => setSelectedEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
            
            <DateTimePicker
              label="Start Date & Time"
              value={selectedEvent?.start || null}
              onChange={(date) => setSelectedEvent(prev => prev ? { ...prev, start: date || new Date() } : null)}
            />
            
            <DateTimePicker
              label="End Date & Time"
              value={selectedEvent?.end || null}
              onChange={(date) => setSelectedEvent(prev => prev ? { ...prev, end: date || new Date() } : null)}
            />

            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={selectedEvent?.type || 'event'}
                onChange={(e) => setSelectedEvent(prev => prev ? { ...prev, type: e.target.value as Event['type'] } : null)}
              >
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
              </Select>
            </FormControl>

            {selectedEvent?.type === 'meeting' && (
              <TextField
                fullWidth
                label="Meeting Link"
                value={selectedEvent?.meetingLink || ''}
                onChange={(e) => setSelectedEvent(prev => prev ? { ...prev, meetingLink: e.target.value } : null)}
              />
            )}

            <FormControl fullWidth>
              <InputLabel>Invite Attendees</InputLabel>
              <Select
                multiple
                value={selectedEvent?.attendees?.map(a => a.id) || []}
                onChange={(e) => {
                  const selectedIds = e.target.value as string[];
                  const selectedAttendees = users
                    .filter(user => selectedIds.includes(user.id))
                    .map(user => ({
                      id: user.id,
                      name: user.name,
                      photoURL: user.photoURL,
                      status: 'pending'
                    }));
                  setSelectedEvent(prev => prev ? { ...prev, attendees: selectedAttendees } : null);
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const attendee = selectedEvent?.attendees?.find(a => a.id === value);
                      return (
                        <Chip
                          key={value}
                          label={attendee?.name}
                          avatar={attendee?.photoURL ? <Avatar src={attendee.photoURL} /> : undefined}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.photoURL ? (
                        <Avatar src={user.photoURL} sx={{ width: 24, height: 24 }} />
                      ) : (
                        <Avatar sx={{ width: 24, height: 24 }}>{user.name[0]}</Avatar>
                      )}
                      <Typography>{user.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          {!isNewEvent && (
            <Button onClick={handleDeleteEvent} color="error">
              Delete
            </Button>
          )}
          <Button onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography gutterBottom>
                Progress: {selectedTaskProgress.progress}%
              </Typography>
              <Slider
                value={selectedTaskProgress.progress}
                onChange={(_, value) => setSelectedTaskProgress(prev => ({
                  ...prev,
                  progress: value as number
                }))}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={100}
              />
            </Box>
            <TextField
              label="Comment"
              multiline
              rows={3}
              value={selectedTaskProgress.comment}
              onChange={(e) => setSelectedTaskProgress(prev => ({
                ...prev,
                comment: e.target.value
              }))}
              placeholder="Add a comment about your progress..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProgressDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateProgress}
            variant="contained"
            disabled={!selectedTaskProgress.comment.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;
