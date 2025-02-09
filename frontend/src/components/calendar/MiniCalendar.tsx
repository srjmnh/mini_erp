import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
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
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, subDays, addDays } from 'date-fns';
import { useProjects } from '@/contexts/ProjectContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

interface MiniCalendarProps {
  userId: string;
  events?: Array<{
    id: string;
    title: string;
    start: Date | string;
    end?: Date | string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    allDay?: boolean;
    extendedProps?: any;
  }>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddTask?: (date: Date) => void;
  renderEventContent?: (eventInfo: any) => React.ReactNode;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  userId,
  events = [],
  selectedDate,
  onDateChange,
  onAddTask,
  renderEventContent
}) => {
  const calendarRef = useRef<any>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [todaysEvents, setTodaysEvents] = useState<Array<{
    type: 'project' | 'task' | 'event';
    title: string;
    time?: string;
    priority?: 'low' | 'medium' | 'high';
    isPublic?: boolean;
  }>>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  // Safe date formatting
  const formatEventDate = (date: any): string => {
    if (!date) return '';
    try {
      // If it's a Firebase Timestamp
      if (date?.toDate) {
        const converted = date.toDate();
        if (isNaN(converted.getTime())) return '';
        return format(converted, 'MMM dd, yyyy');
      }
      
      // If it's already a Date
      if (date instanceof Date) {
        if (isNaN(date.getTime())) return '';
        return format(date, 'MMM dd, yyyy');
      }
      
      // If it's an ISO string
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return '';
        return format(parsed, 'MMM dd, yyyy');
      }
      
      // If it's a timestamp number
      if (typeof date === 'number') {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return '';
        return format(parsed, 'MMM dd, yyyy');
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting date:', error, { date });
      return '';
    }
  };

  // Safe calendar events with proper date handling
  const safeCalendarEvents = useMemo(() => {
    return calendarEvents.map(event => ({
      ...event,
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end)
    }));
  }, [calendarEvents]);

  // Load today's events
  useEffect(() => {
    const loadTodayEvents = async () => {
      if (!userId) return;

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const events: Array<{
          type: 'project' | 'task' | 'event';
          title: string;
          time?: string;
          priority?: 'low' | 'medium' | 'high';
          isPublic?: boolean;
        }> = [];

        // Load tasks
        const tasksRef = collection(db, 'tasks');
        const tasksQuery = query(
          tasksRef,
          where('assigneeId', '==', userId),
          where('dueDate', '>=', today),
          where('dueDate', '<', tomorrow)
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.docs.forEach(doc => {
          const taskData = doc.data();
          events.push({
            type: 'task',
            title: taskData.title,
            time: taskData.dueDate ? format(taskData.dueDate.toDate(), 'HH:mm') : undefined,
            priority: taskData.priority
          });
        });

        // Load events from Firestore
        const eventsRef = collection(db, 'events');
        
        // Get all events for today
        const eventsQuery = query(
          eventsRef,
          where('start', '>=', today),
          where('start', '<', tomorrow)
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        
        // Process each event based on visibility rules
        eventsSnapshot.docs.forEach(doc => {
          const eventData = doc.data();
          const attendees = eventData.attendees || [];
          const isPublic = attendees.length === 0;
          const isCreator = eventData.userId === userId;
          const isInvited = attendees.some((a: any) => a.id === userId);
          
          // Add event if:
          // 1. It's public (no attendees), or
          // 2. User is the creator, or
          // 3. User is in the attendees list
          if (isPublic || isCreator || isInvited) {
            events.push({
              type: 'event',
              title: `${eventData.title}${isCreator ? ' (Created)' : isInvited ? ' (Invited)' : ''}`,
              time: eventData.start ? format(eventData.start.toDate(), 'HH:mm') : undefined,
              isPublic
            });
          }
        });

        // Sort events by time
        const sortedEvents = events.sort((a, b) => {
          const timeA = a.time ? new Date(`1970/01/01 ${a.time}`).getTime() : 0;
          const timeB = b.time ? new Date(`1970/01/01 ${b.time}`).getTime() : 0;
          return timeA - timeB;
        });

        setTodaysEvents(sortedEvents);
      } catch (error) {
        console.error('Error loading today\'s events:', error);
      }
    };

    loadTodayEvents();
  }, [userId]);

  const loadEvents = useCallback(async () => {
    if (!userId) return;
    try {
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      
      // Get all events and filter based on visibility rules
      const events = eventsSnapshot.docs.map(doc => {
        const eventData = doc.data();
        const attendees = eventData.attendees || [];
        const isPublic = attendees.length === 0;
        const isCreator = eventData.userId === userId;
        const isInvited = attendees.some((a: any) => a.id === userId);

        // Show event if it's public OR user is creator OR user is invited
        if (isPublic || isCreator || isInvited) {
          return {
            id: doc.id,
            ...eventData,
            start: eventData.start?.toDate(),
            end: eventData.end?.toDate(),
            title: eventData.title,
            isPublic,
            isCreator,
            isInvited
          };
        }
        return null;
      }).filter(Boolean);

      // Also get project events (these are always visible)
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);
      
      let projectEvents = [];
      
      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        
        // Add project itself as an event if it has dates
        if (projectData.startDate && projectData.endDate) {
          projectEvents.push({
            id: `project-${projectDoc.id}`,
            title: `Project: ${projectData.name}`,
            start: new Date(projectData.startDate),
            end: new Date(projectData.endDate),
            type: 'project',
            isPublic: true
          });
        }
        
        // Get project-specific events
        const projectEventsRef = collection(db, `projects/${projectDoc.id}/events`);
        const projectEventsSnapshot = await getDocs(projectEventsRef);
        
        const eventsFromProject = projectEventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start?.toDate(),
          end: doc.data().end?.toDate(),
          type: 'project',
          isPublic: true
        }));
        
        projectEvents = [...projectEvents, ...eventsFromProject];
      }

      // Combine all events and sort by date
      const allEvents = [...events, ...projectEvents].sort((a, b) => 
        (a.start?.getTime() || 0) - (b.start?.getTime() || 0)
      );

      return allEvents;
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, [userId]);

  // Load all events when component mounts or user changes
  useEffect(() => {
    const fetchEvents = async () => {
      const events = await loadEvents();
      setCalendarEvents(events || []);
    };
    fetchEvents();
  }, [loadEvents]);

  return (
    <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          Calendar
        </Typography>
        <Box>
          <IconButton
            size="small"
            onClick={() => navigate('/calendar')}
            sx={{ ml: 1 }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Today's Date */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          {format(new Date(), 'MMMM d, yyyy')}
        </Typography>
      </Box>

      {/* Today's Events */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Today's Events
        </Typography>
        {safeCalendarEvents
          .filter(event => isSameDay(new Date(event.start), new Date()))
          .map((event) => (
            <Box
              key={event.id}
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 1,
                bgcolor: event.isPublic ? 'success.light' :
                  event.type === 'project' ? 'secondary.light' : 'primary.light',
                color: event.isPublic ? 'success.dark' :
                  event.type === 'project' ? 'secondary.dark' : 'primary.dark',
              }}
            >
              <Typography variant="body2">
                {event.title}
                {event.isCreator ? ' (Created)' : 
                 event.isInvited ? ' (Invited)' : 
                 event.isPublic ? ' (Public)' : ''}
              </Typography>
              {event.start && (
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon fontSize="small" />
                  {format(new Date(event.start), 'h:mm a')}
                </Typography>
              )}
            </Box>
          ))}
        {safeCalendarEvents.filter(event => 
          isSameDay(new Date(event.start), new Date())
        ).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No events scheduled for today
          </Typography>
        )}
      </Box>

      {/* Upcoming Events */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Upcoming Events
        </Typography>
        {safeCalendarEvents
          .filter(event => {
            const eventDate = new Date(event.start);
            const today = new Date();
            return eventDate > today && !isSameDay(eventDate, today);
          })
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          .slice(0, 5)
          .map((event) => (
            <Box
              key={event.id}
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 1,
                bgcolor: event.isPublic ? 'success.light' :
                  event.type === 'project' ? 'secondary.light' : 'primary.light',
                color: event.isPublic ? 'success.dark' :
                  event.type === 'project' ? 'secondary.dark' : 'primary.dark',
              }}
            >
              <Typography variant="body2">
                {event.title}
                {event.isCreator ? ' (Created)' : 
                 event.isInvited ? ' (Invited)' : 
                 event.isPublic ? ' (Public)' : ''}
              </Typography>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon fontSize="small" />
                {format(new Date(event.start), 'MMM d, h:mm a')}
              </Typography>
            </Box>
          ))}
        {safeCalendarEvents.filter(event => {
          const eventDate = new Date(event.start);
          const today = new Date();
          return eventDate > today && !isSameDay(eventDate, today);
        }).length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No upcoming events
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
