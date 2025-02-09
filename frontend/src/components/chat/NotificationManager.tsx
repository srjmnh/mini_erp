import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { chatClient } from '@/config/stream';
import { Channel, Event } from 'stream-chat';
import useSound from 'use-sound';

// You'll need to add notification sounds to your public folder
const NOTIFICATION_SOUND = '/sounds/notification.mp3';

interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
  mentions: boolean;
}

export default function NotificationManager() {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    desktop: true,
    sound: true,
    mentions: true,
  });
  const [playNotification] = useSound(NOTIFICATION_SOUND);

  useEffect(() => {
    // Request notification permission on component mount
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Load notification settings from localStorage
    const savedSettings = localStorage.getItem('chatNotificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    if (!chatClient) return;

    const handleNewMessage = (event: Event) => {
      const { message, channel } = event;
      if (!message || !channel) return;

      // Don't notify for own messages
      if (message.user?.id === chatClient.userID) return;

      const channelName = (channel as Channel).data?.name || 'a channel';
      const senderName = message.user?.name || 'Someone';
      const isMentioned = message.mentioned_users?.some(
        user => user.id === chatClient.userID
      );

      // Check if the window is focused
      const isWindowFocused = document.hasFocus();

      // Handle desktop notifications
      if (settings.desktop && !isWindowFocused) {
        if (isMentioned && settings.mentions) {
          showDesktopNotification(
            `${senderName} mentioned you in ${channelName}`,
            message.text || ''
          );
        } else {
          showDesktopNotification(
            `New message in ${channelName}`,
            `${senderName}: ${message.text || ''}`
          );
        }
      }

      // Handle in-app notifications
      if (isMentioned && settings.mentions) {
        setNotification({
          message: `${senderName} mentioned you: ${message.text}`,
          type: 'info',
        });
      }

      // Play notification sound
      if (settings.sound && !isWindowFocused) {
        playNotification();
      }
    };

    // Listen for new messages
    chatClient.on('message.new', handleNewMessage);

    return () => {
      chatClient.off('message.new', handleNewMessage);
    };
  }, [settings, playNotification]);

  const showDesktopNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/path/to/your/notification-icon.png', // Add your notification icon
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('chatNotificationSettings', JSON.stringify(updated));
  };

  return (
    <>
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            elevation={6}
            variant="filled"
            severity={notification.type}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={handleCloseNotification}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}
