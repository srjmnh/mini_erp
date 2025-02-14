import React from 'react';
import { Box, Paper, Typography, Avatar, useTheme } from '@mui/material';
import { StreamChat, Message } from 'stream-chat';
import { Check, DoneAll } from '@mui/icons-material';

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function StreamChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const theme = useTheme();
  const messageTime = new Date(message.created_at || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        mb: 2,
        gap: 1,
        px: 2,
        '&:hover': {
          '& .message-actions': {
            opacity: 1,
          },
        },
      }}
    >
      {!isOwnMessage && (
        <Avatar
          src={message.user?.image}
          alt={message.user?.name || ''}
          sx={{ 
            width: 32, 
            height: 32,
            bgcolor: !message.user?.image ? 
              `hsl(${(message.user?.name || '').length * 30}, 70%, 50%)` : undefined
          }}
        >
          {(message.user?.name || '')[0]}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '70%' }}>
        {!isOwnMessage && (
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 1, 
              mb: 0.5, 
              display: 'block',
              color: 'text.secondary',
              fontWeight: 500
            }}
          >
            {message.user?.name}
          </Typography>
        )}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: isOwnMessage 
              ? `${theme.palette.primary.main}` 
              : theme.palette.grey[50],
            color: isOwnMessage ? 'white' : 'inherit',
            borderRadius: 2.5,
            borderTopLeftRadius: !isOwnMessage ? 0 : 2.5,
            borderTopRightRadius: isOwnMessage ? 0 : 2.5,
            boxShadow: isOwnMessage 
              ? '0 2px 8px rgba(0,0,0,0.15)'
              : '0 1px 4px rgba(0,0,0,0.05)',
            position: 'relative',
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isOwnMessage 
                ? '0 4px 12px rgba(0,0,0,0.2)'
                : '0 2px 8px rgba(0,0,0,0.1)',
            },
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              wordBreak: 'break-word',
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              fontWeight: 400,
            }}
          >
            {message.text}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            gap: 0.5,
            mt: 0.5,
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                color: isOwnMessage 
                  ? 'rgba(255,255,255,0.7)' 
                  : theme.palette.text.secondary,
              }}
            >
              {messageTime}
            </Typography>
            {isOwnMessage && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                color: message.status === 'received' 
                  ? theme.palette.primary.light
                  : 'rgba(255,255,255,0.5)',
                ml: 0.5,
              }}>
                {message.status === 'received' ? (
                  <DoneAll sx={{ fontSize: '0.9rem' }} />
                ) : (
                  <Check sx={{ fontSize: '0.9rem' }} />
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
