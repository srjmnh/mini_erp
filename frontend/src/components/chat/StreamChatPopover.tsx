import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Badge,
  Box,
  IconButton,
  Popover,
  Typography,
  useTheme,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { chatClient, initializeStreamUser } from '@/config/stream';
import { useAuth } from '@/contexts/AuthContext';
import { Channel } from 'stream-chat';
import { useStreamMessages } from '@/hooks/useStreamMessages';
import Message from './Message';
import FileMessage from './FileMessage';
import NewChatDialog from './NewChatDialog';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import { uploadChatFile } from '@/services/supabaseStorage';

interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
  photoURL?: string;
}

export default function StreamChatPopover() {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const theme = useTheme();
  const { messages } = useStreamMessages(channel);

  useEffect(() => {
    if (user?.email) {
      const initChat = async () => {
        try {
          await initializeStreamUser({
            email: user.email,
            name: user.displayName,
          });
          // Fetch channels after initialization
          const filter = { 
            type: 'messaging',
            members: { $in: [user.email.replace(/[.@]/g, '_')] }
          };
          const sort = { last_message_at: -1 };
          const response = await chatClient.queryChannels(filter, sort, {
            watch: true,
            state: true,
          });
          setChannels(response);
        } catch (error) {
          console.error('Error initializing chat:', error);
        }
      };
      initChat();
    }
  }, [user]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const createChannel = async (employee: Employee) => {
    setLoading(true);
    try {
      const currentUserId = user?.email?.replace(/[.@]/g, '_') || '';
      const employeeId = employee.email.replace(/[.@]/g, '_');

      // Create users via backend
      await axios.post('http://localhost:3000/api/stream/create-chat', {
        currentUser: {
          id: currentUserId,
          name: user?.displayName || user?.email?.split('@')[0] || '',
          email: user?.email,
          image: user?.photoURL,
          position: user?.role || 'Employee',
        },
        otherUser: {
          id: employeeId,
          name: employee.name,
          email: employee.email,
          image: employee.photoURL,
          position: employee.position || 'Employee',
        },
      });

      // Create the channel
      const channelId = [currentUserId, employeeId].sort().join('_');
      const newChannel = chatClient.channel('messaging', channelId, {
        members: [currentUserId, employeeId],
        name: employee.name,
      });

      await newChannel.create();
      setChannel(newChannel);
      setSelectedEmployee(employee);
      
      // Update channels list
      setChannels(prev => [newChannel, ...prev]);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!channel || !message.trim()) return;

    try {
      await channel.sendMessage({
        text: message,
        user: {
          id: user?.email?.replace(/[.@]/g, '_') || '',
          name: user?.displayName || user?.email?.split('@')[0] || '',
        },
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleChannelSelect = async (selectedChannel: Channel) => {
    setChannel(selectedChannel);
    const members = Object.values(selectedChannel.state.members);
    const otherMember = members.find(
      member => member.user_id !== chatClient.userID
    );
    if (otherMember) {
      setSelectedEmployee({
        id: otherMember.user_id,
        name: otherMember.user?.name || '',
        email: otherMember.user?.email || '',
        position: otherMember.user?.position,
        photoURL: otherMember.user?.image,
      });
    }
  };

  const open = Boolean(anchorEl);

  if (!chatClient.userID) {
    return null;
  }

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
          zIndex: 1000,
          boxShadow: 2,
        }}
      >
        <Badge color="error" variant="dot">
          <ChatIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPopover-paper': {
            width: 800,
            height: 600,
            overflow: 'hidden',
            mt: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Left sidebar - Recent chats */}
          <Box
            sx={{
              width: 300,
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewChatOpen(true)}
              >
                New Chat
              </Button>
            </Box>
            <Divider />
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {channels.map((ch) => {
                const members = Object.values(ch.state.members);
                const otherMember = members.find(
                  member => member.user_id !== chatClient.userID
                );
                const messages = ch.state.messages || [];
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const lastMessageTime = lastMessage?.created_at 
                  ? new Date(lastMessage.created_at)
                  : null;
                
                const getTimeString = (date: Date | null) => {
                  if (!date) return '';
                  if (isToday(date)) {
                    return format(date, 'HH:mm');
                  }
                  if (isYesterday(date)) {
                    return 'Yesterday';
                  }
                  return format(date, 'dd/MM/yyyy');
                };

                return (
                  <ListItem
                    key={ch.cid}
                    button
                    selected={channel?.cid === ch.cid}
                    onClick={() => handleChannelSelect(ch)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={otherMember?.user?.image}>
                        {otherMember?.user?.name?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" noWrap>
                            {otherMember?.user?.name || 'Unknown'}
                          </Typography>
                          {lastMessageTime && (
                            <Typography variant="caption" color="text.secondary">
                              {getTimeString(lastMessageTime)}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                          }}
                        >
                          {lastMessage ? (
                            <>
                              {lastMessage.user?.id === chatClient.userID ? 'You: ' : ''}
                              {lastMessage.text}
                            </>
                          ) : (
                            'No messages yet'
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {/* Right side - Chat area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedEmployee ? (
              <>
                {/* Chat header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Avatar src={selectedEmployee.photoURL} sx={{ mr: 1 }}>
                    {selectedEmployee.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {selectedEmployee.name}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {selectedEmployee.position || 'Employee'}
                    </Typography>
                  </Box>
                </Box>

                {/* Chat messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {loading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : channel && messages.length > 0 ? (
                    <Box>
                      {messages.map((msg) => {
                        const fileAttachment = msg.attachments?.[0];
                        const isFileMessage = fileAttachment?.type === 'file';

                        if (isFileMessage) {
                          return (
                            <FileMessage
                              key={msg.id}
                              fileName={fileAttachment.title || 'File'}
                              fileUrl={fileAttachment.asset_url || ''}
                              fileType={fileAttachment.mime_type || ''}
                              fileSize={fileAttachment.file_size || 0}
                              isOwnMessage={msg.user?.id === chatClient.userID}
                            />
                          );
                        }

                        return (
                          <Message
                            key={msg.id}
                            message={msg}
                            isOwnMessage={msg.user?.id === chatClient.userID}
                          />
                        );
                      })}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography>No messages yet</Typography>
                    </Box>
                  )}
                </Box>

                {/* Message input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <input
                      type="file"
                      id="chat-file-input"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !channel) return;

                        try {
                          setLoading(true);
                          const fileData = await uploadChatFile(
                            file,
                            user?.email?.replace(/[.@]/g, '_') || ''
                          );

                          await channel.sendMessage({
                            text: `Shared a file: ${fileData.fileName}`,
                            attachments: [{
                              type: 'file',
                              asset_url: fileData.url,
                              title: fileData.fileName,
                              mime_type: fileData.fileType,
                              file_size: fileData.fileSize,
                            }],
                          });

                          // Clear the input
                          e.target.value = '';
                        } catch (error) {
                          console.error('Error uploading file:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      onClick={() => document.getElementById('chat-file-input')?.click()}
                      disabled={loading}
                    >
                      <AttachFileIcon />
                    </IconButton>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!message.trim() || loading}
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a chat or start a new one
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the "New Chat" button to message someone
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Popover>

      <NewChatDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelectEmployee={createChannel}
        currentUserEmail={user?.email || ''}
      />
    </>
  );
}
