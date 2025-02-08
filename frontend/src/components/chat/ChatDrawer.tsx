import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  Stack,
  Divider,
  Badge,
  Paper,
  InputBase,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Peer from 'peerjs';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  department_id: string;
  read: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  department_id: string;
  role: string;
  online?: boolean;
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  online: boolean;
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
}

export default function ChatDrawer({ open, onClose, departmentId }: ChatDrawerProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [inCall, setInCall] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [callPartner, setCallPartner] = useState<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data: employees, error } = await supabase
          .from('employees')
          .select('*')
          .neq('id', user?.uid); // Exclude current user

        if (error) throw error;

        setEmployees(employees || []);
        
        // Initialize conversations from employees
        const initialConversations: Conversation[] = employees.map(emp => ({
          id: `chat_${emp.id}`,
          participant_id: emp.id,
          participant_name: emp.name,
          participant_avatar: emp.avatar_url,
          unreadCount: 0,
          online: false
        }));

        setConversations(initialConversations);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [user?.uid]);

  // Subscribe to user presence
  useEffect(() => {
    const presenceChannel = supabase.channel('online-users');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        
        // Update online status for conversations
        setConversations(prev => prev.map(conv => ({
          ...conv,
          online: Boolean(state[conv.participant_id])
        })));
      })
      .subscribe();

    return () => {
      presenceChannel.unsubscribe();
    };
  }, []);

  // Initialize PeerJS
  useEffect(() => {
    if (!user) return;
    
    const newPeer = new Peer(user.uid, {
      host: 'localhost',
      port: 9000,
      path: '/myapp'
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!departmentId) return;

    // Initial fetch
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `department_id=eq.${departmentId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [departmentId]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, content, sender_id, created_at, sender_name, department_id')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          content: newMessage,
          sender_id: user.uid,
          department_id: departmentId,
          sender_name: user.displayName || user.email
        }
      ]);

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
  };

  const handleVideoCall = async () => {
    if (!peer || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true 
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Handle incoming calls
      peer.on('call', (call) => {
        call.answer(stream);
        setCallPartner(call);
        
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      });

      setInCall(true);
    } catch (err) {
      console.error('Failed to get media devices:', err);
    }
  };

  const handleVoiceCall = async () => {
    if (!peer || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false,
        audio: true 
      });

      // Handle incoming calls
      peer.on('call', (call) => {
        call.answer(stream);
        setCallPartner(call);
        
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      });

      setInCall(true);
    } catch (err) {
      console.error('Failed to get media devices:', err);
    }
  };

  const handleEndCall = () => {
    if (callPartner) {
      callPartner.close();
    }
    setInCall(false);
    setCallPartner(null);
    
    // Stop all tracks
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: '600px' },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex' }}>
        {/* Conversations List */}
        <Box
          sx={{
            width: '280px',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Header */}
          <Box
            sx={{
              p: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Paper
              component={motion.div}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                borderRadius: 3,
              }}
            >
              <IconButton sx={{ p: '10px' }}>
                <SearchIcon />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Paper>
          </Box>

          {/* Conversations */}
          <List sx={{ flex: 1, overflow: 'auto', px: 1, py: 2 }}>
            {conversations.map((conversation) => (
              <React.Fragment key={conversation.id}>
                <ListItemButton
                  selected={selectedConversation === conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        conversation.online ? (
                          <CircleIcon
                            sx={{
                              fontSize: 12,
                              color: 'success.main',
                              bgcolor: 'background.paper',
                              borderRadius: '50%',
                            }}
                          />
                        ) : null
                      }
                    >
                      <Avatar
                        src={conversation.avatar}
                        sx={{
                          bgcolor: (theme) =>
                            conversation.id === 'team'
                              ? theme.palette.primary.main
                              : theme.palette.secondary.main,
                        }}
                      >
                        {conversation.name[0]}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: conversation.unreadCount > 0 ? 600 : 400,
                        }}
                      >
                        {conversation.name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conversation.lastMessage}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {conversation.lastMessageTime}
                    </Typography>
                    {conversation.unreadCount > 0 && (
                      <Box
                        sx={{
                          mt: 0.5,
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                        }}
                      >
                        {conversation.unreadCount}
                      </Box>
                    )}
                  </Box>
                </ListItemButton>
                <Divider sx={{ my: 1 }} />
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {selectedConversation
                  ? conversations.find((c) => c.id === selectedConversation)?.name
                  : 'Select a conversation'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={handleVideoCall}>
                <VideocamIcon />
              </IconButton>
              <IconButton onClick={handleVoiceCall}>
                <PhoneIcon />
              </IconButton>
              <IconButton>
                <MoreVertIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
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
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems:
                        message.sender_id === user?.uid ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 1,
                        maxWidth: '70%',
                      }}
                    >
                      {message.sender_id !== user?.uid && (
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'secondary.main',
                          }}
                        >
                          {message.sender_name[0]}
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          bgcolor: message.sender_id === user?.uid
                            ? 'primary.main'
                            : 'background.paper',
                          color: message.sender_id === user?.uid
                            ? 'primary.contrastText'
                            : 'text.primary',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2">{message.content}</Typography>
                      </Paper>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, color: 'text.secondary' }}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 1,
              }}
            >
              <IconButton size="small">
                <EmojiIcon />
              </IconButton>
              <IconButton size="small">
                <AttachFileIcon />
              </IconButton>
              <InputBase
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                sx={{
                  flex: 1,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  p: 1,
                  '& .MuiInputBase-input': {
                    p: 0,
                  },
                }}
              />
              <IconButton
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                color="primary"
                sx={{
                  bgcolor: (theme) =>
                    newMessage.trim()
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Drawer>
  );
}
