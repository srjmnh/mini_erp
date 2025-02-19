import React, { useEffect, useState, useRef } from 'react';
import { Snackbar, Alert, IconButton, Button, Stack, TextField, Paper, Box, Typography } from '@mui/material';
import { Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { chatClient } from '@/config/stream';
import { Channel, Event } from 'stream-chat';

// You'll need to add notification sounds to your public folder
const NOTIFICATION_SOUND = '/sounds/notification.mp3';

interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
  mentions: boolean;
}

interface NotificationState {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  channel?: Channel;
  messageId?: string;
  senderName?: string;
}

export default function NotificationManager() {
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    desktop: true,
    sound: true,
    mentions: true,
  });
  const [quickReply, setQuickReply] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.preload = 'auto';

    // Request notification permission on component mount
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Load notification settings from localStorage
    const savedSettings = localStorage.getItem('chatNotificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Listen for chat open/close events
    const handleChatStateChange = (event: CustomEvent) => {
      setIsChatOpen(event.detail.isOpen);
    };

    window.addEventListener('chatStateChange', handleChatStateChange as EventListener);
    return () => {
      window.removeEventListener('chatStateChange', handleChatStateChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!chatClient) return;

    const handleNewMessage = async (event: Event) => {
      console.log('New message event:', event);
      const { message, cid, type } = event;
      if (!message || !cid || type !== 'message.new') {
        console.log('Invalid message event:', event);
        return;
      }

      // Don't notify if chat is open or for own messages
      if (isChatOpen || message.user?.id === chatClient.userID) {
        console.log('Chat open or own message, skipping notification');
        return;
      }

      try {
        // Get channel from client
        const channel = chatClient.channel('messaging', cid.split(':')[1]);
        await channel.watch(); // This loads the channel state
        
        const channelName = channel.data?.name || 'Chat';
        const senderName = message.user?.name || 'Someone';
        const messageText = stripHtml(message.text);
        const isMentioned = message.mentioned_users?.some(
          user => user.id === chatClient.userID
        );

        // Check if the window is focused
        const isWindowFocused = document.hasFocus();
        console.log('Window focused:', isWindowFocused);

        // Handle desktop notifications
        if (settings.desktop && !isWindowFocused) {
          if (isMentioned && settings.mentions) {
            showDesktopNotification(
              `${senderName} mentioned you in ${channelName}`,
              messageText
            );
          } else {
            showDesktopNotification(
              `New message in ${channelName}`,
              `${senderName}: ${messageText}`
            );
          }
        }

        // Handle in-app notifications
        setNotification({
          message: messageText,
          type: 'info',
          channel: channel,
          messageId: message.id,
          senderName: senderName,
        });

        // Play notification sound
        if (settings.sound && !isWindowFocused && audioRef.current) {
          console.log('Playing notification sound');
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(error => {
            console.error('Error playing notification sound:', error);
          });
        }
      } catch (error) {
        console.error('Error handling notification:', error);
      }
    };

    // Listen for new messages
    console.log('Setting up message listener');
    chatClient.on('message.new', handleNewMessage);

    return () => {
      console.log('Cleaning up message listener');
      chatClient.off('message.new', handleNewMessage);
    };
  }, [settings, isChatOpen]);

  const stripHtml = (html: string | undefined) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const showDesktopNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  };

  const handleClose = () => {
    setNotification(null);
    setShowReplyInput(false);
    setQuickReply('');
  };

  const handleReply = () => {
    setShowReplyInput(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendReply = async () => {
    if (!notification?.channel || !quickReply.trim()) return;

    try {
      await notification.channel.sendMessage({
        text: quickReply,
      });
      
      // Clear and close
      setQuickReply('');
      handleClose();
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendReply();
    }
  };

  return (
    <Snackbar
      open={Boolean(notification)}
      autoHideDuration={showReplyInput ? null : 5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{
        mb: 8, // Add margin to avoid overlap with chat button
      }}
    >
      <Paper 
        elevation={3}
        sx={{ 
          minWidth: 300,
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: '20px',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
          background: (theme) => alpha(theme.palette.background.paper, 0.9),
          boxShadow: (theme) => `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.08)}`,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: (theme) => `0 12px 48px 0 ${alpha(theme.palette.common.black, 0.12)}`,
          }
        }}
      >
        <Box sx={{ p: 2.5 }}>
          {/* Sender and message */}
          <Box sx={{ mb: showReplyInput ? 2 : 0 }}>
            <Typography 
              variant="subtitle2" 
              color="primary" 
              sx={{ 
                fontWeight: 600,
                mb: 0.5,
                fontSize: '0.95rem'
              }}
            >
              {notification?.senderName}
            </Typography>
            <Typography 
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.6,
                fontSize: '0.9rem'
              }}
            >
              {notification?.message}
            </Typography>
          </Box>

          {/* Quick reply input */}
          {showReplyInput && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={quickReply}
                onChange={(e) => setQuickReply(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your reply..."
                inputRef={inputRef}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '15px',
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'transparent',
                    }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      size="small" 
                      onClick={handleSendReply}
                      disabled={!quickReply.trim()}
                      sx={{
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        }
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          )}

          {/* Action buttons */}
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              mt: 1.5,
              justifyContent: 'flex-end',
              opacity: 0.8,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 1
              }
            }}
          >
            {!showReplyInput && (
              <Button
                size="small"
                onClick={handleReply}
                sx={{
                  minWidth: 0,
                  borderRadius: '12px',
                  textTransform: 'none',
                  px: 2,
                  py: 0.5,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                Reply
              </Button>
            )}
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ 
                p: 0.5,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.common.black, 0.04),
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Paper>
    </Snackbar>
  );
}
