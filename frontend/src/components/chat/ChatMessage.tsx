import React from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { keyframes } from '@mui/system';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

interface ChatMessageProps {
  message: string;
  isLoading?: boolean;
  type?: 'system' | 'user' | 'bot';
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading = false, type = 'bot' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        mb: 2,
        animation: `${slideIn} 0.3s ease-out`,
      }}
    >
      {type === 'bot' && (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1,
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <Typography variant="body1" color="white">AI</Typography>
          )}
        </Box>
      )}
      
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: '80%',
          borderRadius: 2,
          bgcolor: type === 'user' ? 'primary.main' : type === 'system' ? 'grey.100' : 'background.paper',
          color: type === 'user' ? 'white' : 'text.primary',
          ml: type === 'user' ? 'auto' : 0,
          border: type === 'bot' ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body1">{message}</Typography>
      </Paper>
    </Box>
  );
};
