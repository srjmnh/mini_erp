import React, { useEffect } from 'react';
import { Snackbar, Box, Avatar, Typography, Stack } from '@mui/material';
import { Employee, Group } from './ChatPopover';

interface ChatNotificationProps {
  open: boolean;
  onClose: () => void;
  message: {
    content: string;
    sender_id: string;
    group_id?: string;
  };
  sender?: Employee;
  group?: Group;
}

export default function ChatNotification({
  open,
  onClose,
  message,
  sender,
  group,
}: ChatNotificationProps) {
  useEffect(() => {
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    if (open) {
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    }
  }, [open]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 2,
          p: 1.5,
          minWidth: 300,
          maxWidth: 400,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={sender?.avatar_url}
            sx={{
              width: 40,
              height: 40,
              bgcolor: group ? 'primary.main' : undefined,
            }}
          >
            {group ? group.name[0] : sender?.getDisplayName?.()[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {group ? group.name : sender?.getDisplayName?.()}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {message.content}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Snackbar>
  );
}
