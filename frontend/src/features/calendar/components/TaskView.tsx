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
  LinearProgress,
  Slider,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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

interface Props {
  userId: string;
  isDepartmentView?: boolean;
}

export const TaskView: React.FC<Props> = ({ userId, isDepartmentView = false }) => {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [progressTask, setProgressTask] = useState<Task | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressComment, setProgressComment] = useState('');
  const [newProgress, setNewProgress] = useState(0);

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

  const loadDepartmentEmployees = useCallback(async () => {
    if (!isDepartmentView) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;
      
      const departmentId = userDoc.data().departmentId;
      if (!departmentId) return;

      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('departmentId', '==', departmentId));
      const snapshot = await getDocs(q);
      
      setDepartmentEmployees(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading department employees:', error);
    }
  }, [userId, isDepartmentView]);

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
    if (isDepartmentView) {
      loadDepartmentEmployees();
    }
  }, [isDepartmentView, loadDepartmentEmployees]);

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

  const handleAddTask = () => {
    setEditingTask({
      title: '',
      description: '',
      assigneeId: userId,
      departmentId: '',
      dueDate: new Date(),
      progress: 0,
      completed: false,
      priority: 'medium'
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleOpenProgressDialog = (task: Task) => {
    setProgressTask(task);
    setNewProgress(task.progress || 0);
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async (task: Task, newProgress: number, comment: string) => {
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

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tasks</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={handleAddTask}
          >
            Add Task
          </Button>
        </Box>

        <List sx={{ width: '100%' }}>
          {tasks.map((task) => {
            const latestUpdate = getLatestUpdate(task);
            return (
              <ListItem
                key={task.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  mb: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                      sx={{ ml: -1, mr: 1 }}
                    />
                    <Typography sx={{ fontSize: '0.95rem' }}>
                      {task.title}
                    </Typography>
                    <Box
                      sx={{
                        ml: 1,
                        px: 1,
                        py: 0.2,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        bgcolor: task.priority === 'high' ? 'error.main' : 
                                task.priority === 'medium' ? 'warning.main' : 'success.main',
                        color: 'white'
                      }}
                    >
                      {task.priority}
                    </Box>
                  </Box>

                  <Box sx={{ pl: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Progress: {task.progress || 0}%
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenProgressDialog(task)}
                            sx={{ 
                              ml: 'auto',
                              color: 'text.secondary',
                              '&:hover': { color: 'primary.main' }
                            }}
                          >
                            Add Progress
                          </Button>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress || 0}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: task.completed ? 'success.main' : 'primary.main'
                            }
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Latest Update Section */}
                    {task.latestComment && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Latest Update:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                          <Typography variant="body2">
                            {task.latestComment.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            by {task.latestComment.userName} • {format(task.latestComment.timestamp.toDate(), 'MMM d, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Comments Section */}
                    {task.comments && task.comments.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: 'text.secondary' }}>
                          Updates:
                        </Typography>
                        <Box sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {task.comments.map((comment, index) => (
                            <Box 
                              key={index}
                              sx={{ 
                                mb: 1,
                                p: 1,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                '&:last-child': { mb: 0 }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Avatar 
                                  sx={{ 
                                    width: 20, 
                                    height: 20, 
                                    fontSize: '0.75rem',
                                    bgcolor: 'primary.main',
                                    mr: 1
                                  }}
                                >
                                  {comment.userName?.charAt(0) || 'U'}
                                </Avatar>
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                  {comment.userName}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ ml: 'auto' }}
                                >
                                  {format(comment.timestamp, 'MMM d, HH:mm')}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ ml: 3.5 }}>
                                {comment.text}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>
                                Progress updated to {comment.progress}%
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Due: {format(task.dueDate || new Date(), 'MMM d, yyyy')}
                      </Typography>
                      <Avatar 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          fontSize: '0.75rem',
                          bgcolor: 'grey.400'
                        }}
                      >
                        {userNames[task.assigneeId]?.charAt(0) || 'U'}
                      </Avatar>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
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
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Paper>

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
