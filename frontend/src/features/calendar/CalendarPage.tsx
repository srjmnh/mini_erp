import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Stack,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useProjects } from '@/contexts/ProjectContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  url?: string;
  extendedProps?: {
    type: 'project' | 'task' | 'todo';
    priority: string;
    department?: string;
  };
}

export default function CalendarPage() {
  const { projects } = useProjects();
  const { departments } = useFirestore();
  const { showSnackbar } = useSnackbar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [openTodoDialog, setOpenTodoDialog] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as const,
  });

  useEffect(() => {
    // Convert projects and todos to calendar events
    const projectEvents: CalendarEvent[] = projects.flatMap(project => {
      const events: CalendarEvent[] = [];

      if (project.endDate) {
        const backgroundColor = project.priority === 'high' ? '#f44336' :
                              project.priority === 'medium' ? '#ff9800' : '#4caf50';
        
        events.push({
          id: `project-${project.id}`,
          title: `📅 ${project.name}`,
          start: project.endDate,
          allDay: true,
          backgroundColor,
          borderColor: backgroundColor,
          url: `/projects/${project.id}`,
          extendedProps: {
            type: 'project',
            priority: project.priority,
            department: project.departments?.[0]?.name,
          }
        });
      }

      // Add project tasks
      project.tasks?.forEach(task => {
        if (task.dueDate) {
          const backgroundColor = task.priority === 'high' ? '#d32f2f' :
                                task.priority === 'medium' ? '#f57c00' : '#388e3c';
          
          events.push({
            id: `task-${task.id}`,
            title: `📋 ${task.title}`,
            start: task.dueDate,
            allDay: true,
            backgroundColor,
            borderColor: backgroundColor,
            url: `/projects/${project.id}`,
            extendedProps: {
              type: 'task',
              priority: task.priority
            }
          });
        }
      });

      return events;
    });

    // Convert todos to calendar events
    const todoEvents: CalendarEvent[] = todos
      .filter(todo => todo.dueDate)
      .map(todo => ({
        id: `todo-${todo.id}`,
        title: `✓ ${todo.title}`,
        start: todo.dueDate!,
        allDay: true,
        backgroundColor: todo.priority === 'high' ? '#c62828' :
                        todo.priority === 'medium' ? '#ef6c00' : '#2e7d32',
        borderColor: todo.priority === 'high' ? '#b71c1c' :
                    todo.priority === 'medium' ? '#e65100' : '#1b5e20',
        extendedProps: {
          type: 'todo',
          priority: todo.priority
        }
      }));

    setEvents([...projectEvents, ...todoEvents]);
  }, [projects, todos]);

  const handleAddTodo = () => {
    if (!newTodo.title) {
      showSnackbar('Please enter a title', 'error');
      return;
    }

    const todo: TodoItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTodo.title,
      completed: false,
      dueDate: newTodo.dueDate,
      priority: newTodo.priority,
    };

    setTodos([...todos, todo]);
    setNewTodo({
      title: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
    });
    setOpenTodoDialog(false);
    showSnackbar('Todo added successfully', 'success');
  };

  const handleToggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    showSnackbar('Todo deleted successfully', 'success');
  };

  const handleDateClick = (arg: any) => {
    setNewTodo(prev => ({
      ...prev,
      dueDate: arg.dateStr
    }));
    setOpenTodoDialog(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)' }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={events}
              dateClick={handleDateClick}
              eventClick={(info) => {
                if (info.event.url) {
                  window.location.href = info.event.url;
                }
              }}
              height="100%"
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
            />
          </Paper>
        </Grid>

        {/* Todo List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Todo List</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setOpenTodoDialog(true)}
                  variant="contained"
                  size="small"
                >
                  Add Todo
                </Button>
              </Stack>

              <List>
                {todos.map((todo) => (
                  <ListItem
                    key={todo.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleDeleteTodo(todo.id)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                    disablePadding
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={todo.title}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          {todo.dueDate && (
                            <Typography variant="caption" color="text.secondary">
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </Typography>
                          )}
                          <Chip
                            size="small"
                            label={todo.priority}
                            color={
                              todo.priority === 'high' ? 'error' :
                              todo.priority === 'medium' ? 'warning' :
                              'success'
                            }
                          />
                        </Stack>
                      }
                      sx={{
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        color: todo.completed ? 'text.secondary' : 'text.primary',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Todo Dialog */}
      <Dialog open={openTodoDialog} onClose={() => setOpenTodoDialog(false)}>
        <DialogTitle>Add New Todo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={newTodo.title}
              onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            />
            <TextField
              label="Due Date"
              type="date"
              fullWidth
              value={newTodo.dueDate}
              onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTodo.priority}
                label="Priority"
                onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as 'low' | 'medium' | 'high' })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTodoDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTodo} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
