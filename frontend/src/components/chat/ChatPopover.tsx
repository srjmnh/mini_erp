import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  Stack,
  Divider,
  Badge,
  Paper,
  InputBase,
  Popover,
  useTheme,
  alpha,
  Autocomplete,
  Button,
  TextField,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Circle as CircleIcon,
  Chat as ChatIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ChatNotification from './ChatNotification';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import CreateGroupDialog from './CreateGroupDialog';
import NewMessageDialog from './NewMessageDialog';
import EditIcon from '@mui/icons-material/Edit';

interface Employee {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  department_id: string;
  role: string;
  online?: boolean;

  // Helper function to get display name
  getDisplayName?: () => string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'department' | 'custom';
  department_id?: string;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  group_id?: string;
  message_type: 'direct' | 'group';
}

export default function ChatPopover() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: Message | null;
  }>({ open: false, message: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState<{[key: string]: number}>({});
  const [lastMessages, setLastMessages] = useState<{[key: string]: { content: string; timestamp: string }}>({});
  const [activeChats, setActiveChats] = useState<(Employee | Group)[]>([]);

  // Fetch active chats and groups
  useEffect(() => {
    const fetchChatsAndGroups = async () => {
      if (!user?.email) return;

      try {
        // Get latest messages for each chat
        const { data: latestMessages } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .or(`sender_id.eq.${user.email},receiver_id.eq.${user.email}`)
          .order('created_at', { ascending: false });

        // Process latest messages
        const chatEmails = new Set<string>();
        const lastMsgs: {[key: string]: { content: string; timestamp: string }} = {};
        const unread: {[key: string]: number} = {};

        latestMessages?.forEach(msg => {
          const otherParty = msg.sender_id === user.email ? msg.receiver_id : msg.sender_id;
          const chatId = msg.group_id || otherParty;

          // Track unique chat participants
          if (!msg.group_id) {
            chatEmails.add(otherParty);
          }

          // Track last message for each chat
          if (!lastMsgs[chatId] || new Date(msg.created_at) > new Date(lastMsgs[chatId].timestamp)) {
            lastMsgs[chatId] = {
              content: msg.content,
              timestamp: msg.created_at
            };
          }

          // Count unread messages
          if (msg.sender_id !== user.email && !msg.read) {
            unread[chatId] = (unread[chatId] || 0) + 1;
          }
        });

        setLastMessages(lastMsgs);
        setUnreadMessages(unread);

        // Get all groups the user is a member of
        const { data: userGroups } = await supabaseAdmin
          .from('chat_group_members')
          .select('group_id')
          .eq('user_id', user.email);

        if (userGroups?.length) {
          const { data: groupData } = await supabaseAdmin
            .from('chat_groups')
            .select('*')
            .in('id', userGroups.map(g => g.group_id));
          
          setGroups(groupData || []);
        }

        // Combine active chats
        const activeEmployees = employees.filter(emp => chatEmails.has(emp.email));
        const allChats = [AI_ASSISTANT, ...activeEmployees, ...(groupData || [])];
        
        // Sort chats by last message and unread count
        allChats.sort((a, b) => {
          const aId = 'role' in a ? a.email : a.id;
          const bId = 'role' in b ? b.email : b.id;
          
          // Sort by unread first
          const unreadDiff = (unread[bId] || 0) - (unread[aId] || 0);
          if (unreadDiff !== 0) return unreadDiff;
          
          // Then by last message time
          const aTime = lastMsgs[aId]?.timestamp;
          const bTime = lastMsgs[bId]?.timestamp;
          if (!aTime && !bTime) return 0;
          if (!aTime) return 1;
          if (!bTime) return -1;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setActiveChats(allChats);
      } catch (error) {
        console.error('Error fetching chats and groups:', error);
      }
    };

    fetchChatsAndGroups();

    // Set up subscription for new messages
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          const chatId = newMessage.group_id || 
            (newMessage.sender_id === user.email ? newMessage.receiver_id : newMessage.sender_id);

          // Update last message
          setLastMessages(prev => ({
            ...prev,
            [chatId]: {
              content: newMessage.content,
              timestamp: newMessage.created_at
            }
          }));

          // Update unread count if message is from someone else
          if (newMessage.sender_id !== user.email) {
            setUnreadMessages(prev => ({
              ...prev,
              [chatId]: (prev[chatId] || 0) + 1
            }));
          }

          // Refresh active chats to update order
          fetchChatsAndGroups();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.email, employees]);

  // Add AI Assistant to employees list
  const AI_ASSISTANT: Employee = {
    id: 'ai-assistant',
    name: 'AI Assistant',
    email: 'ai@modernerp.com',
    department_id: 'system',
    role: 'Virtual Assistant',
    online: true,
    avatar_url: '/ai-avatar.png' // Add an AI avatar image
  };

  useEffect(() => {
    const fetchEmployeesAndSetupGroups = async () => {
      if (!user?.email) return;

      try {
        // Get all users from Firestore
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const employeeList = usersSnapshot.docs
          .map(doc => {
            const data = doc.data();
            const employee = {
              id: doc.id,
              first_name: data.firstName,
              last_name: data.lastName,
              name: data.name,
              email: data.email,
              department_id: data.department || '',
              role: data.role || 'Employee',
              online: true,
              avatar_url: data.photoURL,
              getDisplayName: function() {
                if (this.name) return this.name;
                if (this.first_name && this.last_name) return `${this.first_name} ${this.last_name}`;
                if (this.first_name) return this.first_name;
                if (this.last_name) return this.last_name;
                return this.email.split('@')[0];
              }
            };
            return employee;
          })
          .filter(emp => emp.email !== user.email); // Exclude current user

        // Add AI Assistant at the top of the list
        setEmployees([AI_ASSISTANT, ...employeeList]);

        // Get current user's department
        const currentUser = usersSnapshot.docs.find(doc => doc.data().email === user.email);
        const userDepartment = currentUser?.data().department;
        const departmentName = currentUser?.data().departmentName || userDepartment;

        if (userDepartment) {
          console.log('User department:', userDepartment);
          
          // Check if department group exists
          const { data: existingGroups, error: existingGroupsError } = await supabaseAdmin
            .from('chat_groups')
            .select('*')
            .eq('department_id', userDepartment)
            .eq('type', 'department');

          if (existingGroupsError) {
            console.error('Error checking existing groups:', existingGroupsError);
            return;
          }

          console.log('Existing department groups:', existingGroups);

          if (!existingGroups?.length) {
            console.log('Creating new department group');
            // Create department group
            const { data: group, error: groupError } = await supabaseAdmin
              .from('chat_groups')
              .insert([
                {
                  name: `${departmentName} Department`,
                  description: 'Department-wide chat group',
                  type: 'department',
                  department_id: userDepartment,
                  created_by: user.email,
                  created_at: new Date().toISOString()
                }
              ])
              .select()
              .single();

            if (groupError) {
              console.error('Error creating group:', groupError);
              return;
            }

            console.log('Created department group:', group);

            // Add department members
            const departmentMembers = [
              // Add current user as admin
              {
                group_id: group.id,
                user_id: user.email,
                role: 'admin'
              },
              // Add other department members
              ...employeeList
                .filter(emp => emp.department_id === userDepartment)
                .map(emp => ({
                  group_id: group.id,
                  user_id: emp.email,
                  role: 'member'
                }))
            ];

            console.log('Adding department members:', departmentMembers);

            const { error: membersError } = await supabaseAdmin
              .from('chat_group_members')
              .insert(departmentMembers);

            if (membersError) {
              console.error('Error adding members:', membersError);
              return;
            }

            // Set the department group as selected
            setSelectedGroup(group);
            // Refresh groups list
            const { data: updatedGroups } = await supabaseAdmin
              .from('chat_groups')
              .select('*')
              .eq('id', group.id);
            
            if (updatedGroups?.length) {
              setGroups(prev => [...prev, updatedGroups[0]]);
            }
          } else {
            // Select existing department group
            console.log('Using existing department group:', existingGroups[0]);
            setSelectedGroup(existingGroups[0]);
          }
        }
      } catch (error) {
        console.error('Error setting up chat:', error);
      }
    };

    fetchEmployeesAndSetupGroups();
  }, [user?.email]);

  // Load last selected chat from localStorage
  useEffect(() => {
    const lastSelectedId = localStorage.getItem('lastSelectedChatId');
    const lastSelectedType = localStorage.getItem('lastSelectedChatType');

    if (lastSelectedId && lastSelectedType) {
      if (lastSelectedType === 'employee' && employees.length > 0) {
        const lastEmployee = employees.find(emp => emp.id === lastSelectedId);
        if (lastEmployee) {
          setSelectedEmployee(lastEmployee);
        }
      } else if (lastSelectedType === 'group' && groups.length > 0) {
        const lastGroup = groups.find(g => g.id === lastSelectedId);
        if (lastGroup) {
          setSelectedGroup(lastGroup);
        }
      }
    } else if (groups.length > 0) {
      // If no last selected chat, try to select department group
      const departmentGroup = groups.find(g => g.type === 'department');
      if (departmentGroup) {
        console.log('Auto-selecting department group:', departmentGroup);
        setSelectedGroup(departmentGroup);
      }
    }
  }, [employees, groups]);

  // Save selected chat to localStorage
  useEffect(() => {
    if (selectedEmployee) {
      localStorage.setItem('lastSelectedChatId', selectedEmployee.id);
      localStorage.setItem('lastSelectedChatType', 'employee');
    } else if (selectedGroup) {
      localStorage.setItem('lastSelectedChatId', selectedGroup.id);
      localStorage.setItem('lastSelectedChatType', 'group');
    }
  }, [selectedEmployee, selectedGroup]);

  // Fetch messages when employee or group is selected
  useEffect(() => {
    if ((!selectedEmployee && !selectedGroup) || !user?.email) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        let query = supabaseAdmin
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (selectedGroup) {
          // Fetch group messages
          query = query
            .eq('group_id', selectedGroup.id)
            .eq('message_type', 'group');
        } else if (selectedEmployee) {
          // Fetch direct messages
          query = query
            .eq('message_type', 'direct')
            .or(
              `and(sender_id.eq.${user.email},receiver_id.eq.${selectedEmployee.email}),` +
              `and(sender_id.eq.${selectedEmployee.email},receiver_id.eq.${user.email})`
            );
        }

        const { data: messages, error } = await query;

        if (error) throw error;
        setMessages(messages || []);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages and groups
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          console.log('New message received:', newMessage);
          
          // Check if message belongs to current conversation
          let belongsToCurrentChat = false;
          let chatId = '';
          
          if (selectedGroup) {
            belongsToCurrentChat = newMessage.group_id === selectedGroup.id;
            chatId = selectedGroup.id;
          } else if (selectedEmployee) {
            belongsToCurrentChat = (
              (newMessage.sender_id === selectedEmployee.email && newMessage.receiver_id === user.email) ||
              (newMessage.sender_id === user.email && newMessage.receiver_id === selectedEmployee.email) ||
              newMessage.sender_id === 'ai-assistant' || 
              newMessage.receiver_id === 'ai-assistant'
            );
            chatId = selectedEmployee.email;
          }

          // Update last message and unread count
          const messageChat = newMessage.group_id || (
            newMessage.sender_id === user?.email ? newMessage.receiver_id : newMessage.sender_id
          );
          
          // Update last message for the chat
          setLastMessages(prev => ({
            ...prev,
            [messageChat]: {
              content: newMessage.content,
              timestamp: newMessage.created_at
            }
          }));

          // Update unread count if message is not from current user
          if (newMessage.sender_id !== user?.email && !belongsToCurrentChat) {
            setUnreadMessages(prev => ({
              ...prev,
              [messageChat]: (prev[messageChat] || 0) + 1
            }));
          }

          if (belongsToCurrentChat) {
            console.log('Adding message to chat:', newMessage);
            setMessages(prev => [newMessage, ...prev]);
            if (newMessage.sender_id !== user.email) {
              // Show notification
              const sender = employees.find(e => e.email === newMessage.sender_id);
              const group = newMessage.group_id ? groups.find(g => g.id === newMessage.group_id) : undefined;
              setNotification({
                open: true,
                message: newMessage,
              });
            }
            // Scroll to new message
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_groups'
        },
        () => {
          // Refresh groups when changes occur
          if (user?.email) {
            const fetchGroups = async () => {
              const { data: userGroups } = await supabaseAdmin
                .from('chat_group_members')
                .select('group_id')
                .eq('user_id', user.email);

              if (userGroups?.length) {
                const { data: groups } = await supabaseAdmin
                  .from('chat_groups')
                  .select('*')
                  .in('id', userGroups.map(g => g.group_id));
                
                if (groups) {
                  setGroups(groups);
                  // If no group is selected, select the first one
                  if (!selectedGroup) {
                    setSelectedGroup(groups[0]);
                  }
                }
              }
            };
            fetchGroups();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedEmployee, user?.uid]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.email || (!selectedEmployee && !selectedGroup)) return;

    try {
      if (selectedEmployee?.id === 'ai-assistant') {
        // Handle AI Assistant chat
        const aiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMessage })
        }).then(res => res.json());

        // Add user message
        const { error: userMsgError } = await supabaseAdmin.from('chat_messages').insert([
          {
            content: newMessage,
            sender_id: user.email,
            receiver_id: 'ai-assistant',
            message_type: 'direct'
          }
        ]);

        if (userMsgError) throw userMsgError;

        // Add AI response
        const { error: aiMsgError } = await supabaseAdmin.from('chat_messages').insert([
          {
            content: aiResponse.message || 'I\'m processing your request...',
            sender_id: 'ai-assistant',
            receiver_id: user.email,
            message_type: 'direct'
          }
        ]);

        if (aiMsgError) throw aiMsgError;
      } else if (selectedGroup) {
        // Handle group chat
        const { error } = await supabaseAdmin
          .from('chat_messages')
          .insert([
            {
              content: newMessage,
              sender_id: user.email,
              receiver_id: selectedGroup.id, // For group messages, set receiver_id to group ID
              group_id: selectedGroup.id,
              message_type: 'group',
              created_at: new Date().toISOString()
            }
          ]);

        if (error) {
          console.error('Error sending group message:', error);
          throw error;
        }
        
        // Log for debugging
        console.log('Sent group message:', {
          content: newMessage,
          group: selectedGroup.name,
          sender: user.email
        });
      } else if (selectedEmployee) {
        // Handle regular employee chat
        const { error } = await supabaseAdmin
          .from('chat_messages')
          .insert([
            {
              content: newMessage,
              sender_id: user.email,
              receiver_id: selectedEmployee.email,
              message_type: 'direct'
            }
          ]);

        if (error) {
          console.error('Error sending direct message:', error);
          throw error;
        }
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Load the last selected chat
    if (!selectedEmployee && !selectedGroup && groups.length > 0) {
      const departmentGroup = groups.find(g => g.type === 'department');
      if (departmentGroup) {
        console.log('Auto-selecting department group:', departmentGroup);
        setSelectedGroup(departmentGroup);
      }
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedEmployee(null);
  };

  const open = Boolean(anchorEl);

  // Calculate total unread count
  const totalUnreadCount = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  const handleCreateGroup = () => {
    setCreateGroupOpen(true);
  };

  const handleGroupCreated = (newGroup: Group) => {
    setGroups(prev => [...prev, newGroup]);
    setSelectedGroup(newGroup);
    setCreateGroupOpen(false);
    
    // Refresh groups list
    if (user?.email) {
      const fetchGroups = async () => {
        const { data } = await supabaseAdmin
          .from('chat_groups')
          .select('*')
          .eq('created_by', user.email);
        setGroups(data || []);
      };
      fetchGroups();
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 90, // Moved to the left to avoid overlapping with other buttons
          bgcolor: 'primary.main',
          color: 'white',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          boxShadow: 4,
        }}
      >
        <Badge
          badgeContent={totalUnreadCount}
          color="error"
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { right: -3, top: 3 } }}
        >
          <ChatIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPopover-paper': {
            width: 800,  // Increased width
            height: 600,
            overflow: 'hidden',
            borderRadius: 2,
            display: 'flex',
          },
        }}
      >
        {/* Left Sidebar */}
        <Box
          sx={{
            width: 280,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Header */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <TextField
              placeholder="Search chats..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Paper>

          {/* Active Chats List */}
          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              '& .MuiListItemButton-root.active': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            {/* AI Assistant */}
            <ListItemButton
              onClick={() => {
                setSelectedEmployee(AI_ASSISTANT);
                setSelectedGroup(null);
                setMessages([]);
              }}
              className={selectedEmployee?.id === 'ai-assistant' ? 'active' : ''}
            >
              <ListItemAvatar>
                <Avatar src={AI_ASSISTANT.avatar_url}>
                  {AI_ASSISTANT.name[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={AI_ASSISTANT.name}
                secondary="Virtual Assistant"
                primaryTypographyProps={{
                  variant: 'subtitle2',
                  fontWeight: selectedEmployee?.id === 'ai-assistant' ? 'bold' : 'normal',
                }}
              />
            </ListItemButton>

            {/* Department Group */}
            {groups.filter(g => g.type === 'department').map((group) => (
              <ListItemButton
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  setSelectedEmployee(null);
                  setMessages([]);
                }}
                className={selectedGroup?.id === group.id ? 'active' : ''}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {group.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={group.name}
                  secondary="Department"
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    fontWeight: selectedGroup?.id === group.id ? 'bold' : 'normal',
                  }}
                />
              </ListItemButton>
            ))}

            {/* Custom Groups */}
            {groups.filter(g => g.type === 'custom').map((group) => (
              <ListItemButton
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  setSelectedEmployee(null);
                  setMessages([]);
                }}
                className={selectedGroup?.id === group.id ? 'active' : ''}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    {group.name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={group.name}
                  secondary="Group"
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    fontWeight: selectedGroup?.id === group.id ? 'bold' : 'normal',
                  }}
                />
              </ListItemButton>
            ))}

            {/* All Chats */}
            {activeChats.map((chat) => {
              const isEmployee = 'role' in chat;
              const chatId = isEmployee ? chat.email : chat.id;
              const hasUnread = unreadMessages[chatId] > 0;
              
              return (
                <ListItemButton
                  key={chatId}
                  onClick={() => {
                    if (isEmployee) {
                      setSelectedEmployee(chat as Employee);
                      setSelectedGroup(null);
                    } else {
                      setSelectedGroup(chat as Group);
                      setSelectedEmployee(null);
                    }
                    setMessages([]);
                    // Clear unread count
                    if (hasUnread) {
                      setUnreadMessages(prev => ({ ...prev, [chatId]: 0 }));
                    }
                  }}
                  className={
                    (isEmployee && selectedEmployee?.email === chatId) ||
                    (!isEmployee && selectedGroup?.id === chatId)
                      ? 'active'
                      : ''
                  }
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={isEmployee ? (chat as Employee).avatar_url : undefined}
                      sx={!isEmployee ? { bgcolor: 'primary.main' } : undefined}
                    >
                      {isEmployee 
                        ? (chat as Employee).getDisplayName?.()[0]
                        : (chat as Group).name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        sx={{ 
                          fontWeight: hasUnread ? 700 : 400
                        }}
                      >
                        {isEmployee 
                          ? (chat as Employee).getDisplayName?.()
                          : (chat as Group).name}
                      </Typography>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {isEmployee 
                            ? (chat as Employee).role
                            : `${(chat as Group).type} group`}
                        </Typography>
                        {lastMessages[chatId] && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 1 
                          }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                fontSize: '0.8rem',
                                fontWeight: hasUnread ? 600 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '150px'
                              }}
                            >
                              {lastMessages[chatId].content}
                            </Typography>
                            {hasUnread && (
                              <Typography
                                variant="caption"
                                sx={{
                                  bgcolor: 'error.main',
                                  color: 'error.contrastText',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.7rem',
                                  flexShrink: 0
                                }}
                              >
                                {unreadMessages[chatId]}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}

          </List>

          {/* Action Buttons */}
          <Paper
            elevation={0}
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1
            }}
          >
            <Button
              fullWidth
              startIcon={<EditIcon />}
              onClick={() => setNewMessageOpen(true)}
              variant="outlined"
              size="small"
            >
              New Message
            </Button>
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={handleCreateGroup}
              variant="contained"
              size="small"
            >
              Create Group
            </Button>
          </Paper>
        </Box>
        {/* Main Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat Header */}
          {(selectedEmployee || selectedGroup) && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                src={selectedEmployee?.avatar_url}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: selectedGroup ? 'primary.main' : undefined,
                }}
              >
                {selectedEmployee ? selectedEmployee.getDisplayName?.()[0] : selectedGroup?.name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                  {selectedEmployee ? selectedEmployee.getDisplayName?.() : selectedGroup?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedGroup 
                    ? selectedGroup.description || `${selectedGroup.type} group`
                    : selectedEmployee?.role}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
              display: 'flex',
              flexDirection: 'column-reverse', // Reverse to show new messages at bottom
            }}
          >
            <div ref={messagesEndRef} />
            {(selectedEmployee || selectedGroup) ? (
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
                          message.sender_id === user?.email ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      {message.sender_id !== user?.email && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Avatar
                            src={employees.find(e => e.email === message.sender_id)?.avatar_url}
                            sx={{ width: 24, height: 24 }}
                          >
                            {(() => {
                              const sender = employees.find(e => e.email === message.sender_id);
                              if (message.sender_id === 'ai-assistant') return 'A';
                              if (sender?.getDisplayName) return sender.getDisplayName()[0];
                              return message.sender_id[0];
                            })()}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            {(() => {
                              const sender = employees.find(e => e.email === message.sender_id);
                              if (message.sender_id === 'ai-assistant') return 'AI Assistant';
                              if (sender?.getDisplayName) return sender.getDisplayName();
                              return message.sender_id;
                            })()} 
                          </Typography>
                        </Stack>
                      )}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: message.sender_id === user?.email ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 1,
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            maxWidth: '60%',
                            bgcolor: message.sender_id === user?.email
                              ? 'primary.main'
                              : 'background.paper',
                            color: message.sender_id === user?.email
                              ? 'primary.contrastText'
                              : 'text.primary',
                            borderRadius: 2,
                            borderTopLeftRadius: message.sender_id !== user?.email ? 0 : undefined,
                            borderTopRightRadius: message.sender_id === user?.email ? 0 : undefined,
                          }}
                        >
                          <Typography variant="body2">{message.content}</Typography>
                        </Paper>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary' }}
                        >
                          {new Date(message.created_at).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </AnimatePresence>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <Stack spacing={2} alignItems="center">
                  <ChatIcon sx={{ fontSize: 48, opacity: 0.5 }} />
                  <Typography variant="body1" align="center">
                    Select a chat to start messaging
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>

          {/* Input Area */}
          {(selectedEmployee || selectedGroup) && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <IconButton size="small" onClick={() => {}}>
                  <EmojiIcon />
                </IconButton>
                <IconButton size="small" onClick={() => {}}>
                  <AttachFileIcon />
                </IconButton>
                <InputBase
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder={selectedGroup ? `Message ${selectedGroup.name}...` : `Message ${selectedEmployee?.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  sx={{
                    flex: 1,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    borderRadius: 2,
                    p: 1.5,
                    px: 2,
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
                    '&:hover': {
                      bgcolor: (theme) =>
                        newMessage.trim()
                          ? alpha(theme.palette.primary.main, 0.2)
                          : 'transparent',
                    },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Stack>
            </Paper>
          )}
        </Box>
      </Popover>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        employees={employees}
        currentUser={user?.email || ''}
        onGroupCreated={handleGroupCreated}
      />

      {/* New Message Dialog */}
      <NewMessageDialog
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        employees={employees}
        currentUser={user?.email || ''}
        onSelectEmployee={(employee) => {
          setSelectedEmployee(employee);
          setSelectedGroup(null);
          setMessages([]);
          setNewMessageOpen(false);
        }}
      />
    </>
  );
}
