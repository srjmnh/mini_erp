import React, { useState } from 'react';
import {
  Box,
  Fab,
  Drawer,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ChatContainer } from './ChatContainer';
import { useChat } from '@/contexts/ChatContext';

export const FloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isProcessing } = useChat();
  const theme = useTheme();

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={toggleDrawer}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.drawer - 1,
        }}
      >
        <ChatIcon />
      </Fab>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: '100%',
            borderTopLeftRadius: theme.shape.borderRadius,
            borderBottomLeftRadius: theme.shape.borderRadius,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">System Messages</Typography>
            <IconButton onClick={toggleDrawer} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ height: 'calc(100% - 64px)', overflow: 'hidden' }}>
          <ChatContainer
            messages={messages}
            isProcessing={isProcessing}
          />
        </Box>
      </Drawer>
    </>
  );
};
