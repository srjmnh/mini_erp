import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  Checkbox,
  MenuItem,
  LinearProgress,
  Slider,
  Avatar,
  Stack,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  userId: string;
  assigneeId: string;
  status?: 'todo' | 'done';
  progress?: number;
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

interface TaskViewProps {
  userId: string;
  isDepartmentView?: boolean;
  customTaskFilter?: (tasks: any[]) => { todo: any[], inProgress: any[] };
  departmentId?: string;
}

export const TaskView: React.FC<TaskViewProps> = ({ 
  userId, 
  isDepartmentView = false,
  customTaskFilter,
  departmentId
}) => {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [progressTask, setProgressTask] = useState<Task | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressComment, setProgressComment] = useState('');
  const [newProgress, setNewProgress] = useState(0);
  const [showAddTask, setShowAddTask] = useState(false);

  // Function to get user's name from Firestore
  const fetchUserName = async (userId: string): Promise<string> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      return userData?.name || userData?.email || 'Unknown User';
    } catch (error) {
      console.error('Error fetching user name:', error);
      return 'Unknown User';
    }
  };

  // Load user names for all users in comments
  const loadUserNames = useCallback(async (userIds: string[]) => {
    try {
      const uniqueIds = [...new Set(userIds)].filter(id => !userNames[id]);
      if (uniqueIds.length === 0) return; // Skip if no new names to load
      
      const names = await Promise.all(
        uniqueIds.map(async (userId) => {
          const name = await fetchUserName(userId);
          return [userId, name] as [string, string];
        })
      );
      
      const newNames = Object.fromEntries(names);
      setUserNames(prev => ({
        ...prev,
        ...newNames
      }));
    } catch (error) {
      console.error('Error loading user names:', error);
    }
  }, []); // Remove userNames from dependencies

  // Fetch department employees
  useEffect(() => {
    const fetchDepartmentEmployees = async () => {
      if (!departmentId) return;
      
      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('departmentId', '==', departmentId));
        const querySnapshot = await getDocs(q);
        
        const employees = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDepartmentEmployees(employees);
      } catch (error) {
        console.error('Error fetching department employees:', error);
        showSnackbar('Failed to fetch department employees', 'error');
      }
    };

    fetchDepartmentEmployees();
  }, [departmentId]);

  const loadTaskComments = useCallback(async (taskId: string) => {
    try {
      console.log('Loading comments for task:', taskId);
      const commentsRef = collection(db, 'tasks', taskId, 'comments');
      const q = query(commentsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      console.log('Raw comments snapshot:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const loadedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw comment data:', data);
        
        const comment = {
          id: doc.id,
          text: data.text || '',
          progress: data.progress || 0,
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.userId || '',
          userName: data.userName || 'Unknown'
        };
        
        console.log('Processed comment:', comment);
        return comment;
      });

      console.log('Final loaded comments for task', taskId, loadedComments);
      return loadedComments;
    } catch (error) {
      console.error('Error loading comments for task', taskId, error);
      return [];
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      console.log('Starting to load tasks...');
      setTasks([]); // Clear existing tasks while loading
      const tasksRef = collection(db, 'tasks');
      
      if (isDepartmentView) {
        console.log('Loading department view tasks...');
        // First get tasks created by the manager
        const managerTasksQuery = query(tasksRef, where('userId', '==', userId));
        const managerTasksSnapshot = await getDocs(managerTasksQuery);
        
        // Get department tasks only if we have department employees
        let departmentTasksSnapshot = { docs: [] };
        if (departmentEmployees.length > 0) {
          const departmentTasksQuery = query(tasksRef, where('assigneeId', 'in', departmentEmployees.map(emp => emp.id)));
          departmentTasksSnapshot = await getDocs(departmentTasksQuery);
        }

        // Combine both sets of tasks, removing duplicates
        const allTasks = new Map();
        [...managerTasksSnapshot.docs, ...departmentTasksSnapshot.docs].forEach(doc => {
          if (!allTasks.has(doc.id)) {
            allTasks.set(doc.id, doc);
          }
        });

        // Process tasks with their comments
        const tasksWithComments = Array.from(allTasks.values()).map(doc => {
          const data = doc.data();
          console.log('Processing task:', doc.id, data);
          
          // Get comments array from task document
          const comments = (data.comments || []).map(comment => ({
            id: comment.id || '',
            text: comment.text || '',
            progress: comment.progress || 0,
            timestamp: comment.timestamp?.toDate() || new Date(),
            userId: comment.userId || '',
            userName: comment.userName || 'Unknown'
          }));
          
          console.log('Task comments:', comments);
          
          const latestComment = comments[0];
          const isCompleted = data.completed || data.status === 'done';
          
          return {
            id: doc.id,
            ...data,
            dueDate: data.dueDate?.toDate(),
            completed: isCompleted,
            status: isCompleted ? 'done' : data.status || 'todo',
            progress: latestComment?.progress || data.progress || 0,
            comments,
            latestComment: data.latestComment
          };
        });
        
        console.log('All tasks with comments:', tasksWithComments);
        
        setTasks(tasksWithComments.sort((a, b) => {
          if (a.completed === b.completed) {
            return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
          }
          return a.completed ? 1 : -1;
        }));

        // Load user names for creators and assignees
        const userIds = tasksWithComments.reduce<string[]>((acc, task) => {
          if (task.userId) acc.push(task.userId);
          if (task.assigneeId) acc.push(task.assigneeId);
          if (task.comments) {
            task.comments.forEach(comment => {
              if (comment.userId) acc.push(comment.userId);
            });
          }
          return acc;
        }, []);
        
        await loadUserNames([...new Set(userIds)]);
      } else {
        // For personal view, get tasks assigned to user
        const tasksQuery = query(tasksRef, where('assigneeId', '==', userId));
        const snapshot = await getDocs(tasksQuery);
        const loadedTasks = snapshot.docs.map(doc => {
          const data = doc.data();
          const isCompleted = data.completed || data.status === 'done';
          return {
            id: doc.id,
            ...data,
            dueDate: data.dueDate?.toDate(),
            completed: isCompleted,
            status: isCompleted ? 'done' : data.status || 'todo'
          };
        }) as Task[];
        
        setTasks(loadedTasks.sort((a, b) => {
          if (a.completed === b.completed) {
            return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
          }
          return a.completed ? 1 : -1;
        }));

        // Load user names
        const userIds = loadedTasks.reduce<string[]>((acc, task) => {
          if (task.userId) acc.push(task.userId);
          if (task.assigneeId) acc.push(task.assigneeId);
          return acc;
        }, []);
        
        await loadUserNames(userIds);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    }
  }, [userId, showSnackbar, isDepartmentView, departmentEmployees]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCloseProgressDialog = () => {
    setProgressDialogOpen(false);
    setProgressTask(null);
    setProgressComment('');
    setNewProgress(0);
  };

  const handleCloseEditDialog = () => {
    setEditingTask(null);
  };

  const handleAddTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      const finalTaskData = {
        ...taskData,
        userId: user?.uid,
        departmentId: departmentId,
        updatedAt: new Date(),
        assigneeId: taskData.assignedTo
      };

      await addDoc(collection(db, 'tasks'), finalTaskData);
      await loadTasks();
      showSnackbar('Task added successfully', 'success');
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
      showSnackbar('Failed to add task', 'error');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleOpenProgressDialog = (task: Task) => {
    setProgressTask(task);
    setNewProgress(task.progress || 0);
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async (task: Task, newProgress: number, comment: string, completed: boolean = false) => {
    try {
      if (!comment.trim()) {
        showSnackbar('Please add a comment', 'error');
        return;
      }

      if (!user) {
        showSnackbar('You must be logged in to update progress', 'error');
        return;
      }

      // Get current user's name
      let userName = user.displayName;
      if (!userName) {
        userName = await fetchUserName(user.uid);
      }

      // Create new comment
      const newComment = {
        text: comment,
        progress: newProgress,
        timestamp: new Date(),
        userId: user.uid,
        userName: userName
      };

      // Get existing comments and update task
      const taskRef = doc(db, 'tasks', task.id);
      const taskDoc = await getDoc(taskRef);
      const existingComments = taskDoc.data()?.comments || [];

      await updateDoc(taskRef, {
        progress: newProgress,
        lastUpdated: new Date(),
        comments: [newComment, ...existingComments],
        status: completed ? 'done' : 'todo',
        completed,
        latestComment: {
          text: comment,
          userName: userName,
          timestamp: new Date()
        }
      });

      // Update local state immediately
      setUserNames(prev => ({
        ...prev,
        [user.uid]: userName
      }));
      
      // Reload tasks
      await loadTasks();
      showSnackbar('Progress updated successfully', 'success');
      handleCloseProgressDialog();
    } catch (error) {
      console.error('Error updating progress:', error);
      showSnackbar('Failed to update progress', 'error');
    }
  };

  const handleSaveTask = async () => {
    try {
      if (!editingTask?.title) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const taskData = {
        ...editingTask,
        userId: user?.uid,
        assigneeId: editingTask.assigneeId || userId,
        status: editingTask.completed ? 'done' : 'todo',
        progress: editingTask.progress || 0,
        updatedAt: new Date()
      };

      if (!editingTask.id) {
        await addDoc(collection(db, 'tasks'), taskData);
      } else {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      }

      await loadTasks();
      showSnackbar('Task saved successfully', 'success');
      handleCloseEditDialog();
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
      const newCompleted = !task.completed;
      const updates = {
        completed: newCompleted,
        status: newCompleted ? 'done' : 'todo',
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'tasks', task.id), updates);
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

  const getLatestUpdate = useCallback((task: Task) => {
    if (!task.comments || task.comments.length === 0) {
      return null;
    }
    // Comments are already sorted by timestamp desc
    return task.comments[0];
  }, []);

  // Use custom filter if provided, otherwise use default organization
  const organizedTasks = customTaskFilter 
    ? customTaskFilter(tasks)
    : {
        todo: tasks.filter(task => !task.completed && task.status !== 'done'),
        inProgress: tasks.filter(task => task.completed || task.status === 'done')
      };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="600" color="primary.main">
          {isDepartmentView ? 'Department Tasks' : 'My Tasks'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddTask(true)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 3
          }}
        >
          Add Task
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* To Do Section */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#F8F9FF',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <AssignmentIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="600">To Do</Typography>
                <Typography variant="body2" color="text.secondary">
                  {organizedTasks.todo.length} tasks pending
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2}>
              {organizedTasks.todo.map((task) => (
                <Card
                  key={task.id}
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 1
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                      <Checkbox
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task)}
                        sx={{ 
                          mt: -0.5, 
                          ml: -1,
                          color: 'primary.main',
                          '&.Mui-checked': {
                            color: 'primary.main',
                          }
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {task.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              bgcolor: task.priority === 'high' ? 'error.light' : 
                                      task.priority === 'medium' ? 'warning.light' : 'success.light',
                              color: task.priority === 'high' ? 'error.dark' : 
                                    task.priority === 'medium' ? 'warning.dark' : 'success.dark',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Due {format(task.dueDate || new Date(), 'MMM d')}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTask(task)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTask(task.id)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Box sx={{ pl: 4 }}>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenProgressDialog(task)}
                        sx={{ 
                          color: 'primary.main',
                          '&:hover': { bgcolor: 'primary.lighter' }
                        }}
                      >
                        Add Progress
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* In Progress Section */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#FFF9F6',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'warning.light',
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <AutorenewIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight="600">In Progress</Typography>
                <Typography variant="body2" color="text.secondary">
                  {organizedTasks.inProgress.length} tasks ongoing
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2}>
              {organizedTasks.inProgress.map((task) => (
                <Card
                  key={task.id}
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 1
                    }
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                      <Checkbox
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task)}
                        sx={{ 
                          mt: -0.5, 
                          ml: -1,
                          color: 'warning.main',
                          '&.Mui-checked': {
                            color: 'warning.main',
                          }
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {task.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              bgcolor: task.priority === 'high' ? 'error.light' : 
                                      task.priority === 'medium' ? 'warning.light' : 'success.light',
                              color: task.priority === 'high' ? 'error.dark' : 
                                    task.priority === 'medium' ? 'warning.dark' : 'success.dark',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Due {format(task.dueDate || new Date(), 'MMM d')}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditTask(task)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTask(task.id)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Box sx={{ pl: 4 }}>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Progress: {task.progress}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress || 0}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'warning.lighter',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: 'warning.main'
                            }
                          }}
                        />
                      </Box>
                      {task.latestComment && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Latest Update
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {task.latestComment.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {task.latestComment.userName} • {format(task.latestComment.timestamp.toDate(), 'MMM d, HH:mm')}
                          </Typography>
                        </Box>
                      )}
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenProgressDialog(task)}
                        sx={{ 
                          mt: 1,
                          color: 'warning.main',
                          '&:hover': { bgcolor: 'warning.lighter' }
                        }}
                      >
                        Update Progress
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Progress Update Dialog */}
      <Dialog 
        open={progressDialogOpen} 
        onClose={handleCloseProgressDialog}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Update Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography gutterBottom>Current Progress: {progressTask?.progress || 0}%</Typography>
            <Typography gutterBottom>New Progress: {newProgress}%</Typography>
            <Slider
              value={newProgress}
              onChange={(_, value) => setNewProgress(value as number)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Add Comment"
              value={progressComment}
              onChange={(e) => setProgressComment(e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              placeholder="Describe your progress update..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProgressDialog}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (progressTask) {
                handleUpdateProgress(progressTask, newProgress, progressComment);
              }
            }}
            variant="contained"
            disabled={!progressComment.trim()}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={handleAddTask}
        departmentId={departmentId}
      />

      {/* Edit Task Dialog */}
      <Dialog 
        open={!!editingTask} 
        onClose={handleCloseEditDialog}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>{editingTask?.id ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={editingTask?.title || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editingTask?.description || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
              multiline
              rows={3}
              fullWidth
            />
            {/* Add other task fields */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveTask} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
