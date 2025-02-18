import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import { StreamVideoClient } from '@stream-io/video-client';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Paper,
  Divider,
  Checkbox,
  Badge,
  Button,
  Drawer,
  LinearProgress,
  Switch,
  Popover,
  CircularProgress,
  Autocomplete,
  Chip,
  InputAdornment,
  ListItemButton,
  IconButton,
  ListItemSecondaryAction,
  Avatar,
  AvatarGroup,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  PushPin as PushPinIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Call as CallIcon,
  Videocam as VideocamIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  InsertEmoticon as EmojiIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  PictureAsPdf as PictureAsPdfIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Image as ImageIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioFileIcon,
  Description as DescriptionIcon,
  Chat as ChatIcon,
  RadioButtonUnchecked as CircleOutlined,
  Archive as ArchiveIcon,
  Movie as MovieIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  AddReaction as AddReactionIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Forum as ForumIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack'; // Add this line
import Message from './Message';
import FileMessage from './FileMessage';
import NewChatDialog from './NewChatDialog';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import { uploadChatFile } from '@/services/supabaseStorage';
import FilePreviewDialog from './FilePreviewDialog';
import { keyframes } from '@mui/system';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import RichTextEditor from './RichTextEditor';

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

const StreamChatPopover: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState(false);
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
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callDialog, setCallDialog] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);

  // Refs
  const channelsRef = React.useRef<Channel[]>([]);
  const currentChannelRef = React.useRef<Channel | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

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
          name: employee.name || employee.email,
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
    editorRef.current?.focus();
  };

  const handleSaveEdit = async () => {
    if (!channel || !editingMessage || !editText.trim()) return;

    try {
      await channel.updateMessage({
        ...editingMessage,
        text: editText,
      });
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating message:', error);
      enqueueSnackbar('Failed to update message', { variant: 'error' });
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
    if (!chatClient || !user?.email || !forwardMessage) {
      console.error('Missing required data:', { chatClient: !!chatClient, userEmail: !!user?.email, forwardMessage: !!forwardMessage });
      return;
    }

    try {
      const channelId = `chat_${Date.now()}`;
      const members = [
        ...newChatUsers.map(u => u.email.replace(/[.@]/g, '_')),
        user.email.replace(/[.@]/g, '_')
      ];

      console.log('Creating new channel with members:', members);

      // Create the channel
      const newChannel = chatClient.channel('messaging', channelId, {
        members,
        created_by: user.email.replace(/[.@]/g, '_'),
        data: {
          config: {
            commands: ['giphy']
          }
        }
      });

      await newChannel.create();
      await newChannel.watch();
      
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
          id: user.email.replace(/[.@]/g, '_'),
          name: user.displayName || user.email,
          image: user.photoURL
        }
      };

      await newChannel.sendMessage(messageData);
      
      setShowNewChatDialog(false);
      setForwardDialogOpen(false);
      setForwardMessage(null);
      setForwardComment('');
      setSelectedChannels([]);
      setNewChatUsers([]);
      await loadChannels();

      console.log('Successfully created new chat and forwarded message');
    } catch (error) {
      console.error('Error creating new chat and forwarding:', error);
      enqueueSnackbar('Failed to create chat and forward message', { variant: 'error' });
    }
  };

  // Handle creating a new chat
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedNewChatUser, setSelectedNewChatUser] = useState<Employee | null>(null);

  const handleCreateNewChat = async () => {
    if (!chatClient || !user?.email || !selectedNewChatUser) {
      console.error('Missing required data:', { 
        chatClient: !!chatClient, 
        userEmail: !!user?.email,
        selectedUser: !!selectedNewChatUser 
      });
      return;
    }

    try {
      setIsCreatingChat(true);

      // Create or update both users first
      const currentUserId = user.email.replace(/[.@]/g, '_');
      const otherUserId = selectedNewChatUser.email.replace(/[.@]/g, '_');

      console.log('Creating chat with users:', {
        currentUser: {
          id: currentUserId,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
        },
        otherUser: {
          id: otherUserId,
          email: selectedNewChatUser.email,
          name: selectedNewChatUser.name || selectedNewChatUser.email.split('@')[0],
        }
      });

      // Create the users via backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/create-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUser: {
            id: currentUserId,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            image: user.photoURL,
          },
          otherUser: {
            id: otherUserId,
            email: selectedNewChatUser.email,
            name: selectedNewChatUser.name || selectedNewChatUser.email.split('@')[0],
            image: selectedNewChatUser.photoURL,
          },
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Backend error:', responseData);
        throw new Error(responseData.error || 'Failed to create users and chat');
      }

      const { channelId } = responseData;
      console.log('Channel created with ID:', channelId);
      
      // Get the channel
      const newChannel = chatClient.channel('messaging', channelId);
      await newChannel.watch();
      
      // Set the channel and close dialog
      setShowNewChatDialog(false);
      setSelectedNewChatUser(null);
      
      // Load channels first to ensure the new channel is in the list
      await loadChannels();
      
      // Then set the active channel
      setChannel(newChannel);
      setActiveChat(channelId);
      
      console.log('Successfully created new chat');
      enqueueSnackbar('Chat created successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error creating new chat:', error);
      enqueueSnackbar(error.message || 'Failed to create chat', { variant: 'error' });
    } finally {
      setIsCreatingChat(false);
    }
  };

  // New chat dialog component
  const NewChatDialogComponent = () => (
    <Dialog 
      open={showNewChatDialog} 
      onClose={() => {
        setShowNewChatDialog(false);
        setSelectedNewChatUser(null);
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>New Chat</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={employees}
          getOptionLabel={(option) => option.name || option.email}
          value={selectedNewChatUser}
          onChange={(_, value) => setSelectedNewChatUser(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              margin="dense"
              label="Select a person"
              fullWidth
              variant="outlined"
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <ListItemAvatar>
                <Avatar src={option.photoURL} alt={option.name}>
                  {option.name?.[0] || option.email?.[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={option.name || option.email}
                secondary={option.position || option.email}
              />
            </Box>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setShowNewChatDialog(false);
          setSelectedNewChatUser(null);
        }}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreateNewChat} 
          disabled={!selectedNewChatUser || isCreatingChat}
          variant="contained"
        >
          {isCreatingChat ? (
            <>
              Creating... <CircularProgress size={16} sx={{ ml: 1 }} />
            </>
          ) : (
            'Start Chat'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Consolidated group chat creation function
  const handleCreateGroupChat = async (selectedUsers: Employee[], groupName: string) => {
    try {
      setIsLoading(true);
      const members = [...selectedUsers.map(user => user.email.replace(/[.@]/g, '_')), user.email.replace(/[.@]/g, '_')];
      const channelId = `group-${Date.now()}`;

      // Create users through backend API
      for (const selectedUser of selectedUsers) {
        try {
          const response = await fetch('http://localhost:3001/api/stream/create-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: selectedUser.email.replace(/[.@]/g, '_'),
              name: selectedUser.displayName || selectedUser.email,
              email: selectedUser.email,
              image: selectedUser.photoURL,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create user ${selectedUser.email}`);
          }
        } catch (error) {
          console.error(`Error creating user ${selectedUser.email}:`, error);
          throw new Error(`Failed to create user ${selectedUser.email}`);
        }
      }

      // Create the channel after ensuring all users exist
      const newChannel = chatClient.channel('team', channelId, {
        name: groupName,
        members,
        created_by: {
          id: user.email.replace(/[.@]/g, '_'),
          name: user.displayName || user.email
        },
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`,
        data: {
          members: selectedUsers.reduce((acc, member) => ({
            ...acc,
            [member.email.replace(/[.@]/g, '_')]: {
              name: member.displayName || member.email,
              image: member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || member.email)}`
            }
          }), {
            [user.email.replace(/[.@]/g, '_')]: {
              name: user.displayName || user.email,
              image: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}`
            }
          })
        }
      });

      await newChannel.watch();
      
      // Send initial message
      await newChannel.sendMessage({
        text: `👋 ${user.displayName || user.email} created the group "${groupName}"`,
        user: {
          id: user.email.replace(/[.@]/g, '_'),
          name: user.displayName || user.email
        }
      });

      handleCloseGroupDialog();
      setActiveChannel(newChannel);
    } catch (error) {
      console.error('Error creating group chat:', error);
      enqueueSnackbar(error.message || 'Error creating group chat', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Consolidated group chat dialog component
  const GroupChatDialog = React.memo(({ open, onClose }: any) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEmployees = employees.filter(emp => 
      emp.email !== user?.email && // Don't show current user
      (emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCreateGroup = async () => {
      if (!groupName.trim() || selectedMembers.length === 0) return;
      
      await handleCreateGroupChat(selectedMembers, groupName);
      onClose();
    };

    const handleClose = () => {
      onClose();
      setGroupName('');
      setSelectedMembers([]);
      setSearchQuery('');
    };

    return (
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Group Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Search Employees
          </Typography>
          
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Selected Members ({selectedMembers.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedMembers.map((member) => (
                <Chip
                  key={member.email}
                  label={member.name || member.email}
                  onDelete={() => setSelectedMembers(prev => prev.filter(m => m.email !== member.email))}
                  avatar={
                    <Avatar 
                      src={member.photoURL} 
                      alt={member.name || member.email}
                    >
                      {member.name?.[0] || member.email[0]}
                    </Avatar>
                  }
                />
              ))}
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Available Members
          </Typography>
          <List sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {filteredEmployees.map((employee) => (
              <ListItem
                key={employee.email}
                disablePadding
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={selectedMembers.some(m => m.email === employee.email)}
                    onChange={() => {
                      setSelectedMembers(prev => {
                        const exists = prev.some(m => m.email === employee.email);
                        return exists
                          ? prev.filter(m => m.email !== employee.email)
                          : [...prev, employee];
                      });
                    }}
                  />
                }
              >
                <ListItemButton onClick={() => {
                  setSelectedMembers(prev => {
                    const exists = prev.some(m => m.email === employee.email);
                    return exists
                      ? prev.filter(m => m.email !== employee.email)
                      : [...prev, employee];
                  });
                }}>
                  <ListItemAvatar>
                    <Avatar src={employee.photoURL} alt={employee.name || employee.email}>
                      {employee.name?.[0] || employee.email[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={employee.name || employee.email}
                    secondary={employee.position || employee.email}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.length === 0 || isLoading}
            variant="contained"
          >
            {isLoading ? (
              <>
                Creating... <CircularProgress size={16} sx={{ ml: 1 }} />
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  });

  // Initialize chat client
  useEffect(() => {
    const initChat = async () => {
      if (!user?.email) {
        console.log('No user email available');
        return;
      }

      try {
        console.log('Initializing chat...');
        
        // Initialize chat client
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.email.replace(/[.@]/g, '_'),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.photoURL,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Got token response:', data);

        if (!data.token) {
          throw new Error('No token in response');
        }

        const chatClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY!);
        await chatClient.connectUser(
          {
            id: user.email.replace(/[.@]/g, '_'),
            name: user.name || user.email.split('@')[0],
            image: user.photoURL,
          },
          data.token
        );
        console.log('Chat client connected');
        setChatClient(chatClient);

      } catch (error) {
        console.error('Error initializing chat client:', error);
        if (chatClient) {
          await chatClient.disconnectUser();
          setChatClient(null);
        }
      }
    };

    initChat();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, [user]);

  // Initialize Stream Video client separately
  useEffect(() => {
    if (!chatClient?.tokenManager?.token || !user?.email) {
      console.log('Waiting for chat client and token...');
      return;
    }

    const initVideo = async () => {
      try {
        console.log('Initializing video client...');
        const token = chatClient.tokenManager.token;
        const userId = user.email.replace(/[.@]/g, '_');

        const videoClient = new StreamVideoClient({
          apiKey: import.meta.env.VITE_STREAM_API_KEY!,
          token,
          user: {
            id: userId,
            name: user.name || user.email.split('@')[0],
            image: user.photoURL || undefined,
          },
        });

        // Don't call connectUser() since the token is already connected
        setVideoClient(videoClient);
        console.log('Video client initialized');

      } catch (error) {
        console.error('Error initializing video client:', error);
        setVideoClient(null);
      }
    };

    initVideo();

    return () => {
      if (videoClient) {
        videoClient.disconnectUser();
        setVideoClient(null);
      }
    };
  }, [chatClient?.tokenManager?.token, user]);

  const handleFileSelect = async (files: FileList) => {
    if (!channel) return;
    
    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileUrl = await uploadChatFile(file);
        
        if (fileUrl) {
          await channel.sendMessage({
            text: `Shared a file: ${file.name}`,
            attachments: [{
              type: 'file',
              asset_url: fileUrl,
              title: file.name,
              mime_type: file.type,
              file_size: file.size,
            }],
          });
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      enqueueSnackbar('Failed to upload file', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmojiClick = () => {
    setShowEmojiPicker(true);
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

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <InsertDriveFileIcon sx={{ fontSize: 40 }} />;
    
    if (mimeType.includes('pdf')) {
      return <PictureAsPdfIcon sx={{ fontSize: 40, color: '#e94040' }} />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon sx={{ fontSize: 40, color: '#4CAF50' }} />;
    }
    if (mimeType.includes('video')) {
      return <VideoFileIcon sx={{ fontSize: 40, color: '#2196F3' }} />;
    }
    if (mimeType.includes('audio')) {
      return <AudioFileIcon sx={{ fontSize: 40, color: '#9C27B0' }} />;
    }
    if (mimeType.includes('text')) {
      return <DescriptionIcon sx={{ fontSize: 40, color: '#607D8B' }} />;
    }
    return <InsertDriveFileIcon sx={{ fontSize: 40, color: '#757575' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartCall = async (isVideo: boolean = false) => {
    if (!videoClient || !channel || !user?.email) return;

    try {
      // Create a new call
      const callId = `${channel.id}-${Date.now()}`;
      console.log('Starting call...', { callId, isVideo });
      
      // Get channel members and format them as objects
      const members = Object.entries(channel.state?.members).map(([id, member]) => ({
        user_id: id,
        role: 'call_member'
      }));
      console.log('Call members:', members);

      const newCall = videoClient.call('default', callId);
      const callData = await newCall.getOrCreate({
        data: { members }
      });
      console.log('Call created with data:', callData);
      
      // Set call state
      setCall(newCall);
      setIsVideoCall(isVideo);
      setCallDialog(true);
      setIsCaller(true);

      // Send call start message
      await channel.sendMessage({
        text: `${isVideo ? 'Video' : 'Voice'} call`,
        type: 'regular',
        data: {
          isCall: true,
          callStatus: 'started',
          callId,
          callType: isVideo ? 'video' : 'audio',
          callerId: user.email.replace(/[.@]/g, '_'),
          members
        }
      });

      // Join the call with proper settings
      await newCall.join({
        camera: isVideo,
        microphone: true,
        speaker: true
      });
      
      setIsCallActive(true);
      console.log('Call started and joined');
    } catch (error) {
      console.error('Error starting call:', error);
      handleEndCall();
    }
  };

  const handleAcceptCall = async () => {
    console.log('Accepting call...', { call });
    if (!call) {
      console.error('No call to accept');
      return;
    }

    try {
      // Accept and join the call with proper settings
      await call.accept();
      await call.join({
        camera: isVideoCall,
        microphone: true,
        speaker: true
      });
      
      console.log('Call accepted and joined');
      
      // Update UI state
      setIsCallActive(true);
      setIsCaller(false);
    } catch (error) {
      console.error('Error accepting call:', error);
      handleEndCall();
    }
  };

  const handleEndCall = async () => {
    console.log('Ending call...', { call, isCallActive });
    if (!call) {
      console.log('No active call to end');
      setCallDialog(false);
      setIsCallActive(false);
      setIsCaller(false);
      return;
    }

    try {
      // Only try to leave if the call is active and we're still connected
      if (isCallActive && call.state.status === 'connected') {
        console.log('Leaving active call...');
        await call.leave();
        console.log('Left call successfully');
      } else {
        console.log('Call already ended or not connected');
      }

      // Send end message only if we have a channel
      if (channel) {
        try {
          await channel.sendMessage({
            text: 'Call ended',
            type: 'regular',
            data: {
              isCall: true,
              callStatus: 'ended',
              callId: call.id,
            }
          });
          console.log('Sent call end message');
        } catch (error) {
          console.error('Error sending call end message:', error);
        }
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      // Always clean up state
      setCallDialog(false);
      setIsCallActive(false);
      setIsCaller(false);
      setCall(null);
      setLocalAudioLevel(0);
      setRemoteAudioLevel(0);
    }
  };

  // Handle incoming call messages
  useEffect(() => {
    if (!channel || !videoClient || !user?.email) return;

    const handleNewMessage = async (event: any) => {
      const message = event.message;
      if (!message.data?.isCall) return;

      console.log('Received call message:', message);
      const { callStatus, callId, callType, callerId, members } = message.data;

      // Ignore our own messages
      if (callerId === user.email.replace(/[.@]/g, '_')) return;

      try {
        if (callStatus === 'started' && !call) {
          console.log('Incoming call...', { callId, callType, members });
          const incomingCall = videoClient.call('default', callId);
          const callData = await incomingCall.getOrCreate({
            data: { members }
          });
          console.log('Retrieved call data:', callData);
          
          setCall(incomingCall);
          setIsVideoCall(callType === 'video');
          setCallDialog(true);
          setIsCaller(false);
        } else if (callStatus === 'ended' && call?.id === callId) {
          console.log('Call ended by other participant');
          // Don't try to leave again, just clean up
          setCallDialog(false);
          setIsCallActive(false);
          setIsCaller(false);
          setCall(null);
          setLocalAudioLevel(0);
          setRemoteAudioLevel(0);
        }
      } catch (error) {
        console.error('Error handling call message:', error);
        // Clean up on error
        setCallDialog(false);
        setIsCallActive(false);
        setIsCaller(false);
        setCall(null);
        setLocalAudioLevel(0);
        setRemoteAudioLevel(0);
      }
    };

    channel.on('message.new', handleNewMessage);
    return () => {
      channel.off('message.new', handleNewMessage);
    };
  }, [channel, videoClient, user]);

  const getChannelAvatar = () => {
    if (!channel) return null;
    
    if (channel.data?.type === 'team') {
      return channel.data?.image || <GroupIcon />;
    }

    // For DMs, get the other user's avatar
    const otherMember = Object.entries(channel.data?.members || {})
      .filter(([id]) => id !== chatClient?.userID)
      .map(([_, member]: [string, any]) => member.user)[0];

    if (otherMember?.image) {
      return otherMember.image;
    }

    // Use first letter of name or email
    if (otherMember?.name) {
      return otherMember.name[0].toUpperCase();
    }
    if (otherMember?.id) {
      return otherMember.id.replace(/_/g, '.')[0].toUpperCase();
    }

    return '?';
  };

  const getChannelDisplayName = () => {
    if (!channel) return '';
    
    // For group chats, use channel name
    if (channel.data?.type === 'team') {
      const name = channel.data?.name;
      return name || 'Unnamed Group';
    }

    // For DMs, show the other person's name and info
    if (channel.data?.type === 'messaging') {
      // First try to get from channel members
      const otherMember = Object.entries(channel.data?.members || {})
        .filter(([id]) => id !== chatClient?.userID)
        .map(([_, member]: [string, any]) => member.user)[0];

      if (otherMember?.name || otherMember?.id) {
        const name = otherMember.name || otherMember.id.replace(/_/g, '.'); // Convert back from Stream Chat ID format
        const position = otherMember.position;
        return position ? `${name} (${position})` : name;
      }

      // Fallback to channel name if available
      if (channel.data?.name) {
        return channel.data.name;
      }
    }

    return 'Loading...';
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
              mt: 1,
              maxHeight: '200px',
              overflowY: 'auto',
              bgcolor: 'grey.50',
              p: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PushPinIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Forwarded message from {headerPart}
              </Typography>
            </Box>
            <Typography>{messagePart}</Typography>
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Typography 
          dangerouslySetInnerHTML={{ __html: message.text }} 
          variant="body1"
          component="div"
          sx={{
            '& p': { 
              margin: 0,
              padding: 0,
            },
            '& ul, & ol': { 
              margin: '0.5em 0', 
              paddingLeft: '1.5em' 
            },
            '& code': { 
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            },
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        />
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
                  getFileIcon(attachment.mime_type)
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{attachment.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(attachment.file_size || 0)}
                  </Typography>
                </Box>
                {attachment.mime_type?.startsWith('image/') && (
                  <IconButton size="small" onClick={() => handleFilePreview(attachment)}>
                    <VisibilityIcon />
                  </IconButton>
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

  const getRecentChannels = () => {
    // Filter out the current channel from the forward options
    const otherChannels = channels.filter(ch => ch.id !== channel?.id);
    
    // Sort by last message time, handling undefined cases
    return sortChannels(otherChannels);
  };

  // Voice activity state
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState<number>(0);

  // Monitor audio levels
  useEffect(() => {
    if (!call || !isCallActive) return;

    const updateAudioLevels = () => {
      try {
        // Get local participant's audio level
        const localParticipant = call.state.localParticipant;
        if (localParticipant?.publishedTracks?.audio) {
          const audioLevel = call.getAudioLevelForParticipant(localParticipant.sessionId) || 0;
          setLocalAudioLevel(Math.min(audioLevel * 200, 100));
        }

        // Get remote participant's audio level
        const remoteParticipant = Object.values(call.state.participants).find(
          p => p.userId !== user!.email.replace(/[.@]/g, '_')
        );
        if (remoteParticipant?.publishedTracks?.audio) {
          const audioLevel = call.getAudioLevelForParticipant(remoteParticipant.sessionId) || 0;
          setRemoteAudioLevel(Math.min(audioLevel * 200, 100));
        }
      } catch (error) {
        console.error('Error updating audio levels:', error);
      }
    };

    // Update frequently for smooth visualization
    const interval = setInterval(updateAudioLevels, 100);
    return () => clearInterval(interval);
  }, [call, isCallActive, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (call) {
        call.stopAudioLevelMonitoring();
      }
    };
  }, [call]);

  // Audio level indicator component
  const AudioLevelIndicator = ({ level }: { level: number }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        height: 24,
        gap: 0.5
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            height: `${Math.min(8 + (i * 8), (level / 100) * (24 + i * 8))}px`,
            bgcolor: level > (i + 1) * 25 ? 'primary.main' : 'action.disabled',
            borderRadius: 4,
            transition: 'all 0.1s ease-out'
          }}
        />
      ))}
    </Box>
  );

  // Call Dialog UI
  const CallDialogComponent = () => {
    if (!callDialog) return null;

    return (
      <Dialog 
        open={callDialog} 
        onClose={() => !isCallActive && handleEndCall()}
        maxWidth="xs"
        PaperProps={{
          sx: {
            position: 'fixed',
            top: 16,
            right: 16,
            left: 'auto',
            bottom: 'auto',
            m: 0,
            width: isVideoCall && isCallActive ? '400px' : '320px',
            height: isVideoCall && isCallActive ? '300px' : 'auto',
            bgcolor: 'background.paper',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease-in-out',
            transform: 'translateY(0)',
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: {
                transform: 'translateY(-100%)',
                opacity: 0
              },
              to: {
                transform: 'translateY(0)',
                opacity: 1
              }
            },
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: !isCallActive 
                ? 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)'
                : 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12
            }
          },
        }}
      >
        {/* Background gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: !isCallActive 
              ? 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)'
              : 'none',
            zIndex: 0
          }}
        />

        {/* Close button */}
        {!isCallActive && !isCaller && (
          <IconButton
            size="small"
            onClick={handleEndCall}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              color: 'text.secondary'
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}

        {/* Rest of the dialog content remains the same */}
        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <DialogContent sx={{ p: 2 }}>
            {isCallActive && isVideoCall ? (
              // Video container
              <Box
                sx={{
                  width: '100%',
                  height: '200px',
                  bgcolor: 'black',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {call && (
                  <>
                    <video
                      ref={(el) => el && call.setTargetElement(el)}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        width: 80,
                        height: 60,
                        borderRadius: 1,
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        border: '2px solid rgba(255,255,255,0.8)'
                      }}
                    >
                      <video
                        ref={(el) => el && call.setLocalVideoElement(el)}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>
            ) : (
              // Audio call UI
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Avatar
                  src={channel?.data?.image || ''}
                  sx={{
                    width: 56,
                    height: 56,
                    mb: 1,
                    mx: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  {channel?.data?.name?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
                  {channel?.data?.name || 'Unknown'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  {!isCallActive ? (
                    isCaller ? 'Calling...' : 'Incoming call...'
                  ) : (
                    'Call in progress'
                  )}
                </Typography>

                {/* Voice indicators */}
                {isCallActive && (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: 'center',
                    mb: 1
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        You
                      </Typography>
                      <AudioLevelIndicator level={localAudioLevel} />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Them
                      </Typography>
                      <AudioLevelIndicator level={remoteAudioLevel} />
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>

          {/* Call controls */}
          <DialogActions
            sx={{
              justifyContent: 'center',
              gap: 1.5,
              p: 1.5,
              bgcolor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            {isCallActive ? (
              <IconButton
                onClick={handleEndCall}
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                  width: 40,
                  height: 40,
                  boxShadow: '0 2px 8px rgba(211,47,47,0.3)'
                }}
              >
                <CallEndIcon />
              </IconButton>
            ) : isCaller ? (
              <IconButton
                onClick={handleEndCall}
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                  width: 40,
                  height: 40,
                  boxShadow: '0 2px 8px rgba(211,47,47,0.3)'
                }}
              >
                <CallEndIcon />
              </IconButton>
            ) : (
              // Accept/Reject for receiver
              <>
                <IconButton
                  onClick={handleAcceptCall}
                  sx={{
                    bgcolor: 'success.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'success.dark',
                    },
                    width: 40,
                    height: 40,
                    boxShadow: '0 2px 8px rgba(46,125,50,0.3)'
                  }}
                >
                  <CallIcon />
                </IconButton>
                <IconButton
                  onClick={handleEndCall}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark',
                    },
                    width: 40,
                    height: 40,
                    boxShadow: '0 2px 8px rgba(211,47,47,0.3)'
                  }}
                >
                  <CallEndIcon />
                </IconButton>
              </>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    );
  };

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
            // Check if message already exists
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

  useEffect(() => {
    if (!channel) return;

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

    return () => {
      channel.off('reaction.new', handleReactionNew);
      channel.off('reaction.deleted', handleReactionDeleted);
    };
  }, [channel]);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: '20px',
        right: '80px',
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
          position: 'sticky',
          top: 0,
          zIndex: 1
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

                // For DMs, show the other person's name and info
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
                        <AvatarGroup
                          max={3}
                          sx={{
                            '& .MuiAvatar-root': {
                              width: 24,
                              height: 24,
                              fontSize: '0.75rem',
                              border: 'none'
                            }
                          }}
                        >
                          {Object.values(ch.data?.data?.members || {}).map((member: any, index: number) => (
                            <Avatar
                              key={index}
                              src={member.image}
                              alt={member.name}
                              sx={{ width: 24, height: 24 }}
                            >
                              {member.name?.[0]}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      ) : (
                        <Badge
                          variant="dot"
                          sx={{
                            '& .MuiBadge-badge': {
                              backgroundColor: getStatusColor(otherUser?.status),
                            },
                          }}
                        >
                          <Avatar src={channelImage}>
                            {(otherUser?.name || otherUser?.id)[0]?.toUpperCase()}
                          </Avatar>
                        </Badge>

                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isGroupChat ? (
                            <GroupIcon fontSize="small" color="action" />
                          ) : (
                            <PersonIcon fontSize="small" color="action" />
                          )}
                          <Typography>
                            {isGroupChat ? channelName : otherUser?.name || 'Unknown User'}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box 
                          sx={{ 
                            '& p': { margin: 0, padding: 0 },
                            '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.5em' },
                            '& code': { 
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            },
                            color: 'text.secondary'
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="div"
                            dangerouslySetInnerHTML={{ __html: lastMessage?.text || '' }}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          />
                        </Box>
                      }
                    />
                    {unreadCount > 0 && (
                      <Chip
                        size="small"
                        label={unreadCount}
                        color="primary"
                        sx={{ minWidth: 'auto' }}
                      />
                    )}
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
                          src={channel?.data?.image || ''}
                          sx={{ width: 40, height: 40 }}
                        >
                          {channel?.data?.type === 'team' ? <GroupIcon /> : getChannelAvatar()}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 500 }}>
                            {getChannelDisplayName()}
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
                        <IconButton onClick={() => handleStartCall(false)}>
                          <CallIcon />
                        </IconButton>
                        <IconButton onClick={() => handleStartCall(true)}>
                          <VideocamIcon />
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
                          <Typography variant="caption" color="text.secondary">
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
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="subtitle2">
                                    {msg.user?.name || msg.user?.id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(msg.created_at).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Typography>{msg.text}</Typography>
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
                          flexDirection: msg.user?.id === chatClient?.userID ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: 1,
                          position: 'relative',
                          maxWidth: '100%',
                          mb: 2,
                          px: 2,
                          '&:hover .message-actions': {
                            opacity: 1,
                          },
                        }}
                      >
                        <Avatar
                          src={msg.user?.image}
                          sx={{
                            width: 32,
                            height: 32,
                            mt: 1,
                          }}
                        >
                          {msg.user?.name?.[0] || msg.user?.id[0]}
                        </Avatar>
                        <Box
                          sx={{
                            maxWidth: '70%',
                            minWidth: '100px',
                            position: 'relative',
                          }}
                        >
                          <Box
                            sx={{
                              bgcolor: msg.user?.id === chatClient?.userID ? 'primary.main' : 'grey.100',
                              color: msg.user?.id === chatClient?.userID ? 'white' : 'text.primary',
                              borderRadius: 2,
                              p: 1.5,
                              width: 'fit-content',
                              maxWidth: '100%',
                              wordBreak: 'break-word',
                              '& p': {
                                margin: 0,
                                padding: 0,
                              },
                            }}
                          >
                            {(!msg.parent_id || msg.show_in_channel) && (
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                mb: 0.5,
                                opacity: 0.8,
                                fontSize: '0.85rem'
                              }}>
                                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                  {msg.user?.name || msg.user?.id}
                                </Typography>
                                <Typography variant="caption" color="inherit">
                                  • {formatMessageTime(msg.created_at)}
                                </Typography>
                              </Box>
                            )}
                            {renderMessage(msg)}
                            {/* Thread Reply Count */}
                            {(msg.reply_count > 0 || messageUpdates[msg.id]) && (
                              <Box
                                onClick={() => handleThreadClick(msg)}
                                sx={{
                                  mt: 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  cursor: 'pointer',
                                  bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                                  color: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.25,
                                  fontSize: '0.85rem',
                                  '&:hover': {
                                    bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)'
                                  },
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
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                                {renderReactions(msg, msg.latest_reactions)}
                              </Box>
                            )}
                            {/* Edited indicator */}
                            {isMessageEdited(msg) && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                (edited)
                              </Typography>
                            )}
                          </Box>

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
                              sx={{
                                color: msg.user?.id === chatClient?.userID ? 'common.white' : 'text.secondary',
                                opacity: 0.7,
                                '&:hover': {
                                  opacity: 1,
                                  bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <AddReactionIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleThreadClick(msg)}
                              sx={{
                                color: msg.user?.id === chatClient?.userID ? 'common.white' : 'text.secondary',
                                opacity: 0.7,
                                '&:hover': {
                                  opacity: 1,
                                  bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <ChatBubbleOutlineIcon fontSize="small" />
                              {msg.reply_count > 0 && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    ml: 0.5,
                                    color: msg.user?.id === chatClient?.userID ? 'common.white' : 'text.secondary'
                                  }}
                                >
                                  {msg.reply_count}
                                </Typography>
                              )}
                            </IconButton>
                            {msg.user?.id === user?.email?.replace(/[.@]/g, '_') && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMessageMenuAnchor(e.currentTarget);
                                  setSelectedMessage(msg);
                                }}
                                sx={{
                                  color: msg.user?.id === chatClient?.userID ? 'common.white' : 'text.secondary',
                                  opacity: 0.7,
                                  '&:hover': {
                                    opacity: 1,
                                    bgcolor: msg.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                  }
                                }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>

                          {/* Message Menu */}
                          <Menu
                            anchorEl={messageMenuAnchor}
                            open={Boolean(messageMenuAnchor)}
                            onClose={() => {
                              setMessageMenuAnchor(null);
                              setSelectedMessage(null);
                            }}
                          >
                            <MenuItem
                              onClick={() => {
                                if (selectedMessage) {
                                  handleEditMessage(selectedMessage);
                                }
                                setMessageMenuAnchor(null);
                                setSelectedMessage(null);
                              }}
                            >
                              <ListItemIcon>
                                <EditIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Edit Message</ListItemText>
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                if (selectedMessage) {
                                  handleDeleteMessage(selectedMessage);
                                }
                                setMessageMenuAnchor(null);
                                setSelectedMessage(null);
                              }}
                            >
                              <ListItemIcon>
                                <DeleteIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Delete Message</ListItemText>
                            </MenuItem>
                          </Menu>

                          {/* Reactions */}
                          {msg.latest_reactions && msg.latest_reactions.length > 0 && (
                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {renderReactions(msg, msg.latest_reactions)}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ 
                    p: 2, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 1,
                    width: '100%'
                  }}>
                    {editingMessage && (
                      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Editing message
                        </Typography>
                        <Button size="small" onClick={() => {
                          setEditingMessage(null);
                          setEditText('');
                        }}>
                          Cancel
                        </Button>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                      <Box sx={{ 
                        flex: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        minHeight: 56,
                        bgcolor: 'background.paper',
                        '& .ProseMirror': {
                          minHeight: 56,
                          p: 1,
                          '&:focus': {
                            outline: 'none',
                            borderColor: 'primary.main',
                          },
                          '& p': {
                            margin: 0,
                            minHeight: '24px'
                          }
                        }
                      }}>
                        <RichTextEditor
                          ref={editorRef}
                          initialContent={editingMessage ? editText : messageText}
                          onUpdate={(html) => {
                            if (editingMessage) {
                              setEditText(html);
                            } else {
                              setMessageText(html);
                            }
                          }}
                          placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <IconButton 
                          color="primary"
                          onClick={editingMessage ? handleSaveEdit : handleSendMessage}
                          disabled={!(editingMessage ? editText : messageText).trim()}
                        >
                          <SendIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.multiple = true;
                            fileInput.accept = '*/*';
                            fileInput.onchange = (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              if (files) {
                                setSelectedFiles(Array.from(files));
                              }
                            };
                            fileInput.click();
                          }}
                        >
                          <AttachFileIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    {selectedFiles.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Selected files:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {selectedFiles.map((file, index) => (
                            <Chip
                              key={index}
                              label={file.name}
                              onDelete={() => {
                                setSelectedFiles(files => files.filter((_, i) => i !== index));
                              }}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
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
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                              <Typography variant="subtitle2">
                                {reply.user?.name || reply.user?.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(reply.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Box 
                              sx={{ 
                                '& p': { margin: 0, padding: 0 },
                                '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.5em' },
                                '& code': { 
                                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace'
                                },
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}
                            >
                              <Typography
                                variant="body1"
                                component="div"
                                dangerouslySetInnerHTML={{ __html: reply.text }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Thread Reply Input */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <RichTextEditor
                        value={threadReply}
                        onChange={setThreadReply}
                        onSubmit={handleSendThreadReply}
                        placeholder="Reply to thread..."
                        onFileSelect={handleFileSelect}
                        onEmojiClick={handleEmojiClick}
                        sx={{ width: '100%' }}
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

      <NewChatDialogComponent />

      <GroupChatDialog
        open={groupChatOpen}
        onClose={() => setGroupChatOpen(false)}
        onCreateGroup={handleCreateGroupChat}
      />

      <FilePreviewDialog
        open={!!previewFile}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

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
            variant="outlined"
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
        onClose={() => {
          setMessageMenuAnchor(null);
          setSelectedMessage(null);
        }}
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
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                autoFocus
                margin="dense"
                label="Select Users"
                fullWidth
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <ListItemAvatar>
                  <Avatar src={users[option]?.image}>
                    {users[option]?.name?.[0] || option[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={users[option]?.name || option}
                  secondary={option}
                />
              </Box>
            )}
          />
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

      {CallDialogComponent()}
    </Box>
  );
};

export default StreamChatPopover;
