import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import {
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Divider,
  Checkbox,
  Chip,
  Drawer,
  LinearProgress,
  Switch,
  Popover,
  CircularProgress,
  Badge,
  Tooltip,
  Avatar,
  AvatarGroup,
  ListItemAvatar,
  Autocomplete,
  InputAdornment,
  Collapse
} from '@mui/material';

import {
  Chat as ChatIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  CircleOutlined,
  CheckCircleOutline,
  RemoveCircleOutline,
  Group as GroupIcon,
  Person as PersonIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddReaction as AddReactionIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Close as CloseIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Download as DownloadIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Forward as ForwardIcon,
  PushPin as PushPinIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack'; // Add this line
import Message from './Message';
import FileMessage from './FileMessage';
import NewChatDialog from './NewChatDialog';
import GroupChatDialog from './GroupChatDialog';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import { uploadChatFile } from '@/services/supabaseStorage';
import FilePreviewDialog from './FilePreviewDialog';
import { keyframes } from '@mui/system';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Employee {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  position?: string;
}

const typingAnimation = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
`;

const REACTION_MAP = {
  'thumbs_up': '👍',
  'heart': '❤️',
  'smile': '😊',
  'laugh': '😂',
  'wow': '😮',
  'sad': '😢',
  'angry': '😠',
  'clap': '👏',
  'fire': '🔥',
  'rocket': '🚀'
} as const;

const REACTION_REVERSE_MAP = Object.entries(REACTION_MAP).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as { [key: string]: string });

// Add this helper function at the top
const formatMessageTime = (created_at: string) => {
  const date = new Date(created_at);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    // Show date for messages older than a day
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } else {
    // Show only time for today's messages
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit'
    });
  }
};

// Add this helper function at the top
const isMessageEdited = (msg: any) => {
  return msg.updated_at && msg.created_at && 
    new Date(msg.updated_at).getTime() > new Date(msg.created_at).getTime() + 1000; // 1 second buffer
};

export default function StreamChatPopover() {
  const { user } = useAuth();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // State hooks - group all state declarations together
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: { name: string; timeout: NodeJS.Timeout } }>({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [groupSettingsAnchorEl, setGroupSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [outOfOffice, setOutOfOffice] = useState(false);
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState('');
  const [showOOODialog, setShowOOODialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showThread, setShowThread] = useState(false);
  const [threadMessage, setThreadMessage] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [threadReply, setThreadReply] = useState('');
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardComment, setForwardComment] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatUsers, setNewChatUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<{ [key: string]: any }>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  // Refs
  const channelsRef = React.useRef<Channel[]>([]);
  const currentChannelRef = React.useRef<Channel | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define handleChannelSelect at the top level
  const handleChannelSelect = useCallback(async (selectedChannel: Channel) => {
    try {
      // Watch the channel first to ensure we have latest state
      await selectedChannel.watch();
      
      // Update messages immediately with current channel state without pinned parameter
      const response = await selectedChannel.query({
        messages: { 
          limit: 50,
          // Remove pinned parameter to prevent auto-pinning
          pinned: undefined
        }
      });

      if (response?.messages) {
        // Filter out thread replies from main messages
        const mainMessages = response.messages.filter((msg: any) => !msg.parent_id);
        setMessages(mainMessages);
      }
      
      // For direct messages, set the selected employee
      if (selectedChannel.data?.type !== 'team') {
        const members = Object.values(selectedChannel.state?.members || {})
          .filter((member: any) => member.user_id !== chatClient?.userID)
          .map((member: any) => member.user?.name || member.user?.id);
        
        setSelectedEmployee({
          id: members[0],
          name: members[0],
          email: members[0],
          position: '',
          photoURL: ''
        });
      } else {
        // For group chats, clear selected employee
        setSelectedEmployee(null);
      }
      
      // Set the channel
      setChannel(selectedChannel);
      
      // Mark channel as read
      await selectedChannel.markRead();
    } catch (error) {
      console.error('Error selecting channel:', error);
    }
  }, [chatClient]);

  // Load pinned messages when channel changes
  useEffect(() => {
    if (!channel) return;
    
    const loadPinnedMessages = async () => {
      try {
        // Only load messages that are explicitly pinned
        const response = await channel.query({ 
          messages: { 
            pinned: true,
            limit: 50
          } 
        });
        
        // Filter out any messages that don't have pinned set to true
        const pinnedMsgs = response.messages?.filter(msg => msg.pinned === true) || [];
        setPinnedMessages(pinnedMsgs);
      } catch (error) {
        console.error('Error loading pinned messages:', error);
      }
    };

    loadPinnedMessages();
  }, [channel]);

  // Sync refs with state
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    currentChannelRef.current = channel;
  }, [channel]);

  // Function to safely update channels state
  const updateChannelsState = React.useCallback((updater: (prev: Channel[]) => Channel[]) => {
    setChannels(prev => {
      const updated = updater(prev);
      channelsRef.current = updated;
      return updated;
    });
  }, []);

  // Function to update a specific channel in the list
  const updateChannelInList = React.useCallback((channelToUpdate: Channel, moveToTop: boolean = false) => {
    updateChannelsState(prev => {
      const updatedChannels = [...prev];
      const channelIndex = updatedChannels.findIndex(ch => ch.cid === channelToUpdate.cid);
      
      if (channelIndex !== -1) {
        // Create updated channel with preserved data
        const updatedChannel = {
          ...updatedChannels[channelIndex],
          state: {
            ...updatedChannels[channelIndex].state,
            messages: channelToUpdate.state.messages,
            last_message_at: channelToUpdate.state.last_message_at,
          },
          data: {
            ...updatedChannels[channelIndex].data,
            ...channelToUpdate.data,
          },
        };

        if (moveToTop) {
          // Remove and add to top
          updatedChannels.splice(channelIndex, 1);
          return [updatedChannel, ...updatedChannels];
        } else {
          // Update in place
          updatedChannels[channelIndex] = updatedChannel;
          return updatedChannels;
        }
      }
      return prev;
    });
  }, []);

  // Function to load channels with proper error handling
  const loadChannels = useCallback(async () => {
    if (!chatClient) return;
    
    try {
      console.log('Loading channels...');
      
      // Load all channels in a single query
      const channels = await chatClient.queryChannels(
        { 
          members: { $in: [chatClient.userID] },
          type: { $in: ['team', 'messaging'] }
        },
        { last_message_at: -1 },
        { 
          state: true,
          watch: true,
          presence: true,
          messages: { limit: 30 }
        }
      );

      // Sort channels by unread and last message time
      const sortedChannels = channels.sort((a, b) => {
        // First, sort by unread messages
        const aUnread = a.state?.unread_count || 0;
        const bUnread = b.state?.unread_count || 0;
        
        if (aUnread !== bUnread) {
          return bUnread - aUnread; // Higher unread count first
        }
        
        // Then by last message time
        const aTime = a.state?.last_message_at || a.created_at;
        const bTime = b.state?.last_message_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChannels(sortedChannels);
      
      // If no channel is selected, select the first one
      if (!channel && sortedChannels.length > 0) {
        handleChannelSelect(sortedChannels[0]);
      }
      
      console.log('Channels loaded:', sortedChannels.length);
    } catch (error) {
      console.error('Error loading channels:', error);
      enqueueSnackbar('Error loading chats', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  }, [chatClient, handleChannelSelect, enqueueSnackbar]);

  // Update handleChannelSelect to not include pinned parameter
  // Removed duplicate handleChannelSelect function

  // Handle user presence
  useEffect(() => {
    if (!chatClient) return;

    const handlePresenceChange = (event: any) => {
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
    };

    chatClient.on('user.presence.changed', handlePresenceChange);

    return () => {
      chatClient.off('user.presence.changed', handlePresenceChange);
    };
  }, [chatClient]);

  // Add useEffect to listen for new messages
  useEffect(() => {
    if (!chatClient) return;

    const handleNewMessage = () => {
      // Refresh channels to update order
      loadChannels();
    };

    // Listen for new messages on any channel
    chatClient.on('message.new', handleNewMessage);

    return () => {
      chatClient.off('message.new', handleNewMessage);
    };
  }, [chatClient, loadChannels]);

  // Add real-time update handlers
  useEffect(() => {
    if (!chatClient) return;

    const handleNewMessage = (event: any) => {
      const { message } = event;
      
      // Update channels state to trigger re-render with new order
      setChannels(prevChannels => {
        if (!prevChannels) return prevChannels;
        
        const updatedChannels = [...prevChannels];
        const channelIndex = updatedChannels.findIndex(ch => ch.cid === message.cid);
        
        if (channelIndex !== -1) {
          // Move channel to top
          const channel = updatedChannels.splice(channelIndex, 1)[0];
          updatedChannels.unshift(channel);
        }
        
        return sortChannels(updatedChannels);
      });
    };

    const handleChannelUpdated = (event: any) => {
      const { channel: updatedChannel } = event;
      
      setChannels(prevChannels => {
        if (!prevChannels) return prevChannels;
        
        return sortChannels(
          prevChannels.map(ch => 
            ch.cid === updatedChannel.cid ? updatedChannel : ch
          )
        );
      });
    };

    // Listen for new messages and channel updates
    chatClient.on('message.new', handleNewMessage);
    chatClient.on('channel.updated', handleChannelUpdated);
    chatClient.on('notification.message_new', handleNewMessage);

    return () => {
      chatClient.off('message.new', handleNewMessage);
      chatClient.off('channel.updated', handleChannelUpdated);
      chatClient.off('notification.message_new', handleNewMessage);
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
    if (!channel || (!messageText.trim() && selectedFiles.length === 0)) return;

    try {
      // Upload files first if any
      const attachments = [];
      for (const file of selectedFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const response = await channel.sendFile(file, null, (sent: number, total: number) => {
          const progress = Math.round((sent / total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });

        attachments.push({
          type: 'file',
          asset_url: response.file,
          title: file.name,
          mime_type: file.type,
          file_size: file.size,
        });
      }

      // Send message with attachments but without pinned parameter
      const message = await channel.sendMessage({
        text: messageText,
        attachments,
        user: {
          id: user?.email?.replace(/[.@]/g, '_') || '',
          name: user?.displayName || '',
          image: user?.photoURL
        }
      });

      // Check if message was sent successfully
      if (message) {
        // Refresh channels to update order
        loadChannels();

        // Update channel in list to reflect new message
        updateChannelInList(channel, true);

        // Clear states
        setMessageText('');
        setSelectedFiles([]);
        setUploadProgress({});
      } else {
        enqueueSnackbar('Failed to send message', { 
          variant: 'error',
          autoHideDuration: 3000
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      enqueueSnackbar('Failed to send message', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  // Effect to establish WebSocket connection and handle real-time updates
  useEffect(() => {
    if (!chatClient || !channel) return;

    // Watch the channel to establish WebSocket connection
    const watchChannel = async () => {
      try {
        const response = await channel.watch({
          messages: { limit: 50 }
        });
        setMessages(response.messages || []);
      } catch (error) {
        console.error('Error watching channel:', error);
      }
    };

    // Set up message listener for current channel only
    const handleNewMessage = (event: any) => {
      const { message } = event;
      // Only add to messages if it's not a thread reply and not already in the list
      if (!message.parent_id) {
        setMessages(prev => {
          // Check if message already exists
          const messageExists = prev.some(m => m.id === message.id);
          if (messageExists) return prev;
          return [...prev, message];
        });

        // Update channel in list to reflect new message
        if (message.user?.id !== chatClient?.userID) {
          updateChannelInList(channel, true);
        }
      }
    };

    watchChannel();
    channel.on('message.new', handleNewMessage);

    return () => {
      channel.off('message.new', handleNewMessage);
    };
  }, [chatClient, channel, updateChannelInList]);

  // Initial channel load
  useEffect(() => {
    if (!chatClient) return;
    loadChannels();
  }, [chatClient, loadChannels]);

  const handleOutOfOfficeToggle = async () => {
    if (!outOfOffice) {
      setShowOOODialog(true);
    } else {
      setOutOfOffice(false);
      setOutOfOfficeMessage('');
      if (chatClient) {
        await chatClient.partialUpdateUser({
          id: chatClient.userID,
          set: {
            out_of_office: false,
            out_of_office_message: ''
          }
        });
      }
    }
  };

  const handleSetOutOfOffice = async () => {
    if (chatClient && outOfOfficeMessage.trim()) {
      await chatClient.partialUpdateUser({
        id: chatClient.userID,
        set: {
          out_of_office: true,
          out_of_office_message: outOfOfficeMessage
        }
      });
      setOutOfOffice(true);
      setShowOOODialog(false);
    }
  };

  // Add this effect to load OOO status
  useEffect(() => {
    if (chatClient) {
      const loadOOOStatus = async () => {
        const userData = await chatClient.getUser(chatClient.userID);
        setOutOfOffice(userData.out_of_office || false);
        setOutOfOfficeMessage(userData.out_of_office_message || '');
      };
      loadOOOStatus();
    }
  }, [chatClient]);

  // Add these functions
  const handleEditMessage = (msg: any) => {
    setEditingMessage(msg);
    setEditText(msg.text);
  };

  const handleSaveEdit = async () => {
    if (editingMessage && channel && editText.trim()) {
      try {
        // Use partialUpdateMessage instead of updateMessage
        await chatClient?.partialUpdateMessage(editingMessage.id, {
          set: {
            text: editText
          }
        });
        setEditingMessage(null);
        setEditText('');
      } catch (error) {
        console.error('Error updating message:', error);
      }
    }
  };

  const handleDeleteMessage = async (msg: any) => {
    if (channel && window.confirm('Are you sure you want to delete this message?')) {
      try {
        await chatClient?.deleteMessage(msg.id);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  // Add forward message handler
  const handleForwardMessage = async () => {
    if (!forwardMessage || selectedChannels.length === 0) return;

    try {
      const sourceChannel = channels.find(ch => ch.id === channel?.id);
      const sourceChatName = sourceChannel ? getChannelDisplayName() : 'Unknown Chat';
      const senderName = forwardMessage.user?.name || forwardMessage.user?.id || 'Unknown User';
      const messageTime = formatMessageTime(forwardMessage.created_at);

      const forwardedText = `${forwardComment ? `${forwardComment}\n\n` : ''}Forwarded message from ${senderName} in ${sourceChatName} (${messageTime}):\n―――――――――――――――\n${forwardMessage.text}`;

      await Promise.all(
        selectedChannels.map(async (channelId) => {
          const targetChannel = channels.find((ch) => ch.id === channelId);
          if (!targetChannel) return;

          const messageData = {
            text: forwardedText,
            attachments: forwardMessage.attachments,
            mentioned_users: [],
            user: {
              id: user?.email?.replace(/[.@]/g, '_') || '',
              name: user?.displayName || '',
              image: user?.photoURL
            }
          };

          await targetChannel.sendMessage(messageData);
        })
      );

      loadChannels();
      setForwardDialogOpen(false);
      setForwardMessage(null);
      setForwardComment('');
      setSelectedChannels([]);
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  };

  // Add function to sort channels by recent activity
  const sortChannels = (channels: any[]) => {
    return channels.sort((a, b) => {
      // Get last message times
      const aTime = a.state?.last_message_at || a.created_at;
      const bTime = b.state?.last_message_at || b.created_at;
      
      // Check for unread messages
      const aUnread = a.state?.unread_count || 0;
      const bUnread = b.state?.unread_count || 0;
      
      // Prioritize unread messages
      if (aUnread !== bUnread) {
        return bUnread - aUnread; // Higher unread count first
      }
      
      // Then sort by last message time
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  };

  // Add function to create new chat and forward
  const handleCreateNewChatAndForward = async () => {
    try {
      const newChannel = await chatClient?.channel('messaging', {
        members: [...newChatUsers, chatClient.userID],
      });
      await newChannel?.watch();
      
      const sourceChannel = channels.find(ch => ch.id === channel?.id);
      const sourceChatName = sourceChannel ? getChannelDisplayName() : 'Unknown Chat';
      const senderName = forwardMessage.user?.name || forwardMessage.user?.id || 'Unknown User';
      const messageTime = formatMessageTime(forwardMessage.created_at);

      const forwardedText = `${forwardComment ? `${forwardComment}\n\n` : ''}Forwarded message from ${senderName} in ${sourceChatName} (${messageTime}):\n―――――――――――――――\n${forwardMessage.text}`;

      const messageData = {
        text: forwardedText,
        attachments: forwardMessage.attachments,
        mentioned_users: [],
        user: {
          id: user?.email?.replace(/[.@]/g, '_') || '',
          name: user?.displayName || '',
          image: user?.photoURL
        }
      };

      await newChannel?.sendMessage(messageData);
      
      setShowNewChatDialog(false);
      setForwardDialogOpen(false);
      setForwardMessage(null);
      setForwardComment('');
      setSelectedChannels([]);
      setNewChatUsers([]);
      loadChannels();
    } catch (error) {
      console.error('Error creating new chat and forwarding:', error);
    }
  };

  // Initialize chat client
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
        
        // Connect user
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
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, [user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    event.target.value = ''; // Reset input
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilePreview = (attachment: any) => {
    setPreviewFile({
      url: attachment.asset_url,
      type: attachment.mime_type || '',
      name: attachment.title || 'File'
    });
    setShowPreview(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };

  const handleTyping = useCallback(() => {
    if (!channel || !chatClient) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing.start event
    channel.keystroke();

    // Set new timeout to stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      channel?.stopTyping();
    }, 2000);
  }, [channel, chatClient]);

  useEffect(() => {
    if (!channel || !chatClient) return;

    // Watch the channel to establish WebSocket connection
    const watchChannel = async () => {
      try {
        const response = await channel.watch({
          messages: { limit: 50 }
        });
        setMessages(response.messages || []);
      } catch (error) {
        console.error('Error watching channel:', error);
      }
    };

    // Set up message listener for current channel only
    const handleNewMessage = (event: any) => {
      const { message } = event;
      // Only add to messages if it's not a thread reply
      if (!message.parent_id) {
        setMessages(prev => {
          // Check if message already exists
          const messageExists = prev.some(m => m.id === message.id);
          if (messageExists) return prev;
          return [...prev, message];
        });
      }
    };

    watchChannel();
    channel.on('message.new', handleNewMessage);

    return () => {
      channel.off('message.new', handleNewMessage);
    };
  }, [chatClient, channel]);

  // Add typing event handlers
  useEffect(() => {
    if (!channel) return;

    const handleTypingStart = (event: any) => {
      const { user } = event;
      if (user.id === chatClient?.userID) return;

      setTypingUsers(prev => ({
        ...prev,
        [user.id]: {
          name: user.name || user.id,
          timeout: setTimeout(() => {
            setTypingUsers(current => {
              const updated = { ...current };
              delete updated[user.id];
              return updated;
            });
          }, 3000)
        }
      }));
    };

    const handleTypingStop = (event: any) => {
      const { user } = event;
      if (user.id === chatClient?.userID) return;

      setTypingUsers(prev => {
        const updated = { ...prev };
        if (updated[user.id]?.timeout) {
          clearTimeout(updated[user.id].timeout);
        }
        delete updated[user.id];
        return updated;
      });
    };

    channel.on('typing.start', handleTypingStart);
    channel.on('typing.stop', handleTypingStop);

    return () => {
      channel.off('typing.start', handleTypingStart);
      channel.off('typing.stop', handleTypingStop);
      // Clear any remaining typing timeouts
      Object.values(typingUsers).forEach(user => {
        if (user.timeout) clearTimeout(user.timeout);
      });
      setTypingUsers({});
    };
  }, [channel, chatClient?.userID]);

  // Update formatTypingIndicator to handle the new typing users structure
  const formatTypingIndicator = () => {
    if (!typingUsers || Object.keys(typingUsers).length === 0) return '';

    const typingUsersList = Object.values(typingUsers)
      .map(user => user.name)
      .filter(Boolean);

    if (typingUsersList.length === 0) return '';
    if (typingUsersList.length === 1) return `${typingUsersList[0]} is typing...`;
    if (typingUsersList.length === 2) return `${typingUsersList.join(' and ')} are typing...`;
    return 'Multiple people are typing...';
  };

  const handleGroupSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setGroupSettingsAnchorEl(event.currentTarget);
  };

  const handleGroupSettingsClose = () => {
    setGroupSettingsAnchorEl(null);
  };

  const handleUpdateGroupName = async () => {
    if (!channel || !editGroupName.trim()) return;
    
    try {
      await channel.updatePartial({
        set: {
          name: editGroupName.trim()
        }
      });
      handleGroupSettingsClose();
      setEditGroupName('');
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  };

  const handleManageMembers = () => {
    setShowMemberManagement(true);
    handleGroupSettingsClose();
  };

  const handleAddMembers = async () => {
    if (!channel || selectedMembers.length === 0) return;

    try {
      await channel.addMembers(selectedMembers);
      setShowMemberManagement(false);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channel) return;

    try {
      await channel.removeMember(memberId);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // Fetch employees data
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user) return;

      try {
        const employeesRef = collection(db, 'employees');
        const snapshot = await getDocs(employeesRef);
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployees();
  }, [user]);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionAnchorEl, setReactionAnchorEl] = useState<null | HTMLElement>(null);
  const [reactionUpdates, setReactionUpdates] = useState<{ [key: string]: any[] }>({});

  const handleReactionClick = (event: React.MouseEvent<HTMLElement>, message: any) => {
    setReactionAnchorEl(event.currentTarget);
    setSelectedMessage(message);
    setShowReactionPicker(true);
  };

  const handleAddReaction = async (emoji: string) => {
    if (!channel || !selectedMessage) return;
    
    try {
      const reactionType = REACTION_REVERSE_MAP[emoji];
      if (!reactionType) {
        console.error('Invalid emoji reaction:', emoji);
        return;
      }

      // Optimistically update UI
      const newReaction = {
        type: reactionType,
        user_id: chatClient.userID,
        user: {
          id: chatClient.userID,
          name: user?.displayName || '',
          image: user?.photoURL
        },
        created_at: new Date().toISOString()
      };

      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === selectedMessage.id) {
            const updatedMsg = { ...msg };
            const reactions = [...(updatedMsg.latest_reactions || [])];
            const existingIndex = reactions.findIndex(r => 
              r.type === reactionType && r.user_id === chatClient.userID
            );
            
            if (existingIndex === -1) {
              reactions.push(newReaction);
            }
            
            updatedMsg.latest_reactions = reactions;
            return updatedMsg;
          }
          return msg;
        })
      );

      // Send reaction to server
      await channel.sendReaction(selectedMessage.id, {
        type: reactionType,
      });

      setReactionAnchorEl(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Revert optimistic update on error
      setMessages(prevMessages => [...prevMessages]);
    }
  };

  const handleRemoveReaction = async (message: any, reactionType: string) => {
    if (!channel) return;

    try {
      // Optimistically update UI
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === message.id) {
            const updatedMsg = { ...msg };
            updatedMsg.latest_reactions = (updatedMsg.latest_reactions || []).filter(
              r => !(r.type === reactionType && r.user_id === chatClient.userID)
            );
            return updatedMsg;
          }
          return msg;
        })
      );

      // Send to server
      await channel.deleteReaction(message.id, reactionType);
    } catch (error) {
      console.error('Error removing reaction:', error);
      // Revert optimistic update on error
      setMessages(prevMessages => [...prevMessages]);
    }
  };

  useEffect(() => {
    if (!channel) return;

    const handleReactionNew = (event: any) => {
      const { message_id, reaction, user } = event;
      
      // Update messages with new reaction
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === message_id) {
            const updatedMsg = { ...msg };
            const reactions = Array.isArray(updatedMsg.latest_reactions) 
              ? [...updatedMsg.latest_reactions] 
              : [];

            // Check if reaction already exists
            const existingIndex = reactions.findIndex(r => 
              r.type === reaction.type && r.user_id === user.id
            );

            if (existingIndex === -1) {
              // Add new reaction with full user data
              reactions.push({
                ...reaction,
                user: {
                  id: user.id,
                  name: user.name,
                  image: user.image
                }
              });
              updatedMsg.latest_reactions = reactions;
              
              // Update reaction counts if they exist
              if (updatedMsg.reaction_counts) {
                updatedMsg.reaction_counts = {
                  ...updatedMsg.reaction_counts,
                  [reaction.type]: (updatedMsg.reaction_counts[reaction.type] || 0) + 1
                };
              }
            }
            
            return updatedMsg;
          }
          return msg;
        })
      );
    };

    const handleReactionDeleted = (event: any) => {
      const { message_id, reaction, user } = event;
      
      // Update messages by removing the reaction
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === message_id) {
            const updatedMsg = { ...msg };
            
            // Filter out the deleted reaction
            updatedMsg.latest_reactions = (updatedMsg.latest_reactions || []).filter(
              r => !(r.type === reaction.type && r.user_id === user.id)
            );

            // Update reaction counts if they exist
            if (updatedMsg.reaction_counts && updatedMsg.reaction_counts[reaction.type]) {
              updatedMsg.reaction_counts = {
                ...updatedMsg.reaction_counts,
                [reaction.type]: Math.max((updatedMsg.reaction_counts[reaction.type] || 1) - 1, 0)
              };
            }

            return updatedMsg;
          }
          return msg;
        })
      );
    };

    // Listen to both channel and client events
    channel.on('reaction.new', handleReactionNew);
    channel.on('reaction.deleted', handleReactionDeleted);

    // Also watch the channel state
    const handleChannelUpdated = () => {
      if (channel.state && channel.state.messages) {
        setMessages([...channel.state.messages]);
      }
    };

    channel.on('message.updated', handleChannelUpdated);

    return () => {
      channel.off('reaction.new', handleReactionNew);
      channel.off('reaction.deleted', handleReactionDeleted);
      channel.off('message.updated', handleChannelUpdated);
    };
  }, [channel]);

  // Update message rendering to handle multiple attachments
  const renderReactions = (message: any, reactions: any[]) => {
    return reactions.map((reaction: any) => {
      const emoji = REACTION_MAP[reaction.type as keyof typeof REACTION_MAP] || reaction.type;
      const isOwnReaction = reaction.user_id === chatClient.userID;
      
      return (
        <Chip
          key={`${reaction.type}-${reaction.user_id}`}
          label={emoji}
          size="small"
          onClick={() => isOwnReaction ? handleRemoveReaction(message, reaction.type) : null}
          sx={{ 
            height: 24,
            bgcolor: message.user?.id === chatClient.userID ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
            color: message.user?.id === chatClient.userID ? '#fff' : 'inherit',
            cursor: isOwnReaction ? 'pointer' : 'default',
            '&:hover': isOwnReaction ? {
              bgcolor: message.user?.id === chatClient.userID ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)'
            } : undefined
          }}
        />
      );
    });
  };

  const [messageUpdates, setMessageUpdates] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!channel) return;

    const handleNewThreadReply = (event: any) => {
      const { message } = event;
      if (message.parent_id) {
        // Update the reply count for the parent message
        setMessageUpdates(prev => ({
          ...prev,
          [message.parent_id]: (prev[message.parent_id] || 0) + 1
        }));
      }
    };

    const handleThreadMessageDeleted = (event: any) => {
      const { message } = event;
      if (message.parent_id) {
        // Decrease the reply count for the parent message
        setMessageUpdates(prev => ({
          ...prev,
          [message.parent_id]: Math.max((prev[message.parent_id] || 0) - 1, 0)
        }));
      }
    };

    channel.on('message.new', handleNewThreadReply);
    channel.on('message.deleted', handleThreadMessageDeleted);

    return () => {
      channel.off('message.new', handleNewThreadReply);
      channel.off('message.deleted', handleThreadMessageDeleted);
    };
  }, [channel]);

  const handleThreadClick = async (message: any) => {
    setThreadMessage(message);
    setShowThread(true);
    setThreadReplies([]); // Reset replies when opening new thread
    
    try {
      if (!channel) return;

      // Get replies for the thread
      const response = await channel.getReplies(message.id, {
        limit: 25,
      });

      if (response?.messages) {
        setThreadReplies(response.messages);
      }

      // Watch for new replies
      const threadId = message.id;
      const handleNewMessage = (event: any) => {
        const { message: newMessage } = event;
        if (newMessage?.parent_id === threadId) {
          setThreadReplies(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (!exists) {
              return [...prev, newMessage];
            }
            return prev;
          });
        }
      };

      channel.on('message.new', handleNewMessage);

      // Cleanup function
      return () => {
        channel.off('message.new', handleNewMessage);
      };
    } catch (error) {
      console.error('Error fetching thread replies:', error);
    }
  };

  const handleSendThreadReply = async () => {
    if (!channel || !threadMessage || !threadReply.trim()) return;

    try {
      const messageData = {
        text: threadReply,
        parent_id: threadMessage.id,
        show_in_channel: false,
        user: {
          id: user?.email?.replace(/[.@]/g, '_') || '',
          name: user?.displayName || '',
          image: user?.photoURL
        }
      };

      const response = await channel.sendMessage(messageData);

      if (response?.message) {
        setThreadReplies(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === response.message.id);
          if (!exists) {
            return [...prev, response.message];
          }
          return prev;
        });

        // Update the reply count on the parent message
        if (threadMessage) {
          const updatedMessage = { ...threadMessage };
          updatedMessage.reply_count = (updatedMessage.reply_count || 0) + 1;
          setThreadMessage(updatedMessage);
        }
      }
      setThreadReply('');
    } catch (error) {
      console.error('Error sending thread reply:', error);
    }
  };

  // Cleanup thread watchers when closing thread
  useEffect(() => {
    if (!showThread) {
      if (channel) {
        channel.off('message.new');
      }
      setThreadReplies([]);
      setThreadMessage(null);
    }
  }, [showThread, channel]);

  const reactionMenu = (
    <Popover
      open={Boolean(reactionAnchorEl)}
      anchorEl={reactionAnchorEl}
      onClose={() => {
        setShowReactionPicker(false);
        setReactionAnchorEl(null);
      }}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Box sx={{ p: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
        {Object.values(REACTION_MAP).map((emoji) => (
          <IconButton
            key={emoji}
            size="small"
            onClick={() => handleAddReaction(emoji)}
            sx={{
              p: 0.5,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <Typography>{emoji}</Typography>
          </IconButton>
        ))}
      </Box>
    </Popover>
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon />;
    if (mimeType.includes('pdf')) return <PictureAsPdfIcon />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <DescriptionIcon />;
    return <InsertDriveFileIcon />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!chatClient) {
    return null;
  }

  // Add the function inside the component to access chatClient
  const getChannelDisplayName = () => {
    if (!channel) return '';
    
    // For group chats, use channel name
    if (channel.data?.type === 'team') {
      return channel.data?.name || 'Group Chat';
    }

    // For DMs, show the other person's name and info
    if (channel.data?.type === 'messaging') {
      const otherMember = Object.entries(channel.data?.members || {})
        .filter(([id]) => id !== chatClient?.userID)
        .map(([_, member]: [string, any]) => member.user)[0];
      
      if (otherMember) {
        const position = otherMember.position || '';
        const name = otherMember.name || otherMember.id;
        return position ? `${name} (${position})` : name;
      }
    }

    return 'Chat';
  };

  // Add function to query users
  const queryUsers = async () => {
    if (!chatClient) return;
    
    try {
      setLoadingUsers(true);
      const response = await chatClient.queryUsers(
        { id: { $ne: chatClient.userID } },
        { name: 1 },
        { limit: 100 }
      );
      
      const usersMap = response.users.reduce((acc: { [key: string]: any }, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      setUsers(usersMap);
    } catch (error) {
      console.error('Error querying users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Add function to get recent channels
  const getRecentChannels = () => {
    // Filter out the current channel from the forward options
    const otherChannels = channels.filter(ch => ch.id !== channel?.id);
    
    // Sort by last message time, handling undefined cases
    return sortChannels(otherChannels);
  };

  const renderMessage = (message: any) => {
    const isCurrentUser = message.user?.id === chatClient?.userID;
    const isForwarded = message.text?.includes('Forwarded message from');
    
    if (isForwarded) {
      const [comment, ...forwardedParts] = message.text.split('Forwarded message from');
      const [headerPart, messagePart] = forwardedParts.join('Forwarded message from').split('―――――――――――――――\n');
      
      return (
        <Box>
          {comment.trim() && (
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 1,
                color: isCurrentUser ? 'common.white' : 'text.primary'
              }}
            >
              {comment.trim()}
            </Typography>
          )}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1.5,
              bgcolor: isCurrentUser ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.04)',
              borderLeft: '4px solid',
              borderLeftColor: isCurrentUser ? 'rgba(255, 255, 255, 0.5)' : 'primary.main',
              borderRadius: 1,
              '& *': {
                borderColor: isCurrentUser ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'
              }
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mb: 1,
                color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                '& .MuiSvgIcon-root': {
                  color: isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : 'action.active'
                }
              }}
            >
              <ForwardIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'text-bottom' }} />
              Forwarded message from{headerPart}
            </Typography>
            <Typography 
              variant="body1"
              sx={{
                color: isCurrentUser ? 'common.white' : 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {messagePart}
            </Typography>
            {message.attachments?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {message.attachments.map((attachment, index) => (
                  <Box
                    key={index}
                    onClick={() => handleFilePreview(attachment)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: isCurrentUser 
                          ? 'rgba(255, 255, 255, 0.25)' 
                          : 'rgba(0, 0, 0, 0.08)',
                      },
                      borderRadius: 1,
                      overflow: 'hidden',
                      mt: 1,
                    }}
                  >
                    {attachment.mime_type?.startsWith('image/') ? (
                      <Box sx={{ position: 'relative' }}>
                        <img 
                          src={attachment.asset_url} 
                          alt={attachment.title}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: 200, 
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          bgcolor: 'rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {attachment.mime_type?.includes('pdf') ? (
                          <PictureAsPdfIcon sx={{ fontSize: 40 }} />
                        ) : (
                          getFileIcon(attachment.mime_type)
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2" 
                            noWrap
                            sx={{
                              color: 'rgba(0, 0, 0, 0.87)'
                            }}
                          >
                            {attachment.title}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{
                              color: 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            {formatFileSize(attachment.file_size || 0)}
                          </Typography>
                        </Box>
                        <VisibilityIcon sx={{
                          color: 'rgba(0, 0, 0, 0.54)'
                        }} />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Typography 
          variant="body1"
          sx={{
            color: isCurrentUser ? 'common.white' : 'text.primary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {message.text}
        </Typography>
        {message.attachments?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {message.attachments.map((attachment, index) => (
              <Box
                key={index}
                onClick={() => handleFilePreview(attachment)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.08)',
                  },
                  borderRadius: 1,
                  overflow: 'hidden',
                  mt: 1,
                }}
              >
                {attachment.mime_type?.startsWith('image/') ? (
                  <Box sx={{ position: 'relative' }}>
                    <img 
                      src={attachment.asset_url} 
                      alt={attachment.title}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 200, 
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {attachment.mime_type?.includes('pdf') ? (
                      <PictureAsPdfIcon sx={{ fontSize: 40 }} />
                    ) : (
                      getFileIcon(attachment.mime_type)
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        noWrap
                        sx={{
                          color: 'rgba(0, 0, 0, 0.87)'
                        }}
                      >
                        {attachment.title}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{
                          color: 'rgba(0, 0, 0, 0.6)'
                        }}
                      >
                        {formatFileSize(attachment.file_size || 0)}
                      </Typography>
                    </Box>
                    <VisibilityIcon sx={{
                      color: 'rgba(0, 0, 0, 0.54)'
                    }} />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Add handleCopyMessageText function
  const handleCopyMessageText = async () => {
    if (!selectedMessage?.text) return;
    
    try {
      await navigator.clipboard.writeText(selectedMessage.text);
      enqueueSnackbar('Message copied to clipboard', { 
        variant: 'success',
        autoHideDuration: 2000
      });
    } catch (error) {
      console.error('Failed to copy message:', error);
      enqueueSnackbar('Failed to copy message', { 
        variant: 'error',
        autoHideDuration: 2000
      });
    }
    setMessageMenuAnchor(null);
  };

  // Add pin/unpin message function
  const handlePinMessage = async (message: any) => {
    if (!channel) return;

    try {
      const isPinned = !message.pinned;
      
      // Use chatClient.updateMessage for pinning/unpinning
      await chatClient.updateMessage({
        ...message,
        pinned: isPinned,
        pinned_at: isPinned ? new Date().toISOString() : null,
        pinned_by: isPinned ? {
          id: chatClient.userID,
          name: user?.displayName || '',
          image: user?.photoURL
        } : null
      }, message.id, channel.cid);

      // Update messages state optimistically
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === message.id 
            ? { 
                ...msg, 
                pinned: isPinned,
                pinned_at: isPinned ? new Date().toISOString() : null,
                pinned_by: isPinned ? {
                  id: chatClient.userID,
                  name: user?.displayName || '',
                  image: user?.photoURL
                } : null
              }
            : msg
        )
      );

      // Update pinned messages collection
      if (isPinned) {
        setPinnedMessages(prev => [
          ...prev, 
          { 
            ...message, 
            pinned: true,
            pinned_at: new Date().toISOString(),
            pinned_by: {
              id: chatClient.userID,
              name: user?.displayName || '',
              image: user?.photoURL
            }
          }
        ]);
      } else {
        setPinnedMessages(prev => prev.filter(msg => msg.id !== message.id));
      }

      // Show success notification
      enqueueSnackbar(`Message ${isPinned ? 'pinned' : 'unpinned'} successfully`, {
        variant: 'success',
        autoHideDuration: 2000
      });

      // Close message menu
      setMessageMenuAnchor(null);
    } catch (error) {
      console.error('Error pinning/unpinning message:', error);
      enqueueSnackbar('Failed to pin/unpin message', {
        variant: 'error',
        autoHideDuration: 2000
      });
    }
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (channel && !isTyping) {
      channel.keystroke();
      setIsTyping(true);
      
      // Stop typing indicator after 2 seconds of no input
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (channel) {
          channel.stopTyping();
          setIsTyping(false);
        }
      }, 2000);
    }
  };

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
            width: '90vw',
            height: '85vh',
            maxWidth: 1200,
            maxHeight: 800
          }
        }}
      >
        <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
          {/* Left side - Chat list */}
          <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
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
                <MenuItem onClick={() => { setUserStatus('online'); handleStatusClose(); }}>
                  <ListItemIcon>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#44b700' }} />
                  </ListItemIcon>
                  <ListItemText primary="Online" />
                </MenuItem>
                <MenuItem onClick={() => { setUserStatus('away'); handleStatusClose(); }}>
                  <ListItemIcon>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffa000' }} />
                  </ListItemIcon>
                  <ListItemText primary="Away" />
                </MenuItem>
                <MenuItem onClick={() => { setUserStatus('busy'); handleStatusClose(); }}>
                  <ListItemIcon>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336' }} />
                  </ListItemIcon>
                  <ListItemText primary="Busy" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleOutOfOfficeToggle}>
                  <ListItemIcon>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#9e9e9e' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Out of Office" 
                    secondary={outOfOffice ? outOfOfficeMessage : null}
                  />
                  <Switch
                    edge="end"
                    checked={outOfOffice}
                    size="small"
                  />
                </MenuItem>
              </Menu>
            </Box>

            {/* Chat list */}
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {sortChannels(channels).map((ch) => {
                const isGroupChat = ch.data?.type === 'team';
                const messages = ch.state?.messages || [];
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                const unreadCount = ch.state?.unread_count || 0;

                // For group chats, use channel data
                const channelName = isGroupChat ? ch.data?.name : null;
                const channelImage = isGroupChat ? ch.data?.image : null;

                // For direct messages, get the other user
                const otherUser = !isGroupChat && ch.state.members
                  ? Object.values(ch.state.members).find(
                      (m) => m.user_id !== chatClient?.userID
                    )?.user
                  : null;

                return (
                  <ListItem
                    key={ch.id}
                    button
                    selected={channel?.id === ch.id}
                    onClick={() => handleChannelSelect(ch)}
                  >
                    <ListItemAvatar>
                      {isGroupChat ? (
                        <Avatar src={channelImage}>
                          <GroupIcon />
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
                            {(otherUser?.name || otherUser?.id)[0]?.toUpperCase()}
                          </Avatar>
                        </Badge>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography noWrap>
                            {isGroupChat ? channelName : otherUser?.name || 'Unknown User'}
                          </Typography>
                          {isGroupChat && (
                            <Chip
                              size="small"
                              label="Group"
                              variant="outlined"
                              sx={{ height: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {lastMessage?.text || 'No messages yet'}
                          </Typography>
                          {unreadCount > 0 && (
                            <Chip
                              size="small"
                              label={unreadCount}
                              color="primary"
                              sx={{ minWidth: 'auto' }}
                            />
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
                onClick={() => {
                  queryUsers();
                  setShowNewChatDialog(true);
                }}
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
            {channel ? (
              <Box sx={{ 
                display: 'flex', 
                height: '100%',
                maxHeight: '80vh',
              }}>
                {/* Messages Area */}
                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative'
                }}>
                  {/* Chat Header */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}>
                    {/* Channel Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: pinnedMessages.length > 0 ? 1 : 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={channel?.data?.image || selectedEmployee?.photoURL}
                          sx={{ width: 40, height: 40 }}
                        >
                          {getChannelDisplayName()?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {getChannelDisplayName() || 'Chat'}
                          </Typography>
                          {typingUsers && Object.keys(typingUsers).length > 0 && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatTypingIndicator()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {channel?.data?.type === 'team' && (
                          <IconButton onClick={handleGroupSettingsClick}>
                            <SettingsIcon />
                          </IconButton>
                        )}
                        <IconButton 
                          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                          color={showPinnedMessages ? "primary" : "default"}
                        >
                          <Badge badgeContent={pinnedMessages.length} color="primary">
                            <PushPinIcon />
                          </Badge>
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Pinned Messages Section */}
                    <Collapse in={showPinnedMessages && pinnedMessages.length > 0}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          mt: 1,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          bgcolor: 'grey.50',
                          p: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PushPinIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Pinned Messages ({pinnedMessages.length})
                          </Typography>
                        </Box>
                        {pinnedMessages.map((msg) => (
                          <Box 
                            key={msg.id}
                            sx={{ 
                              p: 1,
                              mb: 0.5,
                              bgcolor: 'background.paper',
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                            onClick={() => {
                              const messageElement = document.getElementById(`message-${msg.id}`);
                              if (messageElement) {
                                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                messageElement.style.backgroundColor = 'rgba(144, 202, 249, 0.2)';
                                setTimeout(() => {
                                  messageElement.style.backgroundColor = '';
                                }, 2000);
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Avatar 
                                src={msg.user?.image} 
                                sx={{ width: 24, height: 24 }}
                              >
                                {msg.user?.name?.[0] || msg.user?.id[0]}
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                    {msg.user?.name || msg.user?.id}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    • {formatMessageTime(msg.created_at)}
                                  </Typography>
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                >
                                  {msg.text}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Paper>
                    </Collapse>
                  </Box>

                  {/* Messages Area */}
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {messages.map((msg) => (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.user?.id === chatClient?.userID ? 'flex-end' : 'flex-start',
                          position: 'relative',
                          mx: 2,
                          mb: 1,
                          '&:hover .message-actions': {
                            opacity: 1
                          }
                        }}
                      >
                        {msg.user?.id === chatClient?.userID && (
                          <IconButton
                            size="small"
                            className="message-actions"
                            onClick={(e) => {
                              setSelectedMessage(msg);
                              setMessageMenuAnchor(e.currentTarget);
                            }}
                            sx={{
                              position: 'absolute',
                              right: -32,
                              top: 0,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              color: 'text.secondary'
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        <Box sx={{ 
                          maxWidth: '70%',
                          bgcolor: msg.user?.id === chatClient?.userID ? 'primary.main' : 'grey.100',
                          color: msg.user?.id === chatClient?.userID ? 'white' : 'text.primary',
                          borderRadius: 2,
                          p: 1,
                        }}>
                          {(!msg.parent_id || msg.show_in_channel) && (
                            <Box sx={{ 
                              mb: 0.5, 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: msg.user?.id === chatClient?.userID 
                                    ? 'rgba(255, 255, 255, 0.8)' 
                                    : 'rgba(0, 0, 0, 0.6)',
                                  fontWeight: 500
                                }}
                              >
                                {msg.user?.name || msg.user?.id}
                              </Typography>
                              <Typography 
                                variant="caption"
                                sx={{ 
                                  color: msg.user?.id === chatClient?.userID 
                                    ? 'rgba(255, 255, 255, 0.7)' 
                                    : 'rgba(0, 0, 0, 0.5)',
                                  ml: 1
                                }}
                              >
                                {formatMessageTime(msg.created_at)}
                              </Typography>
                            </Box>
                          )}
                          {editingMessage?.id === msg.id ? (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 200 }}>
                              <TextField
                                fullWidth
                                multiline
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                size="small"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    setEditingMessage(null);
                                    setEditText('');
                                  }
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper'
                                  }
                                }}
                              />
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={handleSaveEdit}
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditText('');
                                  }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              {renderMessage(msg)}
                              
                              {/* Message Actions */}
                              <Box
                                className="message-actions"
                                sx={{
                                  position: 'absolute',
                                  top: -30,
                                  right: msg.user?.id === chatClient?.userID ? 0 : 'auto',
                                  left: msg.user?.id === chatClient?.userID ? 'auto' : 0,
                                  display: 'flex',
                                  gap: 0.5,
                                  bgcolor: 'background.paper',
                                  borderRadius: 1,
                                  boxShadow: 1,
                                  p: 0.5,
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  zIndex: 1,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleReactionClick(e, msg)}
                                >
                                  <AddReactionIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleThreadClick(msg)}
                                >
                                  <ChatBubbleOutlineIcon />
                                </IconButton>
                              </Box>

                              {/* Thread Reply Count */}
                              {(msg.reply_count > 0 || messageUpdates[msg.id]) && (
                                <Box
                                  onClick={() => handleThreadClick(msg)}
                                  sx={{
                                    mt: 0.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    cursor: 'pointer',
                                    bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                                    color: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                                    borderRadius: 1,
                                    px: 1,
                                    py: 0.25,
                                    '&:hover': {
                                      bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)',
                                    }
                                  }}
                                >
                                  <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                                  <Typography variant="body2">
                                    {(msg.reply_count || 0) + (messageUpdates[msg.id] || 0)} {((msg.reply_count || 0) + (messageUpdates[msg.id] || 0)) === 1 ? 'reply' : 'replies'}
                                  </Typography>
                                </Box>
                              )}

                              {/* Reactions */}
                              {msg.latest_reactions && msg.latest_reactions.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                  {renderReactions(msg, msg.latest_reactions)}
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {selectedFiles.map((file, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                              p: 1,
                              bgcolor: 'rgba(0, 0, 0, 0.04)',
                              borderRadius: 1
                            }}
                          >
                            {getFileIcon(file.type)}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" noWrap>{file.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(file.size)}
                              </Typography>
                              {uploadProgress[file.name] !== undefined && (
                                <LinearProgress 
                                  variant="determinate" 
                                  value={uploadProgress[file.name]} 
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                            {file.type.startsWith('image/') && (
                              <IconButton size="small" onClick={() => handleFilePreview(file)}>
                                <VisibilityIcon />
                              </IconButton>
                            )}
                            <IconButton size="small" onClick={() => removeSelectedFile(index)}>
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                      />
                      <IconButton 
                        size="small" 
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ alignSelf: 'flex-end' }}
                      >
                        <AttachFileIcon />
                      </IconButton>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={handleMessageInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onInput={handleTyping}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Thread Panel */}
                {showThread && (
                  <Box sx={{ 
                    width: '35%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    minWidth: 300 // Minimum width for thread panel
                  }}>
                    {/* Thread Header */}
                    <Box sx={{ 
                      p: 2, 
                      borderBottom: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Typography variant="subtitle1">Thread</Typography>
                      <IconButton size="small" onClick={() => setShowThread(false)}>
                        <CloseIcon />
                      </IconButton>
                    </Box>

                    {/* Original Message */}
                    {threadMessage && (
                      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1, 
                          mb: 1 
                        }}>
                          <Avatar 
                            src={threadMessage.user?.image}
                            sx={{ width: 32, height: 32 }}
                          >
                            {threadMessage.user?.name?.[0] || threadMessage.user?.id[0]}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {threadMessage.user?.name || threadMessage.user?.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(threadMessage.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography>{threadMessage.text}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Thread Replies */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                      {Array.isArray(threadReplies) && threadReplies.map((reply: any) => (
                        <Box
                          key={reply.id}
                          sx={{
                            display: 'flex',
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          <Avatar 
                            src={reply.user?.image}
                            sx={{ width: 32, height: 32 }}
                          >
                            {reply.user?.name?.[0] || reply.user?.id[0]}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {reply.user?.name || reply.user?.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(reply.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography>{reply.text}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Thread Reply Input */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Reply to thread..."
                        value={threadReply}
                        onChange={(e) => setThreadReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendThreadReply();
                          }
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={handleSendThreadReply}
                                disabled={!threadReply.trim()}
                                color="primary"
                              >
                                <SendIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
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

      <Dialog 
        open={showPreview} 
        onClose={() => {
          setShowPreview(false);
          setPreviewFile(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {previewFile?.type?.includes('pdf') ? (
              <PictureAsPdfIcon />
            ) : previewFile?.type?.startsWith('image/') ? (
              <ImageIcon />
            ) : (
              getFileIcon(previewFile?.type || '')
            )}
            <Typography variant="h6" component="div" sx={{ 
              maxWidth: '500px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {previewFile?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => window.open(previewFile?.url, '_blank')}
              size="small"
              title="Download"
            >
              <DownloadIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                setShowPreview(false);
                setPreviewFile(null);
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0
        }}>
          {previewFile?.type?.startsWith('image/') ? (
            <img 
              src={previewFile.url} 
              alt={previewFile.name}
              style={{ 
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain'
              }} 
            />
          ) : previewFile?.type?.includes('pdf') ? (
            <Box sx={{ width: '100%', height: '80vh' }}>
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile.url)}&embedded=true`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                onLoad={(e) => {
                  // If Google Docs viewer fails, fall back to direct PDF viewing
                  const iframe = e.target as HTMLIFrameElement;
                  if (!iframe.contentWindow?.document.body.innerHTML) {
                    iframe.src = previewFile.url;
                  }
                }}
              />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 2,
              p: 4,
              textAlign: 'center'
            }}>
              <Box sx={{ fontSize: 80, color: 'text.secondary' }}>
                {getFileIcon(previewFile?.type || '')}
              </Box>
              <Typography variant="h6">
                {previewFile?.name}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => window.open(previewFile?.url, '_blank')}
              >
                Download File
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={Boolean(editGroupName)} 
        onClose={() => setEditGroupName('')}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Group Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGroupName('')}>Cancel</Button>
          <Button onClick={handleUpdateGroupName} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showMemberManagement} 
        onClose={() => setShowMemberManagement(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Group Members</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Current Members</Typography>
            <List>
              {channel?.state?.members && Object.entries(channel.state.members).map(([key, member]: [string, any]) => (
                <ListItem
                  key={key}
                  secondaryAction={
                    member.user.id !== chatClient?.userID && (
                      <IconButton edge="end" onClick={() => handleRemoveMember(member.user.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={member.user.image}>
                      {member.user.name?.[0] || member.user.id[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={member.user.name || member.user.id}
                    secondary={member.user.id === chatClient?.userID ? '(You)' : ''}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Add Members</Typography>
            <Autocomplete
              multiple
              options={employees.filter(emp => 
                !Object.keys(channel?.state?.members || {}).includes(emp.email?.replace(/[.@]/g, '_'))
              )}
              getOptionLabel={(option) => option.name || ''}
              value={employees.filter(emp => emp.email && selectedMembers.includes(emp.email.replace(/[.@]/g, '_')))}
              onChange={(_, newValue) => {
                setSelectedMembers(newValue.map(emp => emp.email?.replace(/[.@]/g, '_') || '').filter(Boolean));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Select members to add"
                  placeholder="Search employees"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowMemberManagement(false);
            setSelectedMembers([]);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMembers}
            variant="contained"
            disabled={selectedMembers.length === 0}
          >
            Add Selected Members
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showOOODialog} 
        onClose={() => setShowOOODialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set Out of Office Message</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={2}
            value={outOfOfficeMessage}
            onChange={(e) => setOutOfOfficeMessage(e.target.value)}
            placeholder="I'm currently out of office. I'll be back on..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOOODialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSetOutOfOffice}
            variant="contained"
            disabled={!outOfOfficeMessage.trim()}
          >
            Set Status
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
      >
        {/* Forward option - available for all messages */}
        <MenuItem 
          onClick={() => {
            setForwardMessage(selectedMessage);
            setForwardDialogOpen(true);
            setMessageMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <ForwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Forward</ListItemText>
        </MenuItem>

        {/* Copy option - available for all messages */}
        <MenuItem 
          onClick={() => {
            handleCopyMessageText();
            setMessageMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Text</ListItemText>
        </MenuItem>

        {/* Edit and Delete - only for user's own messages */}
        {selectedMessage?.user?.id === chatClient?.userID && (
          <>
            <Divider />
            <MenuItem 
              onClick={() => {
                handleEditMessage(selectedMessage);
                setMessageMenuAnchor(null);
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>

            <MenuItem 
              onClick={() => {
                handleDeleteMessage(selectedMessage);
                setMessageMenuAnchor(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}

        {/* Pin/Unpin option - available for all messages */}
        <MenuItem 
          onClick={() => handlePinMessage(selectedMessage)}
        >
          <ListItemIcon>
            {selectedMessage?.pinned ? (
              <PushPinIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
            ) : (
              <PushPinIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{selectedMessage?.pinned ? 'Unpin' : 'Pin'}</ListItemText>
        </MenuItem>
      </Menu>

      {reactionMenu}

      <Dialog 
        open={forwardDialogOpen} 
        onClose={() => {
          setForwardDialogOpen(false);
          setForwardMessage(null);
          setForwardComment('');
          setSelectedChannels([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Original Message:
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
              <Typography>{forwardMessage?.text}</Typography>
              {forwardMessage?.attachments?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {forwardMessage.attachments.length} attachment(s)
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Add a comment (optional)"
            value={forwardComment}
            onChange={(e) => setForwardComment(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              Select chats to forward to:
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setShowNewChatDialog(true)}
              size="small"
            >
              New Chat
            </Button>
          </Box>

          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            <List dense>
              {getRecentChannels().map((ch) => {
                const isGroup = ch.data?.type === 'team';
                const members = Object.values(ch.state?.members || {})
                  .map((member: any) => member.user?.name || member.user?.id)
                  .filter(name => name !== user?.displayName)
                  .join(', ');
                
                const lastMessageTime = ch.state?.last_message_at 
                  ? formatMessageTime(ch.state.last_message_at)
                  : 'No messages yet';
                
                return (
                  <ListItem key={ch.id} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setSelectedChannels(prev => 
                          prev.includes(ch.id)
                            ? prev.filter(id => id !== ch.id)
                            : [...prev, ch.id]
                        );
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedChannels.includes(ch.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isGroup ? (
                              <GroupIcon fontSize="small" color="action" />
                            ) : (
                              <PersonIcon fontSize="small" color="action" />
                            )}
                            <Typography>
                              {isGroup ? ch.data?.name : members}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" component="span">
                              {isGroup ? `${members.length} members` : 'Direct Message'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="span">
                              · {lastMessageTime}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setForwardDialogOpen(false);
              setForwardMessage(null);
              setForwardComment('');
              setSelectedChannels([]);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleForwardMessage}
            disabled={selectedChannels.length === 0}
            variant="contained"
          >
            Forward
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chat</DialogTitle>
        <DialogContent>
          {loadingUsers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Autocomplete
              multiple
              options={Object.values(users).map((user: any) => user.id)}
              getOptionLabel={(option) => {
                const user = users[option];
                return user?.name || user?.id || option;
              }}
              value={newChatUsers}
              onChange={(_, newValue) => setNewChatUsers(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Select Users"
                  placeholder="Search users..."
                  fullWidth
                  sx={{ mt: 1 }}
                />
              )}
              renderOption={(props, option) => {
                const user = users[option];
                return (
                  <li {...props}>
                    <ListItemAvatar>
                      <Avatar src={user?.image}>
                        {user?.name?.[0] || option[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user?.name || option}
                      secondary={option}
                    />
                  </li>
                );
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewChatDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewChatAndForward}
            disabled={newChatUsers.length === 0}
            variant="contained"
          >
            Create & Forward
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
