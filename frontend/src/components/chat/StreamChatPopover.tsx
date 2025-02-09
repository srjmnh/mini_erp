import React, { useState, useEffect } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import {
  Box,
  IconButton,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  CircleOutlined,
  CheckCircleOutline,
  RemoveCircleOutline,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from '@/contexts/SnackbarContext';
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
  photoURL?: string;
  position?: string;
}

export default function StreamChatPopover() {
  const { user } = useAuth();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [message, setMessage] = useState('');
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy'>('online');
  const [isConnected, setIsConnected] = useState(false);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!user?.email) return;

      try {
        const userId = user.email.replace(/[.@]/g, '_');
        console.log('Initializing chat with user:', user);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.photoURL,
          }),
        });

        const { token } = await response.json();
        const client = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);
        await client.connectUser(
          {
            id: userId,
            name: user.name || user.email.split('@')[0],
            email: user.email,
            image: user.photoURL,
          },
          token
        );

        setChatClient(client);
        setIsConnected(true);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setIsConnected(false);
      }
    };

    initChat();
    return () => {
      chatClient?.disconnectUser();
    };
  }, [user]);

  useEffect(() => {
    if (chatClient) {
      const fetchChannels = async () => {
        try {
          const filter = { 
            type: 'messaging',
            members: { $in: [chatClient?.userID] }
          };
          const sort = { last_message_at: -1 };
          
          const channels = await chatClient.queryChannels(filter, sort, {
            watch: true,
            state: true,
            presence: true,
          });

          setChannels(channels);
        } catch (error) {
          console.error('Error fetching channels:', error);
        }
      };
      fetchChannels();
    }
  }, [chatClient]);

  useEffect(() => {
    if (chatClient) {
      const updateStatus = async () => {
        try {
          await chatClient.partialUpdateUser({
            id: chatClient.userID,
            set: {
              status: userStatus,
            },
          });
        } catch (error) {
          console.error('Error updating status:', error);
        }
      };
      updateStatus();
    }
  }, [userStatus, chatClient]);

  useEffect(() => {
    if (chatClient) {
      chatClient.on('user.presence.changed', event => {
        setChannels(prev => prev.map(ch => {
          const members = ch.state.members;
          if (!members) return ch;
          
          const updatedMembers = { ...members };
          if (updatedMembers[event.user.id]) {
            updatedMembers[event.user.id] = {
              ...updatedMembers[event.user.id],
              user: event.user,
            };
          }
          
          return {
            ...ch,
            state: {
              ...ch.state,
              members: updatedMembers,
            },
          };
        }));
      });

      return () => {
        chatClient.off('user.presence.changed');
      };
    }
  }, [chatClient]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!channel) return;
      
      try {
        const response = await channel.watch();
        setMessages(response.messages || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const handleNewMessage = (event: any) => {
      setMessages(prev => [...prev, event.message]);
    };

    if (channel) {
      channel.on('message.new', handleNewMessage);
    }

    return () => {
      if (channel) {
        channel.off('message.new', handleNewMessage);
      }
    };
  }, [channel]);

  useEffect(() => {
    if (channel) {
      channel.on('message.new', (event) => {
        if (event.message.user?.id !== chatClient?.userID) {
          setChannels(prev => prev.map(ch => 
            ch.id === channel.id 
              ? { ...ch, unreadCount: (ch.countUnread() || 0) + 1 }
              : ch
          ));
        }
      });

      return () => {
        channel.off('message.new');
      };
    }
  }, [channel, chatClient]);

  useEffect(() => {
    if (!chatClient) return;

    const handleChannelUpdated = (event: any) => {
      const loadChannels = async () => {
        if (!chatClient || !user?.email) return;

        try {
          const filter = { type: 'messaging', members: { $in: [user.email.replace(/[.@]/g, '_')] } };
          const sort = { last_message_at: -1 };
          const channels = await chatClient.queryChannels(filter, sort);
          setChannels(channels);
        } catch (error) {
          console.error('Error loading channels:', error);
        }
      };
      loadChannels();
    };

    chatClient.on('message.new', handleChannelUpdated);
    chatClient.on('channel.updated', handleChannelUpdated);

    return () => {
      chatClient.off('message.new', handleChannelUpdated);
      chatClient.off('channel.updated', handleChannelUpdated);
    };
  }, [chatClient]);

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    setStatusAnchorEl(event.currentTarget);
  };

  const handleStatusClose = () => {
    setStatusAnchorEl(null);
  };

  const handleStatusChange = async (newStatus: 'online' | 'away' | 'busy') => {
    setUserStatus(newStatus);
    handleStatusClose();
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'online':
        return theme.palette.success.main;
      case 'away':
        return theme.palette.warning.main;
      case 'busy':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const handleEmployeeSelect = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewChatOpen(false);
    await createChannel(employee);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const createChannel = async (employee: Employee) => {
    if (!chatClient || !user?.email) return;

    try {
      setLoading(true);
      const userId = user.email.replace(/[.@]/g, '_');
      const employeeId = employee.email.replace(/[.@]/g, '_');

      // Create the employee user on backend
      await fetch(`${import.meta.env.VITE_API_URL}/api/stream/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: employeeId,
          email: employee.email,
          name: employee.name,
          image: employee.photoURL,
        }),
      });

      // Create channel
      const channelId = [userId, employeeId].sort().join('_');
      const newChannel = chatClient.channel('messaging', channelId, {
        members: [userId, employeeId],
        created_by_id: userId,
      });

      await newChannel.create();
      setChannel(newChannel);
      await loadChannels(); // Refresh channels list
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!channel || !message.trim()) return;

    try {
      const messageData = {
        text: message,
        user: {
          id: user?.email?.replace(/[.@]/g, '_') || '',
          name: user?.displayName || user?.email?.split('@')[0] || '',
          image: user?.photoURL,
        },
      };

      await channel.sendMessage(messageData);
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

  if (!chatClient) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: '20px',
        right: '80px', // Move it 80px from right (chatbot is at 20px)
        zIndex: 1200,
      }}
    >
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Badge color="error" variant="dot" invisible={!hasUnreadMessages}>
          <ChatIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: '800px',
            height: '600px',
            marginBottom: '16px',
          }
        }}
      >
        <Box sx={{ width: 800, height: 600, display: 'flex' }}>
          {/* Left side - Chat list */}
          <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            {/* User status selector */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                onClick={handleStatusClick}
                startIcon={
                  <Badge
                    variant="dot"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: getStatusColor(userStatus),
                      },
                    }}
                  >
                    <CircleOutlined />
                  </Badge>
                }
              >
                {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
              </Button>
              <Menu
                anchorEl={statusAnchorEl}
                open={Boolean(statusAnchorEl)}
                onClose={handleStatusClose}
              >
                <MenuItem onClick={() => handleStatusChange('online')}>
                  <ListItemIcon>
                    <CircleOutlined sx={{ color: getStatusColor('online') }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Online</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('away')}>
                  <ListItemIcon>
                    <CircleOutlined sx={{ color: getStatusColor('away') }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Away</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('busy')}>
                  <ListItemIcon>
                    <CircleOutlined sx={{ color: getStatusColor('busy') }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Busy</ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {/* Chat list */}
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {channels.map((ch) => {
                const otherUser = ch.state.members
                  ? Object.values(ch.state.members).find(
                      (m) => m.user?.id !== chatClient?.userID
                    )?.user
                  : null;

                const messages = ch.state?.messages || [];
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const unreadCount = ch.countUnread?.() || 0;

                return (
                  <ListItem
                    key={ch.id}
                    button
                    selected={channel?.id === ch.id}
                    onClick={() => {
                      setChannel(ch);
                      ch.markRead?.();
                      if (otherUser) {
                        setSelectedEmployee({
                          id: otherUser.id,
                          name: otherUser.name || '',
                          email: otherUser.email || '',
                          position: otherUser.position || '',
                          photoURL: otherUser.image || '',
                        });
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        variant="dot"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: getStatusColor(otherUser?.status),
                          },
                        }}
                      >
                        <Avatar src={otherUser?.image}>
                          {otherUser?.name?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            sx={{
                              fontWeight: unreadCount > 0 ? 700 : 400,
                            }}
                          >
                            {otherUser?.name || 'Unknown'}
                          </Typography>
                          {unreadCount > 0 && (
                            <Chip
                              size="small"
                              label={unreadCount}
                              color="primary"
                              sx={{ height: 20, minWidth: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                            fontWeight: unreadCount > 0 ? 700 : 400,
                          }}
                        >
                          {lastMessage ? (
                            <>
                              {lastMessage.user?.id === chatClient?.userID ? 'You: ' : ''}
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

            {/* New chat button */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => setNewChatOpen(true)}
              >
                New Chat
              </Button>
            </Box>
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
                  ) : messages.length > 0 ? (
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
        onSelect={handleEmployeeSelect}
      />
    </Box>
  );
}
