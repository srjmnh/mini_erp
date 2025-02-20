import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Avatar, InputAdornment, Paper } from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon, EmojiEmotions as EmojiIcon } from '@mui/icons-material';
import { Channel, Message, StreamChat } from 'stream-chat';
import StreamChatMessage from './StreamChatMessage';

interface ChatWindowProps {
  channel: Channel;
  chatClient: StreamChat;
}

export default function StreamChatWindow({ channel, chatClient }: ChatWindowProps) {
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const handleNewMessage = (event: { message: Message }) => {
      setMessages((prevMessages) => [...prevMessages, event.message]);
    };

    const handleTypingStart = (event: { user: { id: string; name: string } }) => {
      setTypingUsers((prev) => [...new Set([...prev, event.user.name])]);
    };

    const handleTypingStop = (event: { user: { id: string; name: string } }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== event.user.name));
    };

    channel.on('message.new', handleNewMessage);
    channel.on('typing.start', handleTypingStart);
    channel.on('typing.stop', handleTypingStop);

    // Load initial messages
    channel.watch().then((response) => {
      setMessages(response.messages || []);
    });

    return () => {
      channel.off('message.new', handleNewMessage);
      channel.off('typing.start', handleTypingStart);
      channel.off('typing.stop', handleTypingStop);
    };
  }, [channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await channel.sendMessage({
        text: newMessage,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      channel.keystroke();
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        bgcolor: 'background.default',
        borderLeft: 1,
        borderColor: 'divider',
      }}
    >
      {/* Channel Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: theme.palette.primary.main,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Avatar
          src={channel.data?.image}
          alt={channel.data?.name || ''}
          sx={{
            width: 40,
            height: 40,
            bgcolor: !channel.data?.image ?
              `hsl(${(channel.data?.name || '').length * 30}, 70%, 50%)` : undefined
          }}
        >
          {(channel.data?.name || '')[0]}
        </Avatar>
        <Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
              {channel.data?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {channel.data?.member_count} members • {channel.data?.member_count > 0 ? 'Active' : 'Inactive'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 2,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: theme.palette.grey[50],
          backgroundImage: `linear-gradient(to right, ${theme.palette.grey[100]} 1px, transparent 1px), linear-gradient(${theme.palette.grey[100]} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {messages.map((message) => (
          <StreamChatMessage
            key={message.id}
            message={message}
            isOwnMessage={message.user?.id === chatClient.userID}
          />
        ))}
        <div ref={messagesEndRef} />
        
        {typingUsers.length > 0 && (
          <Box sx={{ px: 3, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Message Input */}
      <Paper
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          p: 2,
          mx: 2,
          mb: 2,
          borderRadius: 3,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}
        elevation={0}
      >
        <IconButton size="small" sx={{ color: 'action.active' }}>
          <AttachFileIcon />
        </IconButton>
        <IconButton size="small" sx={{ color: 'action.active' }}>
          <EmojiIcon />
        </IconButton>
        <TextField
          fullWidth
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Type a message..."
          variant="outlined"
          size="small"
          multiline
          maxRows={4}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: theme.palette.grey[50],
              '&:hover': {
                bgcolor: theme.palette.grey[100],
              },
              '& fieldset': { border: 'none' },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" sx={{ color: theme.palette.grey[400] }}>
                  <EmojiIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}
