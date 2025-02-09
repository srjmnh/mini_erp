import React from 'react';
import { Box, Typography, Avatar, useTheme } from '@mui/material';
import { MessageResponse } from 'stream-chat';
import { format } from 'date-fns';

interface MessageProps {
  message: MessageResponse;
  isOwnMessage: boolean;
}

export default function Message({ message, isOwnMessage }: MessageProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        gap: 1,
        mb: 2,
      }}
    >
      <Avatar
        src={message.user?.image}
        sx={{ width: 32, height: 32 }}
      >
        {message.user?.name?.[0]?.toUpperCase()}
      </Avatar>
      <Box
        sx={{
          maxWidth: '70%',
        }}
      >
        {!isOwnMessage && (
          <Typography variant="caption" color="text.secondary">
            {message.user?.name}
          </Typography>
        )}
        <Box
          sx={{
            backgroundColor: isOwnMessage
              ? theme.palette.primary.main
              : theme.palette.grey[100],
            color: isOwnMessage ? 'white' : 'inherit',
            borderRadius: 2,
            p: 1.5,
            '& img': {
              maxWidth: '100%',
              borderRadius: 1,
            },
          }}
        >
          <Typography variant="body1">{message.text}</Typography>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: isOwnMessage ? 'right' : 'left' }}
        >
          {format(new Date(message.created_at || ''), 'HH:mm')}
        </Typography>
      </Box>
    </Box>
  );
}
