import React from 'react';
import { Box } from '@mui/material';
import { SystemNotification } from './SystemNotification';

interface Notification {
  id: string;
  message: string;
}

interface NotificationContainerProps {
  notifications: Notification[];
  onNotificationClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onNotificationClose,
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 90, // Above the chat button
        left: 24,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {notifications.map((notification) => (
        <SystemNotification
          key={notification.id}
          message={notification.message}
          onClose={() => onNotificationClose(notification.id)}
        />
      ))}
    </Box>
  );
};
