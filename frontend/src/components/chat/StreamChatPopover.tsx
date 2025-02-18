import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import { StreamVideoClient } from '@stream-io/video-client';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  ListItemAvatar,
  TextField,
  Popover,
  
  Paper,
  Chip,
  Badge,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  AvatarGroup,
  Collapse,
  Grid,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Drawer,
  LinearProgress,
  Switch,
  Autocomplete,
  InputAdornment,
  ListItemButton,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  PushPin as PushPinIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoFileIcon,
  AudioFile as AudioFileIcon,
  InsertEmoticon as InsertEmoticonIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
} from '@mui/icons-material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Call as CallIcon,
  Videocam as VideocamIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  Forward as ForwardIcon,
  Settings as SettingsIcon,
  InsertEmoticon as EmojiIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Archive as ArchiveIcon,
  Movie as MovieIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  RadioButtonUnchecked as CircleOutlined,
  AddReaction as AddReactionIcon,
  PersonRemove as PersonRemoveIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import Message from './Message';
import FileMessage from './FileMessage';
import NewChatDialog from './NewChatDialog';
import RichTextEditor from './RichTextEditor';
import MessageContent from './MessageContent';
import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import { uploadChatFile } from '@/services/supabaseStorage';
import FilePreviewDialog from './FilePreviewDialog';
import { keyframes } from '@mui/system';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

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

const getFileIcon = (fileType: string) => {
  if (fileType?.includes('pdf')) {
    return <PdfIcon color="error" />;
  } else if (fileType?.startsWith('image/')) {
    return <ImageIcon color="primary" />;
  }
  return <InsertDriveFileIcon color="action" />;
};

// Add this helper function near the top of the file
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

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

const isMessageEdited = (msg: any) => {
  return msg.updated_at && msg.created_at && 
    new Date(msg.updated_at).getTime() > new Date(msg.created_at).getTime() + 1000; // 1 second buffer
};

const stripHtmlTags = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const REACTION_REVERSE_MAP = Object.entries(REACTION_MAP).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as { [key: string]: string });

const sanitizeHtml = (html: string) => {
  // First remove any script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Then handle common HTML entities
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return html.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
};

const StreamChatPopover: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing chat...');

  // Message state
  const [messages, setMessages] = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  // Forward message state
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [availableChannels, setAvailableChannels] = useState<any[]>([]);
  
  // Thread state
  const [showThread, setShowThread] = useState(false);
  const [threadMessage, setThreadMessage] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [threadReply, setThreadReply] = useState('');
  const [forwardComment, setForwardComment] = useState('');

  // All refs
  const channelsRef = React.useRef<Channel[]>([]);
  const currentChannelRef = React.useRef<Channel | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom effect
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
  const [editedText, setEditedText] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatUsers, setNewChatUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<{ [key: string]: any }>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
 
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callDialog, setCallDialog] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Add state for task popover
  const [taskAnchorEl, setTaskAnchorEl] = useState<null | HTMLElement>(null);

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
    currentChannelRef.current = channel;
  }, [channel]);

  // Function to safely update channels state
  const updateChannelsState = React.useCallback((updater: (prev: Channel[]) => Channel[]) => {
    setChannels(prev => {
      const updated = updater(prev);
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
  const handleEdit = (msg: any) => {
    setEditingMessage(msg);
    setEditedText(msg.text);
  };

  const handleEditSave = async () => {
    if (!channel || !editingMessage || !editedText.trim() || !chatClient) return;

    try {
      // Optimistically update UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === editingMessage.id
            ? { ...msg, text: editedText }
            : msg
        )
      );

      // Update message on server
      try {
        await channel.partialUpdateMessage(editingMessage.id, {
          set: { text: editedText }
        });
      } catch (channelError) {
        // Fallback to client update if channel update fails
        const updatedMessage = await chatClient?.updateMessage({
          id: editingMessage.id,
          text: editedText,
          user: editingMessage.user,
        });
        
        if (!updatedMessage) {
          throw new Error('Failed to update message');
        }
      }

      setEditingMessage(null);
      setEditedText('');
    } catch (error) {
      console.error('Error updating message:', error);
      // Revert optimistic update on error
      setMessages(prevMessages => [...prevMessages]);
    }
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setEditedText('');
  };

  const handleDelete = async (message: any) => {
    if (!channel || !message || !chatClient) return;

    try {
      // Optimistically update UI
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== message.id)
      );

      // Delete message on server using chatClient
      await chatClient.deleteMessage(message.id);

      // Close any open menus
      setMessageMenuAnchor(null);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      // Revert optimistic update on error
      const originalMessages = channel.state.messages;
      setMessages([...originalMessages]);
      
      // Show error notification
      enqueueSnackbar('Failed to delete message', { 
        variant: 'error',
        autoHideDuration: 3000
      });
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
      const members = [...newChatUsers.map(u => u.email.replace(/[.@]/g, '_')), user.email.replace(/[.@]/g, '_')];
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
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: selectedUser.email.replace(/[.@]/g, '_'),
              email: selectedUser.email,
              name: selectedUser.displayName || selectedUser.email,
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
        text: `${user.displayName || user.email} created the group "${groupName}"`,
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

        // Initialize chat client
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
          chatClient.disconnectUser();
          setChatClient(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
        setChatClient(null);
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

  const handleGroupSettingsClick = () => {
    setShowGroupSettings(true);
  };

  const handleGroupSettingsClose = () => {
    setShowGroupSettings(false);
    setSelectedMembers([]);
    setActiveTab(0);
  };

  // Group settings state
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupNameEdit, setGroupNameEdit] = useState('');
  const [groupFiles, setGroupFiles] = useState<Array<any>>([]);
  const [groupMembers, setGroupMembers] = useState<Array<any>>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Load group data when settings open
  useEffect(() => {
    if (showGroupSettings && channel) {
      // Safely get members from channel state
      const members = channel.state?.members || {};
      const memberArray = Object.values(members).filter(Boolean);
      setGroupMembers(memberArray);
      
      const loadFiles = async () => {
        try {
          const result = await channel.query({ messages: { limit: 100 } });
          const files = result.messages
            ?.filter(msg => msg?.attachments && msg.attachments.length > 0)
            ?.flatMap(msg => msg.attachments)
            .filter(Boolean) || [];
          setGroupFiles(files);
        } catch (error) {
          console.error('Error loading group files:', error);
          setGroupFiles([]);
        }
      };
      loadFiles();
      setGroupNameEdit(channel.data?.name || '');
    }
  }, [showGroupSettings, channel]);

  // Memoize filtered employees to prevent unnecessary recalculations
  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    if (!groupMembers || !Array.isArray(groupMembers)) return employees;

    return employees.filter(emp => 
      emp?.email && !groupMembers.some(member => 
        member?.user_id === emp.email.replace(/[.@]/g, '_')
      )
    );
  }, [employees, groupMembers]);

  // Group settings handlers
  const [tempGroupName, setTempGroupName] = useState('');

  useEffect(() => {
    if (showGroupSettings && channel) {
      setTempGroupName(channel.data?.name || '');
    }
  }, [showGroupSettings, channel]);

  const handleUpdateGroupName = async () => {
    if (!channel || !tempGroupName.trim()) return;
    if (tempGroupName === channel.data?.name) return;

    try {
      await channel.update({
        name: tempGroupName.trim(),
        set: {
          name: tempGroupName.trim()
        }
      });
      
      // Update local channel data
      setChannels(prevChannels => 
        prevChannels.map(ch => 
          ch.cid === channel.cid 
            ? { ...ch, data: { ...ch.data, name: tempGroupName.trim() } }
            : ch
        )
      );
      
      enqueueSnackbar('Group name updated successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error updating group name:', error);
      enqueueSnackbar('Failed to update group name', { variant: 'error' });
      // Reset to original name on error
      setTempGroupName(channel.data?.name || '');
    }
  };

  const handleAddMembers = async () => {
    if (!channel || selectedMembers.length === 0) return;

    try {
      // Format email addresses to valid Stream Chat user IDs
      const formattedMembers = selectedMembers.map(email => email.replace(/[.@]/g, '_'));
      
      // Add members
      await channel.addMembers(formattedMembers);
      
      // Clear selection state
      setSelectedMembers([]);
      
      // Refresh channel
      await channel.watch();
      
      // Update group members from refreshed channel state
      if (channel.state?.members) {
        setGroupMembers(Object.values(channel.state.members));
      }
      
      // Show success message
      enqueueSnackbar('Members added successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error adding members:', error);
      enqueueSnackbar('Failed to add members', { variant: 'error' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channel || !memberId) return;
    
    try {
      // Remove member
      await channel.removeMembers([memberId]);
      
      // Refresh channel
      await channel.watch();
      
      // Update group members from refreshed channel state
      if (channel.state?.members) {
        setGroupMembers(Object.values(channel.state.members));
      }
      
      enqueueSnackbar('Member removed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error removing member:', error);
      enqueueSnackbar('Failed to remove member', { variant: 'error' });
    }
  };

  const handleManageMembers = () => {
    setShowMemberManagement(true);
    setShowGroupSettings(false);
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
        user_id: chatClient?.userID,
        user: {
          id: chatClient?.userID,
          name: user?.displayName || '',
          image: user?.photoURL
        },
        created_at: new Date().toISOString()
      };

      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === selectedMessage.id) {
            const updatedMsg = { ...msg };
            updatedMsg.latest_reactions = [...(updatedMsg.latest_reactions || [])];
            const existingIndex = updatedMsg.latest_reactions.findIndex(r => 
              r.type === reactionType && r.user_id === chatClient?.userID
            );
            
            if (existingIndex === -1) {
              updatedMsg.latest_reactions.push(newReaction);
            }
            
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
              r => !(r.type === reactionType && r.user_id === chatClient?.userID)
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
            updatedMsg.latest_reactions = [...(updatedMsg.latest_reactions || [])];
            const existingIndex = updatedMsg.latest_reactions.findIndex(r => 
              r.type === reaction.type && r.user_id === user.id
            );
            
            if (existingIndex === -1) {
              updatedMsg.latest_reactions.push({
                ...reaction,
                user: {
                  id: user.id,
                  name: user.name,
                  image: user.image
                }
              });
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
      const isOwnReaction = reaction.user_id === chatClient?.userID;
      
      return (
        <Chip
          key={`${reaction.type}-${reaction.user_id}`}
          label={emoji}
          size="small"
          onClick={() => isOwnReaction ? handleRemoveReaction(message, reaction.type) : null}
          sx={{ 
            height: 24,
            bgcolor: message.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
            color: message.user?.id === chatClient?.userID ? '#fff' : 'inherit',
            cursor: isOwnReaction ? 'pointer' : 'default',
            '&:hover': isOwnReaction ? {
              bgcolor: message.user?.id === chatClient?.userID ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.12)'
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
    console.log('=== THREAD CLICK START ===');
    console.log('Original Message:', {
      id: message.id,
      text: message.text,
      reply_count: message.reply_count,
      thread_messages: message.thread_messages,
      created_at: message.created_at
    });
    
    // Set initial state to show thread panel
    setThreadMessage(message);
    setShowThread(true);
    setThreadReplies([]); // Reset replies when opening new thread
    
    try {
      if (!channel) {
        console.warn('No channel available for thread');
        return;
      }

      // Get latest message state from channel state
      const threadMessage = channel.state.messages.find(
        msg => msg.id === message.id
      );

      if (!threadMessage) {
        console.error('Could not find message in channel state');
        return;
      }

      console.log('Retrieved message from channel:', {
        id: threadMessage.id,
        text: threadMessage.text,
        reply_count: threadMessage.reply_count,
        thread_messages: threadMessage.thread_messages
      });

      // Update thread message with latest state
      setThreadMessage(threadMessage);

      console.log('Loading thread replies for message:', threadMessage.id);
      // Get replies for the thread
      const response = await channel.getReplies(threadMessage.id, {
        limit: 25,
      });

      console.log('Thread replies loaded:', {
        messageCount: response?.messages?.length,
        messages: response?.messages?.map(msg => ({
          id: msg.id,
          text: msg.text,
          parent_id: msg.parent_id,
          created_at: msg.created_at,
          user: msg.user
        }))
      });

      if (response?.messages) {
        console.log('Updating thread message and replies state');
        // Update thread message with all replies
        const updatedMessage = { ...threadMessage };
        updatedMessage.thread_messages = response.messages;
        updatedMessage.reply_count = response.messages.length;
        console.log('Updated thread message:', {
          id: updatedMessage.id,
          reply_count: updatedMessage.reply_count,
          thread_messages_count: updatedMessage.thread_messages.length
        });
        setThreadMessage(updatedMessage);
        
        // Set thread replies
        setThreadReplies(response.messages);
        console.log('Thread replies state updated with', response.messages.length, 'replies');

        // Update the message in the main messages list to keep it in sync
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.id === threadMessage.id) {
              return updatedMessage;
            }
            return msg;
          })
        );
      } else {
        console.log('No replies found for thread');
      }

      // Watch for new replies
      const threadId = threadMessage.id;
      console.log('Setting up message listener for thread:', threadId);
      
      const handleNewMessage = (event: any) => {
        console.log('New message event in thread:', {
          type: event.type,
          message: {
            id: event.message?.id,
            text: event.message?.text,
            parent_id: event.message?.parent_id
          }
        });

        const { message: newMessage } = event;
        if (newMessage?.parent_id === threadId) {
          console.log('Message belongs to current thread, updating state');
          setThreadReplies(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (!exists) {
              // Also update the thread message
              setThreadMessage(prevMsg => {
                if (!prevMsg) return prevMsg;
                const updatedMsg = {
                  ...prevMsg,
                  reply_count: (prevMsg.reply_count || 0) + 1,
                  thread_messages: [...(prevMsg.thread_messages || []), newMessage]
                };
                console.log('Thread message updated:', {
                  id: updatedMsg.id,
                  reply_count: updatedMsg.reply_count,
                  thread_messages_count: updatedMsg.thread_messages.length
                });
                return updatedMsg;
              });
              return [...prev, newMessage];
            }
            return prev;
          });
        }
      };

      channel.on('message.new', handleNewMessage);
      console.log('Message listener attached to channel');

      return () => {
        channel.off('message.new', handleNewMessage);
      };
    } catch (error) {
      console.error('Error in thread handling:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    console.log('=== THREAD CLICK END ===');
  };

  const handleSendThreadReply = async () => {
    console.log('=== SEND THREAD REPLY START ===');
    if (!channel || !threadMessage || !threadReply.trim()) {
      console.warn('Cannot send reply:', {
        hasChannel: !!channel,
        hasThreadMessage: !!threadMessage,
        replyLength: threadReply.trim().length
      });
      return;
    }

    try {
      console.log('Preparing thread reply for message:', threadMessage.id);
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
      console.log('Thread reply data:', messageData);

      console.log('Sending message to channel');
      const response = await channel.sendMessage(messageData);
      console.log('Send message response:', {
        message: {
          id: response?.message?.id,
          text: response?.message?.text,
          parent_id: response?.message?.parent_id
        }
      });

      if (response?.message) {
        console.log('Updating thread state with new reply');
        // Update thread message first
        const updatedMessage = { ...threadMessage };
        updatedMessage.reply_count = (updatedMessage.reply_count || 0) + 1;
        updatedMessage.thread_messages = [...(updatedMessage.thread_messages || []), response.message];
        setThreadMessage(updatedMessage);
        
        // Then update thread replies
        setThreadReplies(prev => [...prev, response.message]);

        // Update the message in the main messages list
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.id === threadMessage.id) {
              return updatedMessage;
            }
            return msg;
          })
        );
      }
      setThreadReply('');
      console.log('Thread reply sent successfully');
    } catch (error) {
      console.error('Error sending thread reply:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    console.log('=== SEND THREAD REPLY END ===');
  };

  // Cleanup thread watchers when closing thread
  useEffect(() => {
    if (!showThread) {
      console.log('=== THREAD CLEANUP START ===');
      console.log('Thread panel closed, cleaning up state');
      if (channel) {
        console.log('Removing message listener from channel');
        channel.off('message.new');
      }
      console.log('Resetting thread state');
      setThreadReplies([]);
      setThreadMessage(null);
      console.log('=== THREAD CLEANUP END ===');
    }
  }, [showThread, channel]);

  // Prevent channel reload from affecting thread state
  useEffect(() => {
    if (channel && threadMessage) {
      // Get the current thread message from channel state
      const currentThreadMessage = channel.state.messages.find(
        msg => msg.id === threadMessage.id
      );

      if (!currentThreadMessage) {
        console.error('Could not find thread message in channel state');
        return;
      }

      // Update thread message with latest state
      setThreadMessage(currentThreadMessage);

      // Update thread replies
      if (currentThreadMessage.thread_messages) {
        setThreadReplies(currentThreadMessage.thread_messages);
      }
    }
  }, [channel, threadMessage]);

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

  const handleStartCall = async (isVideo: boolean = false) => {
    if (!videoClient || !channel || !user?.email) return;

    try {
      // Create a new call
      const callId = `${channel.id}-${Date.now()}`;
      console.log('Starting call...', { callId, isVideo });
      
      // Get channel members and format them as objects
      const members = Object.entries(channel.state?.members || {})
        .map(([id, member]) => ({
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
          component="div"
          variant="body1"
          sx={{
            color: isCurrentUser ? 'common.white' : 'text.primary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            '& p': { margin: 0 },
            '& a': { color: 'inherit' }
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.text) }}
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
                  <InsertDriveFileIcon />
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
  const handlePin = async (message: any) => {
    if (!channel || !message || !chatClient) return;

    const isPinned = message.pinned;
    
    try {
      // Optimistically update UI
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === message.id
            ? { ...msg, pinned: !isPinned, pinned_at: isPinned ? null : new Date().toISOString() }
            : msg
        )
      );

      // Update pinned messages list
      if (isPinned) {
        setPinnedMessages(prev => prev.filter(msg => msg.id !== message.id));
      } else {
        setPinnedMessages(prev => [...prev, { 
          ...message, 
          pinned: true, 
          pinned_at: new Date().toISOString()
        }]);
      }

      // Update on server using chatClient - only update pinned status and timestamp
      await chatClient.partialUpdateMessage(message.id, {
        set: {
          pinned: !isPinned,
          pinned_at: !isPinned ? new Date().toISOString() : null
        }
      });

      setMessageMenuAnchor(null);
      enqueueSnackbar(`Message ${isPinned ? 'unpinned' : 'pinned'} successfully`, {
        variant: 'success',
        autoHideDuration: 3000
      });
    } catch (error) {
      console.error('Error pinning/unpinning message:', error);
      
      // Revert optimistic updates
      const originalMessages = channel.state.messages;
      setMessages([...originalMessages]);
      setPinnedMessages(originalMessages.filter(msg => msg.pinned));
      
      enqueueSnackbar(`Failed to ${isPinned ? 'unpin' : 'pin'} message`, {
        variant: 'error',
        autoHideDuration: 3000
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
                        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
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
              borderTop: 1,
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

  if (isLoading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff',
          zIndex: 9999
        }}
      >
        <CircularProgress size={48} color="primary" />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Initializing chat...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we set up your chat...
          </Typography>
        </Box>
      </Box>
    );
  }

  const GroupSettingsDialog = () => {
    return (
      <Dialog
        open={showGroupSettings}
        onClose={handleGroupSettingsClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Group Settings</Typography>
            {channel?.data?.type === 'team' && (
              <AvatarGroup max={4} sx={{ ml: 1 }}>
                {groupMembers?.map((member: any) => (
                  <Avatar 
                    key={member.user_id}
                    src={member.user?.image}
                    sx={{ width: 24, height: 24 }}
                  >
                    {(member.user?.name || member.user_id)?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                ))}
              </AvatarGroup>
            )}
          </Box>
          <IconButton onClick={handleGroupSettingsClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="General" />
            <Tab label="Members" />
            <Tab label="Files" />
          </Tabs>
        </Box>
        <DialogContent sx={{ p: 0 }}>
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Group Name
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  value={tempGroupName}
                  onChange={(e) => setTempGroupName(e.target.value)}
                  label="Group Name"
                  placeholder="Enter group name"
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleUpdateGroupName}
                  disabled={!tempGroupName.trim() || tempGroupName === channel?.data?.name}
                >
                  Update
                </Button>
              </Box>
            </Box>
          )}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Add Members
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Autocomplete
                    multiple
                    fullWidth
                    options={filteredEmployees}
                    getOptionLabel={(option) => option?.name || option?.email || ''}
                    value={selectedMembers
                      .map(email => filteredEmployees.find(emp => emp?.email === email))
                      .filter(Boolean)}
                    onChange={(_, newValue) => {
                      setSelectedMembers(newValue.map(v => v?.email || '').filter(Boolean));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Select members to add"
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {option?.name?.[0] || option?.email?.[0] || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{option?.name || option?.email || 'Unknown'}</Typography>
                            {option?.name && option?.email && (
                              <Typography variant="caption" color="text.secondary">
                                {option.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddMembers}
                    disabled={selectedMembers.length === 0}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Current Members ({groupMembers?.length || 0})
              </Typography>
              <List sx={{ p: 0 }}>
                {(groupMembers || []).map((member: any) => {
                  if (!member) return null;
                  return (
                    <ListItem
                      key={member.user_id || 'unknown'}
                      secondaryAction={
                        member.user_id !== chatClient?.userID && (
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveMember(member.user_id)}
                            size="small"
                            color="error"
                            disabled={!member.user_id}
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={member.user?.image}>
                          {member.user?.name?.[0] || member.user_id?.[0] || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.user?.name || member.user_id || 'Unknown Member'}
                        secondary={member.user_id === chatClient?.userID ? 'You' : member.user?.email || 'No email'}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              {groupFiles.length > 0 ? (
                <Grid container spacing={2}>
                  {groupFiles.map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden'
                        }}
                        onClick={() => window.open(file.asset_url, '_blank')}
                      >
                        {getFileIcon(file.mime_type)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>{file.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.file_size)}
                          </Typography>
                        </Box>
                        <IconButton size="small">
                          <DownloadIcon />
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    p: 4
                  }}
                >
                  <AttachFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No files shared in this group yet
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // Helper function to get other user in DM
  const getOtherUser = (ch: Channel) => {
    if (!ch?.state?.members || !chatClient?.userID) return null;
    return Object.values(ch.state.members).find(
      (m) => m?.user_id !== chatClient.userID
    )?.user;
  };

  const renderChatList = () => {
    return sortChannels(channels).map((ch) => {
      if (!ch) return null;

      const isGroupChat = ch.data?.type === 'team';
      const messages = ch.state?.messages || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const unreadCount = ch.state?.unread_count || 0;

      // For group chats, use channel data
      const channelName = isGroupChat ? ch.data?.name : null;
      const channelImage = isGroupChat ? ch.data?.image : null;

      // For DMs, show the other person's name and info
      const otherUser = !isGroupChat ? getOtherUser(ch) : null;

      return (
        <ListItem
          key={ch.id}
          button
          selected={channel?.id === ch.id}
          onClick={() => handleChannelSelect(ch)}
          sx={{
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            '&:hover': { 
              backgroundColor: 'action.hover',
              '& .MuiAvatar-root': {
                transform: 'scale(1.1)',
                transition: 'transform 0.2s ease'
              }
            }
          }}
        >
          <ListItemAvatar sx={{ minWidth: 56 }}>
            {isGroupChat ? (
              <AvatarGroup max={2} spacing="small" sx={{ '& .MuiAvatar-root': { width: 32, height: 32 } }}>
                {Object.values(ch.state?.members || {})
                  .slice(0, 2)
                  .map((member: any) => (
                    <Avatar 
                      key={member?.user_id} 
                      src={member?.user?.image}
                      sx={{ border: '2px solid', borderColor: 'background.paper' }}
                    >
                      {member?.user?.name?.[0] || '?'}
                    </Avatar>
                  ))}
              </AvatarGroup>
            ) : (
              <Avatar 
                src={otherUser?.image} 
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: '2px solid',
                  borderColor: 'background.paper'
                }}
              >
                {otherUser?.name?.[0] || '?'}
              </Avatar>
            )}
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography 
                  variant="subtitle1" 
                  noWrap 
                  sx={{ 
                    fontWeight: 500,
                    color: unreadCount > 0 ? 'text.primary' : 'text.secondary'
                  }}
                >
                  {isGroupChat ? channelName : otherUser?.name || 'Unknown'}
                </Typography>
                {lastMessage?.created_at && (
                  <Typography 
                    variant="caption"
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.75rem'
                    }}
                  >
                    {formatMessageTime(lastMessage.created_at)}
                  </Typography>
                )}
              </Box>
            }
            secondary={
              <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="body2" 
                  noWrap 
                  sx={{ 
                    color: unreadCount > 0 ? 'text.primary' : 'text.secondary',
                    flex: 1,
                    fontWeight: unreadCount > 0 ? 500 : 400
                  }}
                >
                  {lastMessage?.text ? stripHtmlTags(lastMessage.text) : 'No messages yet'}
                </Typography>
                {unreadCount > 0 && (
                  <Box sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText', 
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    {unreadCount}
                  </Box>
                )}
              </Box>
            }
            sx={{ ml: 1 }}
          />
        </ListItem>
      );
    });
  };

  const FilePreview = ({ attachment }: { attachment: any }) => {
    const isImage = attachment.mime_type?.startsWith('image/');
    const isPdf = attachment.mime_type === 'application/pdf';
    const isVideo = attachment.mime_type?.startsWith('video/');
    const isAudio = attachment.mime_type?.startsWith('audio/');

    if (isImage) {
      return (
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          maxWidth: 300,
          borderRadius: 1,
          overflow: 'hidden',
          '&:hover': {
            '& .image-overlay': {
              opacity: 1,
            }
          }
        }}>
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
          <Box
            className="image-overlay"
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              p: 1,
              opacity: 0,
              transition: 'opacity 0.2s',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
            onClick={() => window.open(attachment.asset_url, '_blank')}
          >
            <OpenInNewIcon fontSize="small" />
            <Typography variant="caption">
              View Full Size
            </Typography>
          </Box>
        </Box>
      );
    }

    const getIcon = () => {
      if (isPdf) return <PdfIcon sx={{ fontSize: '2rem', color: 'error.main' }} />;
      if (isVideo) return <VideoFileIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />;
      if (isAudio) return <AudioFileIcon sx={{ fontSize: '2rem', color: 'secondary.main' }} />;
      return <InsertDriveFileIcon sx={{ fontSize: '2rem', color: 'action.active' }} />;
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        onClick={() => window.open(attachment.asset_url, '_blank')}
      >
        {getIcon()}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{attachment.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(attachment.file_size)}
          </Typography>
        </Box>
        <OpenInNewIcon fontSize="small" color="action" />
      </Box>
    );
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !taskDueDate || !channel) return;

    try {
      // Get the other user's email for task assignment
      const otherUser = getOtherUser(channel);
      const assigneeEmail = otherUser?.email || '';

      // Create task using the existing task API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/tasks/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}` // Add auth token
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          dueDate: taskDueDate.toISOString(),
          priority: taskPriority,
          assignee: assigneeEmail,
          assignedBy: user?.email,
          status: 'pending',
          type: 'chat_task',
          chatId: channel.cid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }

      const task = await response.json();

      // Send a message in the chat about the task
      await channel.sendMessage({
        text: `📋 Created a new task: ${taskTitle}`,
        taskId: task.id, // Custom field for task reference
        custom: {
          task: {
            id: task.id,
            title: taskTitle,
            dueDate: taskDueDate.toISOString(),
            priority: taskPriority,
            status: 'pending'
          }
        }
      });

      // Reset form and close dialog
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDate(null);
      setTaskPriority('medium');
      setShowTaskDialog(false);
      
      enqueueSnackbar('Task created successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Error creating task:', error);
      enqueueSnackbar(error.message || 'Failed to create task', { 
        variant: 'error',
        autoHideDuration: 4000
      });
    }
  };

  const handleTaskClose = () => {
    setTaskAnchorEl(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate(null);
    setTaskPriority('medium');
  };

  const TaskForm = () => (
    <Popover
      open={Boolean(taskAnchorEl)}
      anchorEl={taskAnchorEl}
      onClose={handleTaskClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box sx={{ 
        p: 3, 
        width: 400,
        maxWidth: '90vw',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2 
      }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Create Task</Typography>
        <TextField
          label="Title"
          fullWidth
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          size="small"
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          size="small"
        />
        <DateTimePicker
          label="Due Date"
          value={taskDueDate}
          onChange={(newValue) => setTaskDueDate(newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
              size: "small"
            }
          }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>Priority</InputLabel>
          <Select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
            label="Priority"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>
        {channel && !channel.data?.type?.includes('team') && (
          <Typography variant="body2" color="text.secondary">
            Task will be assigned to: {getOtherUser(channel)?.email || 'Unknown'}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          <Button onClick={handleTaskClose}>Cancel</Button>
          <Button 
            onClick={handleCreateTask}
            variant="contained"
            disabled={!taskTitle.trim() || !taskDueDate}
          >
            Create Task
          </Button>
        </Box>
      </Box>
    </Popover>
  );

  const handleForward = async (message: any) => {
    if (!chatClient) {
      enqueueSnackbar('Chat client not initialized', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }

    setForwardMessage(message);
    setForwardDialogOpen(true);
    setSelectedChannels([]);

    try {
      // Fetch available channels for forwarding
      const channels = await chatClient.queryChannels({ 
        members: { $in: [chatClient.userID] },
        id: { $ne: channel?.id }
      });
      
      setAvailableChannels(channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      enqueueSnackbar('Failed to load channels', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

  const handleForwardSubmit = async () => {
    if (!chatClient || !forwardMessage || selectedChannels.length === 0) {
      return;
    }

    try {
      // Forward message to each selected channel
      await Promise.all(
        selectedChannels.map(async (channelId) => {
          const targetChannel = chatClient.channel('messaging', channelId);
          await targetChannel.sendMessage({
            text: forwardMessage.text,
            attachments: forwardMessage.attachments || [],
            mentioned_users: [],
            parent_id: null,
            forwarded: true,
            forwarded_from: {
              message_id: forwardMessage.id,
              channel_id: channel?.id,
              user: forwardMessage.user,
            },
          });
        })
      );

      enqueueSnackbar('Message forwarded successfully', { 
        variant: 'success',
        autoHideDuration: 3000
      });

      // Reset state
      setForwardMessage(null);
      setForwardDialogOpen(false);
      setSelectedChannels([]);
    } catch (error) {
      console.error('Error forwarding message:', error);
      enqueueSnackbar('Failed to forward message', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    }
  };

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
              {renderChatList()}
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
                        <Typography variant="h6">{getChannelDisplayName()}</Typography>
                        {channel?.data?.type === 'team' && (
                          <AvatarGroup max={4} sx={{ ml: 1 }}>
                            {Object.values(channel.state?.members || {})
                              .map((member: any) => (
                                <Avatar 
                                  key={member.user_id}
                                  src={member.user?.image}
                                  sx={{ width: 24, height: 24 }}
                                >
                                  {member.user?.name?.[0]}
                                </Avatar>
                              ))}
                          </AvatarGroup>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                          color={showPinnedMessages ? "primary" : "default"}
                        >
                          <Badge badgeContent={pinnedMessages.length} color="primary">
                            <PushPinIcon />
                          </Badge>
                        </IconButton>
                        <Tooltip title="Voice Call">
                          <IconButton onClick={() => handleStartCall(false)}>
                            <CallIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Video Call">
                          <IconButton onClick={() => handleStartCall(true)}>
                            <VideocamIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Create Task">
                          <IconButton onClick={(e) => setTaskAnchorEl(e.currentTarget)}>
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                        {channel?.data?.type === 'team' && (
                          <Tooltip title="Group Settings">
                            <IconButton onClick={handleGroupSettingsClick}>
                              <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                        )}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Avatar
                                src={msg.user?.image}
                                sx={{ width: 32, height: 32 }}
                              >
                                {msg.user?.name?.[0]}
                              </Avatar>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                    {msg.user?.name || msg.user?.id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatMessageTime(msg.created_at)}
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
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {messages.map((msg, index) => (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.user?.id === chatClient?.userID ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          width: '100%',
                          alignSelf: msg.user?.id === chatClient?.userID ? 'flex-end' : 'flex-start',
                          pl: msg.user?.id === chatClient?.userID ? 'auto' : 0,
                          pr: msg.user?.id === chatClient?.userID ? 0 : 'auto',
                          position: 'relative',
                          '&:hover .message-actions': {
                            opacity: 1,
                          },
                        }}
                      >
                        <Box
                          className="message-actions"
                          sx={{
                            position: 'absolute',
                            top: -28,
                            right: msg.user?.id === chatClient?.userID ? 0 : 'auto',
                            left: msg.user?.id === chatClient?.userID ? 'auto' : 0,
                            display: 'flex',
                            gap: 0.5,
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            boxShadow: 2,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            zIndex: 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => handleReactionClick(e, msg)}
                          >
                            <InsertEmoticonIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleThreadClick(msg);
                            }}
                          >
                            <ReplyIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleForward(msg)}
                          >
                            <ForwardIcon fontSize="small" />
                          </IconButton>
                          {msg.user?.id === chatClient?.userID && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(msg)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(msg)}
                                sx={{ 
                                  display: msg.user?.id === chatClient?.userID ? 'inline-flex' : 'none',
                                  color: 'error.main',
                                  '&:hover': {
                                    bgcolor: 'error.light',
                                    color: 'error.dark'
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handlePin(msg)}
                          >
                            <PushPinIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {!msg.user?.id === chatClient?.userID && (
                            <Avatar
                              src={msg.user?.image}
                              sx={{ width: 24, height: 24 }}
                            >
                              {msg.user?.name?.[0]}
                            </Avatar>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {msg.user?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatMessageTime(msg.created_at)}
                          </Typography>
                          {msg.user?.id === chatClient?.userID && (
                            <Avatar
                              src={msg.user?.image}
                              sx={{ width: 24, height: 24 }}
                            >
                              {msg.user?.name?.[0]}
                            </Avatar>
                          )}
                        </Box>

                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                          {msg.text && (
                            <Box
                              sx={{
                                bgcolor: msg.user?.id === chatClient?.userID ? 'primary.main' : 'grey.100',
                                color: msg.user?.id === chatClient?.userID ? 'primary.contrastText' : 'text.primary',
                                borderRadius: 2,
                                px: 2,
                                py: 1.5,
                                position: 'relative',
                                maxWidth: '85%',
                                alignSelf: msg.user?.id === chatClient?.userID ? 'flex-end' : 'flex-start',
                                '& a': {
                                  color: msg.user?.id === chatClient?.userID ? 'white' : 'primary.main',
                                },
                                '& p': {
                                  m: 0,
                                  fontSize: '0.9375rem',
                                  lineHeight: 1.6,
                                },
                                '& ul, & ol': {
                                  m: 0,
                                  pl: 2.5,
                                },
                                wordBreak: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                minWidth: '120px',
                              }}
                            >
                              {editingMessage?.id === msg.id ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <TextField
                                    fullWidth
                                    multiline
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    size="small"
                                    autoFocus
                                    sx={{
                                      '& .MuiInputBase-root': {
                                        bgcolor: 'background.paper',
                                      },
                                    }}
                                  />
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <Button
                                      size="small"
                                      onClick={handleEditCancel}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={handleEditSave}
                                      disabled={!editedText.trim()}
                                    >
                                      Save
                                    </Button>
                                  </Box>
                                </Box>
                              ) : (
                                <>
                                  <Typography 
                                    component="div"
                                    variant="body1"
                                    sx={{
                                      color: 'inherit',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      '& p': { margin: 0 },
                                      '& a': { color: 'inherit' }
                                    }}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.text) }}
                                  />
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                      {msg.attachments.map((attachment: any, index: number) => (
                                        <FilePreview key={index} attachment={attachment} />
                                      ))}
                                    </Box>
                                  )}
                                </>
                              )}
                            </Box>
                          )}
                          {/* Thread Reply Counter */}
                          {msg.reply_count > 0 && (
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                handleThreadClick(msg);
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                mt: 0.5,
                                cursor: 'pointer',
                                color: 'text.secondary',
                                alignSelf: msg.user?.id === chatClient?.userID ? 'flex-end' : 'flex-start',
                                '&:hover': {
                                  color: 'primary.main',
                                  '& .MuiSvgIcon-root': {
                                    transform: 'scale(1.1)',
                                  }
                                },
                                transition: 'all 0.2s ease-in-out',
                              }}
                            >
                              <ChatBubbleOutlineIcon sx={{ 
                                fontSize: '0.9rem',
                                transition: 'transform 0.2s ease-in-out'
                              }} />
                              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {selectedFiles.map((file, index) => (
                          <Box
                            key={file.name}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 1,
                              bgcolor: 'background.paper',
                              borderRadius: 1
                            }}
                          >
                            {file.type?.startsWith('image/') ? (
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9ecef',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                              >
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9ecef',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                              >
                                <InsertDriveFileIcon />
                              </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body2" 
                                noWrap 
                                sx={{ 
                                  fontWeight: 500,
                                  color: theme.palette.mode === 'dark' ? '#fff' : '#000'
                                }}
                              >
                                {file.name}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                                }}
                              >
                                {formatFileSize(file.size)}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
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
                      <RichTextEditor
                        value={messageText}
                        onChange={(value) => setMessageText(value)}
                        onSubmit={handleSendMessage}
                        placeholder="Type a message..."
                        sx={{ width: '100%' }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Thread Panel */}
                {showThread && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      height: '100%',
                      width: 320,
                      transform: showThread ? 'translateX(0)' : 'translateX(100%)',
                      transition: 'transform 0.3s ease-in-out',
                      borderLeft: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'background.paper',
                      zIndex: 1200,
                    }}
                  >
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
                            {threadMessage.user?.name?.[0]}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                              <Typography variant="subtitle2">
                                {threadMessage.user?.name || threadMessage.user?.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatMessageTime(threadMessage.created_at)}
                              </Typography>
                            </Box>
                            <Typography>{threadMessage.text}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Thread Replies */}
                    <Box sx={{ 
                      flex: 1, 
                      overflow: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      p: 2
                    }}>
                      {threadReplies.map((reply: any) => (
                        <Box
                          key={reply.id}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar src={reply.user?.image} sx={{ width: 32, height: 32 }}>
                              {reply.user?.name?.[0]}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <Typography variant="subtitle2">
                                  {reply.user?.name || reply.user?.id}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatMessageTime(reply.created_at)}
                                </Typography>
                              </Box>
                              <Typography>{reply.text}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Thread Reply Input */}
                    <Box sx={{ 
                      p: 2, 
                      borderTop: 1,
                      borderColor: 'divider'
                    }}>
                      <RichTextEditor
                        value={threadReply}
                        onChange={(value) => setThreadReply(value)}
                        onSubmit={handleSendThreadReply}
                        placeholder="Reply to thread..."
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
                    secondary={member.user.id === chatClient?.userID ? '(You)' : member.user?.email || 'No email'}
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
                handleDelete(selectedMessage);
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
          onClick={() => handlePin(selectedMessage)}
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
                        setSelectedChannels(prev => {
                          const isSelected = prev.includes(ch.id);
                          return isSelected
                            ? prev.filter(id => id !== ch.id)
                            : [...prev, ch.id];
                        });
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
            onClick={handleForwardSubmit}
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
      <GroupSettingsDialog />
      <TaskForm />
      
      {/* Thread Dialog */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          width: 320,
          transform: showThread ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          borderLeft: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          zIndex: 1200,
        }}
      >
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
                {threadMessage.user?.name?.[0]}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="subtitle2">
                    {threadMessage.user?.name || threadMessage.user?.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatMessageTime(threadMessage.created_at)}
                  </Typography>
                </Box>
                <Typography>{threadMessage.text}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Thread Replies */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2
        }}>
          {threadReplies.map((reply: any) => (
            <Box
              key={reply.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={reply.user?.image} sx={{ width: 32, height: 32 }}>
                  {reply.user?.name?.[0]}
                </Avatar>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="subtitle2">
                      {reply.user?.name || reply.user?.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatMessageTime(reply.created_at)}
                    </Typography>
                  </Box>
                  <Typography>{reply.text}</Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Thread Reply Input */}
        <Box sx={{ 
          p: 2, 
          borderTop: 1,
          borderColor: 'divider'
        }}>
          <RichTextEditor
            value={threadReply}
            onChange={(value) => setThreadReply(value)}
            onSubmit={handleSendThreadReply}
            placeholder="Reply to thread..."
          />
        </Box>
      </Box>
    </Box>
  );
};

export default StreamChatPopover;
