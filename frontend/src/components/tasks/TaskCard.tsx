import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Avatar,
  Slider
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Comment {
  id: string;
  text: string;
  progress: number;
  timestamp: Date;
  userId: string;
  userName: string;
}

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date | null;
    status?: string;
    progress?: number;
    priority?: string;
    assignedTo?: string;
    comments?: Comment[];
    latestComment?: {
      text: string;
      userName: string;
      timestamp: Date;
    };
  };
  onStatusChange: (taskId: string, newStatus: string) => void;
  onProgressUpdate?: (taskId: string, progress: number) => void;
  onEdit?: (task: any) => void;
  onUpdate?: () => void;
}

const STATUS_VALUES = ['todo', 'in_progress', 'done'];

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onProgressUpdate, onEdit, onUpdate }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progress, setProgress] = useState(task.progress || 0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadComments();
  }, [task.id]);

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, 'tasks', task.id, 'comments');
      const q = query(commentsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const loadedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(loadedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

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

  const handleUpdateProgress = async () => {
    try {
      if (!comment.trim()) {
        return;
      }

      // Get current user's name
      let userName = user?.displayName;
      if (!userName) {
        userName = await fetchUserName(user?.uid || '');
      }

      // Create new comment
      const newComment = {
        text: comment,
        progress: progress,
        timestamp: new Date(),
        userId: user?.uid || '',
        userName: userName
      };

      // Update task with new comment
      const taskRef = doc(db, 'tasks', task.id);
      const taskDoc = await getDoc(taskRef);
      const existingComments = taskDoc.data()?.comments || [];

      await updateDoc(taskRef, {
        progress: progress,
        lastUpdated: new Date(),
        comments: [newComment, ...existingComments],
        latestComment: {
          text: comment,
          userName: userName,
          timestamp: new Date()
        }
      });

      if (onProgressUpdate) {
        onProgressUpdate(task.id, progress);
      }

      setShowProgressDialog(false);
      setComment('');
      loadComments();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!STATUS_VALUES.includes(newStatus)) {
      throw new Error(`Invalid status value: ${newStatus}`);
    }
    onStatusChange(task.id, newStatus);
    handleMenuClose();
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 500 }}>
            {task.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {task.priority && (
              <Chip
                size="small"
                label={task.priority}
                color={
                  task.priority === 'high' ? 'error' :
                  task.priority === 'medium' ? 'warning' : 'success'
                }
                sx={{ textTransform: 'lowercase' }}
              />
            )}
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => onEdit?.(task)}
              sx={{ mr: 1 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                setProgress(task.progress || 0);
                setShowProgressDialog(true);
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {task.description}
          </Typography>
        )}

        <Stack spacing={1}>
          {task.assignedTo && (
            <Typography variant="body2" color="text.secondary">
              Assigned to: {task.assignedTo}
            </Typography>
          )}
          
          {task.dueDate && (
            <Typography variant="body2" color="text.secondary">
              Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </Typography>
          )}

          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Progress:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: task.status === 'done' ? 'success.main' : 'primary.main'
                }
              }}
            />
          </Box>

          {task.latestComment && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Latest Update
              </Typography>
              <Box sx={{ mt: 0.5, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                <Typography variant="body2">
                  {task.latestComment.text}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    by {task.latestComment.userName} • {format(task.latestComment.timestamp.toDate(), 'MMM d, yyyy HH:mm')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Comments Section */}
          {comments && comments.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: 'text.secondary' }}>
                Updates:
              </Typography>
              <Box sx={{ maxHeight: '150px', overflowY: 'auto' }}>
                {comments.map((comment: any, index: number) => (
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
                        {format(comment.timestamp.toDate(), 'MMM d, HH:mm')}
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

          <Chip
            size="small"
            label={task.status || 'todo'}
            color={
              task.status === 'done' ? 'success' :
              task.status === 'in_progress' ? 'warning' : 'default'
            }
          />
        </Stack>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => setShowProgressDialog(true)}>Update Progress</MenuItem>
        {STATUS_VALUES.map((status) => (
          <MenuItem key={status} onClick={() => handleStatusChange(status)}>
            {status === 'done' ? 'Mark Complete' : status === 'in_progress' ? 'Mark In Progress' : 'Mark Pending'}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={showProgressDialog} onClose={() => setShowProgressDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography gutterBottom>Current Progress: {task.progress || 0}%</Typography>
            <Typography gutterBottom>New Progress: {progress}%</Typography>
            <Slider
              value={progress}
              onChange={(_, value) => setProgress(value as number)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Add Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              placeholder="Describe your progress update..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProgressDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProgress}
            variant="contained"
            disabled={!comment.trim()}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
