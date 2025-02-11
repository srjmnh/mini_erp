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
  Slider,
  Checkbox,
  ListItemIcon,
  ListItemText
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
  onUpdate: (taskId: string, progress: number, comment: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: any) => void;
}

const STATUS_VALUES = ['todo', 'in_progress', 'done'];

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onEdit }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progress, setProgress] = useState(task.progress || 0);
  const [comment, setComment] = useState('');

  const handleProgressUpdate = () => {
    onUpdate(task.id, progress, comment, false);
    setShowProgressDialog(false);
    setComment('');
  };

  const handleComplete = () => {
    onUpdate(task.id, 100, 'Task marked as complete', true);
  };

  return (
    <Card 
      elevation={0}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Checkbox 
              checked={task.status === 'done'}
              onChange={handleComplete}
              sx={{ 
                ml: -1,
                '&.Mui-checked': {
                  color: 'success.main'
                }
              }}
            />
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 500,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? 'text.secondary' : 'text.primary'
                }}
              >
                {task.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {task.assignee && (
                  <Chip
                    avatar={
                      <Avatar 
                        src={task.assignee.photoURL} 
                        sx={{ width: 20, height: 20 }}
                      >
                        {task.assignee.name.charAt(0)}
                      </Avatar>
                    }
                    label={task.assignee.name}
                    size="small"
                    variant="outlined"
                    sx={{ height: 24 }}
                  />
                )}
                <Chip
                  label={task.priority}
                  size="small"
                  sx={{
                    height: 24,
                    bgcolor: 
                      task.priority === 'high' ? 'error.main' :
                      task.priority === 'medium' ? 'warning.main' : 'success.main',
                    color: '#fff'
                  }}
                />
                {task.dueDate && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {format(task.dueDate, 'MMM d')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Progress Section */}
        <Box sx={{ mb: task.latestComment ? 2 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress: {task.progress || 0}%
            </Typography>
            <Button
              size="small"
              onClick={() => setShowProgressDialog(true)}
              sx={{ 
                ml: 'auto',
                minWidth: 'auto',
                color: 'primary.main',
                '&:hover': { bgcolor: 'primary.50' }
              }}
            >
              Update
            </Button>
          </Box>
          <LinearProgress
            variant="determinate"
            value={task.progress || 0}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                bgcolor: task.completed ? 'success.main' : 'primary.main',
                borderRadius: 3
              }
            }}
          />
        </Box>

        {/* Latest Comment Section */}
        {task.latestComment && (
          <Box 
            sx={{ 
              mt: 2,
              p: 1.5,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.100'
            }}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              {task.latestComment.text}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar 
                sx={{ 
                  width: 24, 
                  height: 24,
                  fontSize: '0.875rem',
                  bgcolor: 'primary.main'
                }}
              >
                {task.latestComment.userName.charAt(0)}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {task.latestComment.userName} • {format(task.latestComment.timestamp.toDate(), 'MMM d, HH:mm')}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          onEdit(task);
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          onDelete(task.id);
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Progress Dialog */}
      <Dialog 
        open={showProgressDialog} 
        onClose={() => setShowProgressDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Progress: {progress}%</Typography>
            <Slider
              value={progress}
              onChange={(_, value) => setProgress(value as number)}
              sx={{ 
                mt: 2,
                '& .MuiSlider-thumb': {
                  width: 28,
                  height: 28,
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)'
                  }
                }
              }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProgressDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleProgressUpdate}
            disabled={!comment.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TaskCard;
