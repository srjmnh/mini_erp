import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Assignment as TaskIcon,
  Update as UpdateIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface Notification {
  id: string;
  type: 'task_assigned' | 'task_updated' | 'system_notification';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data: {
    taskTitle?: string;
    assignedBy?: string;
    priority?: string;
    dueDate?: Date;
    progress?: number;
    updatedBy?: string;
  };
}

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('NotificationBell mounted with userId:', userId);
    
    if (!userId) {
      console.log('No userId provided to NotificationBell');
      return;
    }

    // Set up real-time listener for notifications
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    console.log('Setting up notifications listener for userId:', userId);

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        console.log('Received notification snapshot:', {
          size: snapshot.size,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            userId: doc.data().userId,
            type: doc.data().type,
            title: doc.data().title
          }))
        });

        const notificationData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() // Convert Firestore Timestamp to Date
        })) as Notification[];
        
        console.log('Received notifications:', notificationData); // Debug log
        setNotifications(notificationData);
        setUnreadCount(notificationData.filter(n => !n.read).length);
      },
      (error) => {
        console.error('Error in notifications listener:', error);
      }
    );

    return () => {
      console.log('Cleaning up notifications listener');
      unsubscribe();
    };
  }, [userId]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((notification) => {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, { read: true });
        });
      await batch.commit();
      handleClose();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      await batch.commit();
      handleClose();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const formatNotificationTime = (timestamp: Date) => {
    if (!timestamp) return '';
    return format(timestamp, 'HH:mm');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <TaskIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      case 'task_updated':
        return <UpdateIcon fontSize="small" sx={{ color: 'info.main' }} />;
      case 'system_notification':
        return <NotificationsIcon fontSize="small" sx={{ color: 'success.main' }} />;
      default:
        return <NotificationsIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          position: 'relative',
          '& .MuiBadge-badge': {
            backgroundColor: '#ff4444',
            color: 'white',
          },
        }}
      >
        <NotificationsIcon
          sx={{
            color: '#2196f3', // Using a bright blue color
            fontSize: '1.5rem',
            '&:hover': {
              color: '#1976d2', // Darker blue on hover
            },
          }}
        />
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
            }}
          />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: '350px',
            mt: 1.5,
            '& .MuiList-root': {
              py: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={markAllAsRead}
                sx={{ mr: 1 }}
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearAllNotifications}
              >
                Clear All
              </Button>
            )}
          </Box>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemButton onClick={() => markAsRead(notification.id)}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ mr: 2, mt: 0.5 }}>
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                              {formatNotificationTime(notification.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};
