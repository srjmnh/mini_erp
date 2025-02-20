import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Checkbox,
  Chip,
  Avatar,
  LinearProgress,
  Paper,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { format } from 'date-fns';
import { AddTaskDialog } from './AddTaskDialog';

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

interface TaskManagerProps {
  userId: string;
  departmentId?: string;
  customTaskFilter?: (tasks: Task[]) => { todo: Task[], inProgress: Task[] };
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  userId,
  departmentId,
  customTaskFilter
}) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
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

  // Load Tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('departmentId', '==', departmentId));
      const querySnapshot = await getDocs(q);
      
      // Get all unique user IDs from tasks
      const userIds = new Set(querySnapshot.docs.map(doc => doc.data().assigneeId).filter(Boolean));
      
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
      
      const loadedTasks = querySnapshot.docs.map(doc => {
        const taskData = doc.data();
        const assigneeId = taskData.assigneeId;
        const assigneeData = assigneeId ? userMap.get(assigneeId) : null;
        
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
      
      // Sort tasks by completion and due date
      const sortedTasks = loadedTasks.sort((a, b) => {
        if (a.completed === b.completed) {
          return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
        }
        return a.completed ? 1 : -1;
      });

      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
    }
  }, [user, departmentId, showSnackbar]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleTask = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        completed: !task.completed
      });

      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id ? { ...t, completed: !task.completed } : t
        )
      );

      showSnackbar(
        `Task ${!task.completed ? 'completed' : 'uncompleted'}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling task:', error);
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      showSnackbar('Task deleted', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      showSnackbar('Failed to delete task', 'error');
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      const newTaskRef = await addDoc(collection(db, 'tasks'), {
        ...taskData,
        departmentId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newTask = {
        id: newTaskRef.id,
        ...taskData
      };

      setTasks(prevTasks => [...prevTasks, newTask]);
      showSnackbar('Task created successfully', 'success');
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
      showSnackbar('Failed to create task', 'error');
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

      const taskRef = doc(db, 'tasks', taskId);

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
      await loadTasks();
      showSnackbar('Task progress updated', 'success');
      setShowProgressDialog(false);
      setSelectedTaskProgress({ taskId: '', progress: 0, comment: '' });
    } catch (error) {
      console.error('Error updating task progress:', error);
      showSnackbar('Failed to update task progress', 'error');
    }
  };

  const organizedTasks = customTaskFilter 
    ? customTaskFilter(tasks)
    : {
        todo: tasks.filter(task => !task.completed && (!task.progress || task.progress === 0)),
        inProgress: tasks.filter(task => !task.completed && task.progress > 0 && task.progress < 100)
      };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="600" color="primary.main">
          Tasks
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
            sx={{
              p: 2,
              bgcolor: 'primary.50',
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="600">
                To Do
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({organizedTasks.todo.length} tasks)
              </Typography>
            </Box>

            {organizedTasks.todo.map((task) => (
              <Box
                key={task.id}
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <Checkbox
                    checked={task.completed}
                    onChange={() => handleToggleTask(task)}
                    sx={{ ml: -1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{task.title}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {task.assignee && (
                        <Chip
                          avatar={<Avatar src={task.assignee.photoURL}>{task.assignee.name.charAt(0)}</Avatar>}
                          label={task.assignee.name}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={task.priority}
                        size="small"
                        color={
                          task.priority === 'high' ? 'error' :
                          task.priority === 'medium' ? 'warning' : 'success'
                        }
                      />
                      {task.dueDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                          {format(task.dueDate, 'MMM d')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStarred(task)}
                    >
                      {task.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                {task.latestComment && (
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {task.latestComment.userName}: {task.latestComment.text}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* In Progress Section */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              bgcolor: 'warning.50',
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="600">
                In Progress
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({organizedTasks.inProgress.length} tasks)
              </Typography>
            </Box>

            {organizedTasks.inProgress.map((task) => (
              <Box
                key={task.id}
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{task.title}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {task.assignee && (
                        <Chip
                          avatar={<Avatar src={task.assignee.photoURL}>{task.assignee.name.charAt(0)}</Avatar>}
                          label={task.assignee.name}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={task.priority}
                        size="small"
                        color={
                          task.priority === 'high' ? 'error' :
                          task.priority === 'medium' ? 'warning' : 'success'
                        }
                      />
                      {task.dueDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                          {format(task.dueDate, 'MMM d')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStarred(task)}
                    >
                      {task.starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progress: {task.progress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{
                      mt: 0.5,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3
                      }
                    }}
                  />
                </Box>
                {task.latestComment && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {task.latestComment.userName}: {task.latestComment.text}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onAdd={handleAddTask}
        departmentId={departmentId}
      />
    </Box>
  );
};

export default TaskManager;
