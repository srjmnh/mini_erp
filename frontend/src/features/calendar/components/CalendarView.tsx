import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'event' | 'meeting' | 'deadline';
  priority: 'low' | 'medium' | 'high';
  userId: string;
}

interface Props {
  userId: string;
}

export const CalendarView: React.FC<Props> = ({ userId }) => {
  const { showSnackbar } = useSnackbar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewEvent, setIsNewEvent] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('userId', '==', userId));
      const snapshot = await getDocs(eventsQuery);
      
      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
      })) as CalendarEvent[];
      
      setEvents(loadedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      showSnackbar('Failed to load events', 'error');
    }
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDateSelect = (selectInfo: any) => {
    setSelectedEvent({
      start: selectInfo.start,
      end: selectInfo.end,
      type: 'event',
      priority: 'medium'
    });
    setIsNewEvent(true);
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event.toPlainObject());
    setIsNewEvent(false);
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    try {
      if (!selectedEvent?.title || !selectedEvent.start || !selectedEvent.end) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const eventData = {
        ...selectedEvent,
        userId,
        updatedAt: new Date()
      };

      if (isNewEvent) {
        await addDoc(collection(db, 'events'), eventData);
      } else if (selectedEvent.id) {
        await updateDoc(doc(db, 'events', selectedEvent.id), eventData);
      }

      await loadEvents();
      setIsDialogOpen(false);
      showSnackbar('Event saved successfully', 'success');
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar('Failed to save event', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    try {
      if (!selectedEvent?.id) return;
      
      await deleteDoc(doc(db, 'events', selectedEvent.id));
      await loadEvents();
      setIsDialogOpen(false);
      showSnackbar('Event deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event:', error);
      showSnackbar('Failed to delete event', 'error');
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2 }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          selectable
          editable
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
          }}
        />
      </Paper>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewEvent ? 'Add Event' : 'Edit Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={selectedEvent?.title || ''}
              onChange={(e) => setSelectedEvent(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={selectedEvent?.description || ''}
              onChange={(e) => setSelectedEvent(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />

            <DateTimePicker
              label="Start Date"
              value={selectedEvent?.start || null}
              onChange={(date) => setSelectedEvent(prev => ({ ...prev, start: date }))}
            />

            <DateTimePicker
              label="End Date"
              value={selectedEvent?.end || null}
              onChange={(date) => setSelectedEvent(prev => ({ ...prev, end: date }))}
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedEvent?.type || 'event'}
                onChange={(e) => setSelectedEvent(prev => ({ ...prev, type: e.target.value }))}
              >
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="deadline">Deadline</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={selectedEvent?.priority || 'medium'}
                onChange={(e) => setSelectedEvent(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          {!isNewEvent && (
            <Button onClick={handleDeleteEvent} color="error">
              Delete
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
