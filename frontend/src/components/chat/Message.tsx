import React from 'react';
import { Box, Typography, Avatar, useTheme } from '@mui/material';
import { MessageResponse } from 'stream-chat';
import { format } from 'date-fns';
import { Check, DoneAll } from '@mui/icons-material';

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
        mb: 3,
        '&:hover': {
          '& .message-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <Avatar
        src={message.user?.image}
        sx={{ 
          width: 32, 
          height: 32,
          bgcolor: !message.user?.image ? 
            `hsl(${(message.user?.name || '').length * 30}, 70%, 50%)` : undefined,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
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
              ? `${theme.palette.primary.main}`
              : theme.palette.grey[50],
            color: isOwnMessage ? 'white' : 'inherit',
            borderRadius: 2.5,
            p: 1.5,
            position: 'relative',
            boxShadow: isOwnMessage 
              ? '0 2px 8px rgba(0,0,0,0.15)'
              : '0 1px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            '& img': {
              maxWidth: '100%',
              borderRadius: 1,
            },
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isOwnMessage 
                ? '0 4px 12px rgba(0,0,0,0.2)'
                : '0 2px 8px rgba(0,0,0,0.1)',
            },
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              wordBreak: 'break-word',
              lineHeight: 1.5,
              letterSpacing: '0.01em',
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
                fontSize: '0.75rem',
                color: isOwnMessage 
                  ? 'rgba(255,255,255,0.7)' 
                  : theme.palette.text.secondary,
              }}
            >
              {format(new Date(message.created_at || ''), 'HH:mm')}
            </Typography>
            {isOwnMessage && (
              <Box 
                className="message-actions"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: message.status === 'received' 
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.5)',
                  transition: 'opacity 0.2s ease',
                }}
              >
                {message.status === 'received' ? (
                  <DoneAll sx={{ fontSize: '0.9rem' }} />
                ) : (
                  <Check sx={{ fontSize: '0.9rem' }} />
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
