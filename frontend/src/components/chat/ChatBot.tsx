import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  TextField,
  Typography,
  Fab,
  Slide,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { chat } from '@/services/gemini';
import { useChat } from '@/contexts/ChatContext';
import { NotificationContainer } from './NotificationContainer';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface SystemNotification {
  id: string;
  message: string;
}

const interpretSystemMessage = (message: string): string => {
  // Convert technical system messages into natural language
  message = message.replace(/Error:/gi, "I noticed an issue:");
  message = message.replace(/Warning:/gi, "Just to let you know:");
  message = message.replace(/Success:/gi, "Great news!");
  message = message.replace(/\b(Exception|Error)\b/gi, "problem");
  message = message.replace(/\b(undefined|null|NaN)\b/gi, "missing information");
  message = message.replace(/\b(function|method)\b/gi, "operation");
  
  if (message.includes("failed")) {
    message = "I noticed something didn't work quite right. " + message;
  }
  
  return message;
};

export default function ChatBot() {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addMessage: addSystemMessage, setProcessing } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleSystemMessage = (event: CustomEvent<string>) => {
      handleSystemMessage(event.detail);
    };

    window.addEventListener('system-message', handleSystemMessage as EventListener);
    return () => {
      window.removeEventListener('system-message', handleSystemMessage as EventListener);
    };
  }, []);

  const handleSystemMessage = async (message: string) => {
    const interpretedMessage = interpretSystemMessage(message);
    const notificationId = Date.now().toString();
    
    setNotifications(prev => [...prev, { id: notificationId, message: interpretedMessage }]);
    
    // Add the interpreted message to the chat if it's open
    if (isOpen) {
      try {
        const response = await chat(
          `As an AI assistant, please respond naturally to this system message: ${message}`
        );
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Error processing system message:', error);
      }
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chat(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      handleSystemMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setProcessing(false);
    }
  };

  const handleNotificationClose = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isBot = message.sender === 'bot';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: isBot ? 'flex-start' : 'flex-end',
          mb: 1,
        }}
      >
        {isBot && (
          <Box sx={{ mr: 1, mt: 1 }}>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <SmartToyIcon sx={{ color: 'primary.main' }} />
            )}
          </Box>
        )}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isBot ? 'background.paper' : 'primary.main',
            color: isBot ? 'text.primary' : 'white',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <Typography variant="body1">{message.text}</Typography>
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 8,
              opacity: 0.7,
            }}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Paper>
        {!isBot && (
          <AccountCircleIcon
            sx={{
              ml: 1,
              mt: 1,
              color: 'primary.main',
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <>
      <NotificationContainer
        notifications={notifications}
        onNotificationClose={handleNotificationClose}
      />

      <Fab
        color="primary"
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <SmartToyIcon />
      </Fab>

      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 400,
            maxWidth: 'calc(100vw - 48px)',
            height: 600,
            maxHeight: 'calc(100vh - 100px)',
            zIndex: theme.zIndex.drawer + 1,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">AI Assistant</Typography>
            </Box>
            <IconButton onClick={() => setIsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              height: 'calc(100% - 128px)',
              overflowY: 'auto',
              p: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </Box>

          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    color="primary"
                  >
                    {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Paper>
      </Slide>
    </>
  );
}
