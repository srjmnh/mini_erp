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
  Avatar,
  TextField,
  Button,
  Stack,
  Divider,
  Badge,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
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
}

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
}

export default function ChatDrawer({ open, onClose, departmentId }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [inCall, setInCall] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [callPartner, setCallPartner] = useState<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

  const sendMessage = async () => {
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

  const startCall = async (video: boolean = false) => {
    if (!peer || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: video,
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

  const endCall = () => {
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
          width: '400px',
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Team Chat</Typography>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={() => startCall(false)} color="primary">
                <PhoneIcon />
              </IconButton>
              <IconButton onClick={() => startCall(true)} color="primary">
                <VideoCallIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Call UI */}
        {inCall && (
          <Box sx={{ p: 2, bgcolor: 'background.default' }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1">Active Call</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '150px', height: '100px', objectFit: 'cover' }}
                  />
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: '150px', height: '100px', objectFit: 'cover' }}
                  />
                </Box>
                <Button variant="contained" color="error" onClick={endCall}>
                  End Call
                </Button>
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Stack spacing={2}>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender_id === user?.uid ? 'flex-end' : 'flex-start'
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    bgcolor: message.sender_id === user?.uid ? 'primary.main' : 'background.paper',
                    color: message.sender_id === user?.uid ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="caption" display="block" gutterBottom>
                    {message.sender_name}
                  </Typography>
                  <Typography variant="body1">
                    {message.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        </Box>

        {/* Message Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
            />
            <IconButton color="primary" onClick={sendMessage}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}
