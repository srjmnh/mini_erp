import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Event as EventIcon,
  Assignment as TaskIcon,
  CheckCircle as TodoIcon,
  OpenInNew as OpenInNewIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Send as SendIcon,
  Flag as FlagIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format, isSameDay } from 'date-fns';
import { MiniCalendar } from './MiniCalendar';
import { useNavigate } from 'react-router-dom';

interface QuickCalendarViewProps {
  events: Array<{
    type: 'project' | 'task' | 'todo';
    title: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: Date;
    endDate?: Date;
  }>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddTask: (title: string) => void;
}

export const QuickCalendarView: React.FC<QuickCalendarViewProps> = ({
  events,
  selectedDate,
  onDateChange,
  onAddTask,
}) => {
  const [newTask, setNewTask] = useState('');
  const navigate = useNavigate();

  const handleAddTask = () => {
    if (newTask.trim()) {
      onAddTask(newTask.trim());
      setNewTask('');
    }
  };

  const todayEvents = events.filter(event => {
    const eventDate = event.dueDate || event.endDate;
    return eventDate && isSameDay(eventDate, selectedDate);
  });

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRadius: 2,
      }}
    >
      {/* Mini Calendar */}
      <MiniCalendar
        events={events}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      <Divider />

      {/* Quick Task Creator */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Add Task</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Add a task for today..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddTask();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  size="small"
                  disabled={!newTask.trim()}
                  onClick={handleAddTask}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      {/* Today's Events */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {format(selectedDate, "MMMM d, yyyy")}
        </Typography>
        {todayEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events scheduled
          </Typography>
        ) : (
          <List dense>
            {todayEvents.map((event, index) => (
              <ListItem
                key={index}
                disableGutters
                sx={{
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'background.default',
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {event.type === 'project' ? (
                        <EventIcon fontSize="small" color="primary" />
                      ) : event.type === 'task' ? (
                        <TaskIcon fontSize="small" color="info" />
                      ) : (
                        <TodoIcon fontSize="small" color="warning" />
                      )}
                      <Typography variant="body2">{event.title}</Typography>
                    </Stack>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      {event.priority && (
                        <Chip
                          size="small"
                          icon={<FlagIcon />}
                          label={event.priority}
                          color={
                            event.priority === 'high'
                              ? 'error'
                              : event.priority === 'medium'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      )}
                      {(event.dueDate || event.endDate) && (
                        <Chip
                          size="small"
                          icon={<TimeIcon />}
                          label={format(event.dueDate || event.endDate!, 'h:mm a')}
                        />
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};
