import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccountCircle,
  AttachFile,
  FiberManualRecord,
  Send,
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
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy'>('online');
  const [isConnected, setIsConnected] = useState(false);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
  const { messages } = useStreamMessages(channel);

  // Initialize chat client
  useEffect(() => {
    if (user?.email) {
      const initChat = async () => {
        try {
          setLoading(true);
          const userId = user.email.replace(/[.@]/g, '_');
          const client = await initializeStreamUser(userId, user.email, user.displayName, user.photoURL);
          
          // Set initial status after successful connection
          if (client.userID) {
            await client.partialUpdateUser({
              id: userId,
              set: {
                status: userStatus,
              },
            });
            setIsConnected(true);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error initializing chat:', error);
          setLoading(false);
        }
      };
      initChat();

      // Cleanup function
      return () => {
        const cleanup = async () => {
          if (chatClient?.userID) {
            await chatClient.disconnectUser();
            setIsConnected(false);
          }
        };
        cleanup();
      };
    }
  }, [user]);

  // Fetch channels only after successful connection
  useEffect(() => {
    if (isConnected && chatClient?.userID) {
      const fetchChannels = async () => {
        try {
          const filter = { 
            type: 'messaging',
            members: { $in: [chatClient.userID] }
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
  }, [isConnected, chatClient]);

  // Update user status in Stream - only when client is connected
  useEffect(() => {
    if (isConnected && chatClient?.userID && userStatus) {
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
  }, [userStatus, chatClient, isConnected]);

  // Listen for user presence changes
  useEffect(() => {
    if (isConnected && chatClient) {
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
  }, [chatClient, isConnected]);

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

  // Track unread messages
  useEffect(() => {
    if (channel) {
      channel.on('message.new', (event) => {
        if (event.message.user?.id !== chatClient?.userID) {
          // Update unread count for this channel
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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const createChannel = async (employee: Employee) => {
    setLoading(true);
    try {
      if (!user?.email || !employee.email) {
        console.error('Missing user or employee email');
        return;
      }

      const currentUserId = user.email.replace(/[.@]/g, '_');
      const employeeId = employee.email.replace(/[.@]/g, '_');

      // Create users via backend
      await axios.post('http://localhost:3000/api/stream/create-chat', {
        currentUser: {
          id: currentUserId,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          image: user.photoURL,
          position: user.role || 'Employee',
        },
        otherUser: {
          id: employeeId,
          name: employee.name,
          email: employee.email,
          image: employee.photoURL,
          position: employee.position || 'Employee',
        },
      });

      // Create unique channel ID using sorted IDs
      const sortedIds = [currentUserId, employeeId].sort();
      const channelId = `chat_${sortedIds[0]}_${sortedIds[1]}`;

      // Check if channel exists
      const existingChannel = channels.find(ch => ch.id === channelId);
      if (existingChannel) {
        setChannel(existingChannel);
        setSelectedEmployee(employee);
        setLoading(false);
        return;
      }

      // Create new channel
      const newChannel = chatClient.channel('messaging', channelId, {
        members: [currentUserId, employeeId],
        created_by: currentUserId,
        receiver: employeeId,
      });

      await newChannel.create();
      await newChannel.watch();
      
      setChannel(newChannel);
      setSelectedEmployee(employee);
      setChannels(prev => [newChannel, ...prev]);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
    setLoading(false);
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

  if (!chatClient.userID) {
    return null;
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          ml: 2,
          position: 'relative',
        }}
      >
        <Badge 
          color={userStatus === 'online' ? 'success' : userStatus === 'away' ? 'warning' : 'error'} 
          variant="dot"
        >
          <AccountCircle />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
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
                    <AccountCircle />
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
                    <FiberManualRecord sx={{ color: getStatusColor('online') }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Online</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('away')}>
                  <ListItemIcon>
                    <FiberManualRecord sx={{ color: getStatusColor('away') }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Away</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleStatusChange('busy')}>
                  <ListItemIcon>
                    <FiberManualRecord sx={{ color: getStatusColor('busy') }} fontSize="small" />
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

                // Safely get last message
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
                startIcon={<AccountCircle />}
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
                      <AttachFile />
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
                      <Send />
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
                <AccountCircle sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
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
