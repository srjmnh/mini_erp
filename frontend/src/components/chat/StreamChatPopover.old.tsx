import React, { useState, useEffect } from 'react';
import { Settings as SettingsOutlined } from '@mui/icons-material';

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
  Group as GroupIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from '@/contexts/SnackbarContext';
import Message from './Message';
import FileMessage from './FileMessage';
import NewChatDialog from './NewChatDialog';
import GroupChatDialog from './GroupChatDialog';
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

import {
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
  ChannelList as StreamChannelList,
  useChannelStateContext,
  useChannelActionContext,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

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
  const [groupChatOpen, setGroupChatOpen] = useState(false);
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
    if (!chatClient) return;

    const fetchChannels = async () => {
      try {
        console.log('Fetching channels for user:', chatClient.userID);

        // First query team channels
        const teamFilter = { 
          type: 'team',
          members: { $in: [chatClient.userID] }
        };

        // Then query direct message channels
        const dmFilter = {
          type: 'messaging',
          members: { $in: [chatClient.userID] }
        };

        const sort = { last_message_at: -1 };

        const [teamChannels, dmChannels] = await Promise.all([
          chatClient.queryChannels(teamFilter, sort, {
            watch: true,
            state: true,
            presence: true,
            message_limit: 30,
          }),
          chatClient.queryChannels(dmFilter, sort, {
            watch: true,
            state: true,
            presence: true,
            message_limit: 30,
          })
        ]);

        console.log('Fetched team channels:', teamChannels.map(ch => ({
          id: ch.id,
          type: ch.type,
          name: ch.data?.name,
          members: Object.keys(ch.state.members)
        })));

        // Combine and sort all channels
        const allChannels = [...teamChannels, ...dmChannels].sort((a, b) => {
          const aDate = a.state.last_message_at || a.created_at;
          const bDate = b.state.last_message_at || b.created_at;
          return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
        });

        setChannels(allChannels);

        // Set up event handlers
        const handleChannelCreated = (event: any) => {
          const { channel } = event;
          if (channel.state.members[chatClient.userID]) {
            setChannels(prev => [channel, ...prev]);
          }
        };

        const handleChannelUpdated = (event: any) => {
          const { channel } = event;
          setChannels(prev => {
            const index = prev.findIndex(ch => ch.cid === channel.cid);
            if (index === -1) return prev;
            const newChannels = [...prev];
            newChannels[index] = channel;
            return newChannels;
          });
        };

        const handleNewMessage = (event: any) => {
          const { message, cid } = event;
          setChannels(prev => {
            const channelIndex = prev.findIndex(ch => ch.cid === cid);
            if (channelIndex === -1) return prev;

            const newChannels = [...prev];
            const channel = newChannels[channelIndex];
            
            // Update channel's messages
            channel.state.messages = [...channel.state.messages, message];
            
            // Move channel to top
            newChannels.splice(channelIndex, 1);
            return [channel, ...newChannels];
          });
        };

        const handleChannelDeleted = (event: any) => {
          const { channel } = event;
          setChannels(prev => prev.filter(ch => ch.cid !== channel.cid));
        };

        // Add event listeners
        chatClient.on('channel.created', handleChannelCreated);
        chatClient.on('channel.updated', handleChannelUpdated);
        chatClient.on('channel.deleted', handleChannelDeleted);
        chatClient.on('message.new', handleNewMessage);

        // Cleanup event listeners
        return () => {
          chatClient.off('channel.created', handleChannelCreated);
          chatClient.off('channel.updated', handleChannelUpdated);
          chatClient.off('channel.deleted', handleChannelDeleted);
          chatClient.off('message.new', handleNewMessage);
        };
      } catch (error) {
        console.error('Error fetching channels:', error);
        showSnackbar('Error loading chats', 'error');
      }
    };

    fetchChannels();
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
      if (!channel || !chatClient) return;
      
      try {
        // Get a fresh channel instance
        const channelInstance = chatClient.channel(channel.type, channel.id);
        await channelInstance.watch();
        
        // Get messages
        const messages = channel.state.messages || [];
        setMessages(messages);

        // Subscribe to new messages
        const handleNewMessage = (event: any) => {
          console.log('New message received:', event);
          setMessages(prev => [...prev, event.message]);
        };

        // Subscribe to message updates
        const handleMessageUpdated = (event: any) => {
          console.log('Message updated:', event);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === event.message.id ? event.message : msg
            )
          );
        };

        channelInstance.on('message.new', handleNewMessage);
        channelInstance.on('message.updated', handleMessageUpdated);

        return () => {
          channelInstance.off('message.new', handleNewMessage);
          channelInstance.off('message.updated', handleMessageUpdated);
        };
      } catch (error) {
        console.error('Error loading messages:', error);
        showSnackbar('Error loading messages', 'error');
      }
    };

    loadMessages();
  }, [channel, chatClient]);

  useEffect(() => {
    if (!channel || !chatClient) return;

    try {
      const channelInstance = chatClient.channel(channel.type, channel.id);
      
      const handleNewMessage = (event: any) => {
        if (event.message.user?.id !== chatClient.userID) {
          setChannels(prev => prev.map(ch => 
            ch.id === channel.id 
              ? { ...ch, unreadCount: (ch.countUnread?.() || 0) + 1 }
              : ch
          ));
        }
      };

      channelInstance.on('message.new', handleNewMessage);

      return () => {
        channelInstance.off('message.new', handleNewMessage);
      };
    } catch (error) {
      console.error('Error setting up message listeners:', error);
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

  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [selectedSettingsChannel, setSelectedSettingsChannel] = useState<Channel | null>(null);

  const handleChannelSettings = (channel: Channel) => {
    setSelectedSettingsChannel(channel);
    setChannelSettingsOpen(true);
  };

  const handleChannelSelect = async (selectedChannel: Channel) => {
    try {
      if (!chatClient) return;
      setLoading(true);

      console.log('Selecting channel:', selectedChannel.cid);

      // Get a fresh channel instance
      const channelInstance = chatClient.channel(selectedChannel.type, selectedChannel.id);
      
      // Watch the channel to get real-time updates
      const watchResponse = await channelInstance.watch();
      console.log('Channel watch response:', watchResponse);
      
      // Query messages
      const messagesResponse = await channelInstance.query({
        messages: { limit: 50 },
        watch: true,
        state: true,
      });
      console.log('Channel messages response:', messagesResponse);

      // Mark as read
      await channelInstance.markRead();

      // Update state
      setChannel(channelInstance);
      setMessages(messagesResponse.messages || []);

      if (selectedChannel.type === 'team') {
        // For group chats, use channel data
        setSelectedEmployee(null);
      } else {
        // For direct messages, get the other user
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
      }
    } catch (error) {
      console.error('Error selecting channel:', error);
      showSnackbar('Error loading chat', 'error');
    } finally {
      setLoading(false);
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
            <Box sx={{ 
          p: 2.5, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
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
                const isGroup = ch.type === 'team';
                const messages = ch.state?.messages || [];
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const unreadCount = ch.countUnread?.() || 0;

                // For group chats, use channel data
                const channelName = isGroup ? ch.data?.name : null;
                const channelImage = isGroup ? ch.data?.image : null;
                const memberCount = Object.keys(ch.state?.members || {}).length;

                // For direct messages, get the other user
                const otherUser = !isGroup && ch.state.members
                  ? Object.values(ch.state.members).find(
                      (m) => m.user?.id !== chatClient?.userID
                    )?.user
                  : null;

                return (
                  <ListItem
                    key={ch.id}
                    button
                    selected={channel?.id === ch.id}
                    onClick={() => handleChannelSelect(ch)}
                    secondaryAction={
                      isGroup && (
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChannelSettings(ch);
                          }}
                        >
                          <SettingsOutlined />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemAvatar>
                      {isGroup ? (
                        <Avatar src={channelImage}>
                          {channelName?.[0]?.toUpperCase() || <GroupIcon />}
                        </Avatar>
                      ) : (
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
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            sx={{
                              fontWeight: unreadCount > 0 ? 700 : 400,
                            }}
                          >
                            {isGroup ? channelName : otherUser?.name || 'Unknown'}
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
                        <Box>
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
                                {lastMessage.user?.id === chatClient?.userID ? 'You: ' : 
                                  isGroup ? `${lastMessage.user?.name}: ` : ''}
                                {lastMessage.text}
                              </>
                            ) : (
                              'No messages yet'
                            )}
                          </Typography>
                          {isGroup && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.5 }}
                            >
                              {memberCount} members
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* Chat actions */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ChatIcon />}
                onClick={() => setNewChatOpen(true)}
              >
                New Chat
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GroupIcon />}
                onClick={() => setGroupChatOpen(true)}
              >
                New Group
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
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    {channel?.type === 'team' ? (
                      <>
                        <Avatar src={channel.data?.image} sx={{ mr: 1 }}>
                          {channel.data?.name?.[0]?.toUpperCase() || <GroupIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">
                            {channel.data?.name}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {Object.keys(channel.state?.members || {}).length} members
                          </Typography>
                        </Box>
                      </>
                    ) : selectedEmployee ? (
                      <>
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
                      </>
                    ) : null}
                  </Box>
                  {channel?.type === 'team' && (
                    <IconButton onClick={() => handleChannelSettings(channel)}>
                      <SettingsOutlined />
                    </IconButton>
                  )}
                </Box>

                {/* Chat messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                              isOwnMessage={msg.user?.id === chatClient?.userID}
                            />
                          );
                        }

                        return (
                          <Message
                            key={msg.id}
                            message={msg}
                            isOwnMessage={msg.user?.id === chatClient?.userID}
                          />
                        );
                      })}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        color: 'text.secondary',
                        gap: 1,
                      }}
                    >
                      <ChatIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                      <Typography>No messages yet</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Be the first to send a message!
                      </Typography>
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

      <GroupChatDialog
        open={groupChatOpen}
        onClose={() => setGroupChatOpen(false)}
        chatClient={chatClient}
        onChannelCreated={(channel) => {
          console.log('New channel created in dialog:', channel);
          setChannel(channel);
          // No need to manually update channels here as it will be handled by the channel.created event
          setGroupChatOpen(false);
        }}
      />
    </Box>
  );
}
