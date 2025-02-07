import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Typography,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  userId: string;
}

interface Props {
  userId: string;
}

export const TaskView: React.FC<Props> = ({ userId }) => {
  const { showSnackbar } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('userId', '==', userId));
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
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = () => {
    setSelectedTask({
      completed: false,
      priority: 'medium'
    });
    setIsNewTask(true);
    setIsDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsNewTask(false);
    setIsDialogOpen(true);
  };

  const handleSaveTask = async () => {
    try {
      if (!selectedTask?.title) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const taskData = {
        ...selectedTask,
        userId,
        updatedAt: new Date()
      };

      if (isNewTask) {
        await addDoc(collection(db, 'tasks'), taskData);
      } else if (selectedTask.id) {
        await updateDoc(doc(db, 'tasks', selectedTask.id), taskData);
      }

      await loadTasks();
      setIsDialogOpen(false);
      showSnackbar('Task saved successfully', 'success');
    } catch (error) {
      console.error('Error saving task:', error);
      showSnackbar('Failed to save task', 'error');
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

  const handleToggleComplete = async (task: Task) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef5350';
      case 'medium':
        return '#fb8c00';
      case 'low':
        return '#66bb6a';
      default:
        return '#2196f3';
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tasks</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleAddTask}
          >
            Add Task
          </Button>
        </Box>

        <List>
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              sx={{
                bgcolor: task.completed ? 'action.hover' : 'background.paper',
                mb: 1,
                borderRadius: 1
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={task.completed}
                  onChange={() => handleToggleComplete(task)}
                />
              </ListItemIcon>
              <ListItemText
                primary={task.title}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {task.description}
                    {task.dueDate && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Due: {task.dueDate.toLocaleDateString()}
                      </Typography>
                    )}
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: getPriorityColor(task.priority),
                        display: 'inline-block'
                      }}
                    />
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => handleEditTask(task)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDeleteTask(task.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTask} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
