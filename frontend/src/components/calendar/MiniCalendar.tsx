import React from 'react';
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
} from '@mui/material';
import {
  Today as CalendarIcon,
  OpenInNew as OpenInNewIcon,
  Event as EventIcon,
  Assignment as TaskIcon,
  CheckCircle as TodoIcon,
} from '@mui/icons-material';
import { format, isSameDay } from 'date-fns';
import { useProjects } from '@/contexts/ProjectContext';

export const MiniCalendar = () => {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedDate] = React.useState(new Date());

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

  // Get today's events
  const todaysEvents = React.useMemo(() => {
    const events = [];
    
    // Add project deadlines
    projects.forEach(project => {
      if (project.endDate && isSameDay(new Date(project.endDate), selectedDate)) {
        events.push({
          type: 'project',
          title: `${project.name} Due`,
          priority: project.priority,
        });
      }

      // Add project tasks
      project.tasks?.forEach(task => {
        if (task.dueDate && isSameDay(new Date(task.dueDate), selectedDate)) {
          events.push({
            type: 'task',
            title: task.title,
            priority: task.priority,
          });
        }
      });
    });

    return events;
  }, [projects, selectedDate]);

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
                        <Chip
                          label={event.priority}
                          size="small"
                          color={
                            event.priority === 'high' ? 'error' :
                            event.priority === 'medium' ? 'warning' :
                            'success'
                          }
                        />
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
