import React, { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Send as SendIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Circle as CircleIcon,
  Chat as ChatIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ChatNotification from './ChatNotification';
import { supabase, supabaseAdmin } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import CreateGroupDialog from './CreateGroupDialog';
import NewMessageDialog from './NewMessageDialog';

interface Employee {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string;
  department_id: string;
  role: string;
  position?: string;
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
  read: boolean;
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
        // Get all messages to find unique chat participants
        const { data: allMessages } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .or(`sender_id.eq.${user.email},receiver_id.eq.${user.email}`)
          .order('created_at', { ascending: false });

        if (!allMessages) return;

        // Process messages to find unique chats and last messages
        const chatParticipants = new Set<string>();
        const lastMsgs: { [key: string]: { content: string; timestamp: string } } = {};
        const unread: { [key: string]: number } = {};

        allMessages.forEach(msg => {
          const otherParty = msg.sender_id === user.email ? msg.receiver_id : msg.sender_id;
          
          // Skip AI assistant messages for now
          if (otherParty === 'ai-assistant') return;

          // Add to unique participants
          chatParticipants.add(otherParty);

          // Track last message
          if (!lastMsgs[otherParty] || new Date(msg.created_at) > new Date(lastMsgs[otherParty].timestamp)) {
            lastMsgs[otherParty] = {
              content: msg.content,
              timestamp: msg.created_at
            };
          }

          // Track unread messages (messages where user is receiver and haven't been read)
          if (msg.receiver_id === user.email && !msg.read) {
            unread[otherParty] = (unread[otherParty] || 0) + 1;
          }
        });

        // Fetch employee details from Firebase
        const employeesRef = collection(db, 'employees');
        const employeesSnapshot = await getDocs(employeesRef);
        const employeeData = employeesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              getDisplayName: () => {
                if (data.first_name && data.last_name) {
                  return `${data.first_name} ${data.last_name}`;
                }
                return data.email.split('@')[0];
              }
            };
          })
          .filter(emp => chatParticipants.has(emp.email));

        if (employeeData) {
          setEmployees(employeeData);
        }

        let groupData: Group[] = [];
        // Get all groups the user is a member of
        const { data: userGroups } = await supabaseAdmin
          .from('chat_group_members')
          .select('group_id')
          .eq('user_id', user.email);

        if (userGroups?.length) {
          const { data: fetchedGroups } = await supabaseAdmin
            .from('chat_groups')
            .select('*')
            .in('id', userGroups.map(g => g.group_id));

          if (fetchedGroups) {
            groupData = fetchedGroups;
            setGroups(fetchedGroups);
            
            // Add group messages to last messages and unread counts
            fetchedGroups.forEach(group => {
              const groupMessages = allMessages.filter(msg => msg.group_id === group.id);
              if (groupMessages.length > 0) {
                const lastGroupMsg = groupMessages[0];
                lastMsgs[group.id] = {
                  content: lastGroupMsg.content,
                  timestamp: lastGroupMsg.created_at
                };

                // Count unread group messages
                const unreadGroupMsgs = groupMessages.filter(
                  msg => msg.sender_id !== user.email && !msg.read
                ).length;
                if (unreadGroupMsgs > 0) {
                  unread[group.id] = unreadGroupMsgs;
                }
              }
            });
          }
        }

        setLastMessages(lastMsgs);
        setUnreadMessages(unread);

        // Combine and sort active chats
        const activeEmployees = employeeData || [];
        const activeGroups = groupData || [];
        const allChats = [...activeEmployees, ...activeGroups];

        // Sort by last message time and unread count
        allChats.sort((a, b) => {
          const aId = 'email' in a ? a.email : a.id;
          const bId = 'email' in b ? b.email : b.id;

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
  }, [user?.email]);

  // Fetch messages when a chat is selected
  const fetchMessages = async (chatId: string, isGroup: boolean) => {
    try {
      const { data: messages } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .or(
          isGroup 
            ? `group_id.eq.${chatId}`
            : `and(sender_id.eq.${user?.email},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user?.email})`
        )
        .order('created_at', { ascending: true });

      if (messages) {
        setMessages(messages);
        // Mark messages as read
        const unreadMessages = messages.filter(
          msg => msg.receiver_id === user?.email && !msg.read
        );
        if (unreadMessages.length > 0) {
          await supabaseAdmin
            .from('chat_messages')
            .update({ read: true })
            .in('id', unreadMessages.map(msg => msg.id));
          
          // Update unread count
          setUnreadMessages(prev => ({
            ...prev,
            [chatId]: 0
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Update chat selection handlers
  const handleChatSelect = async (chat: Employee | Group) => {
    const isEmployee = 'email' in chat;
    if (isEmployee) {
      setSelectedEmployee(chat);
      setSelectedGroup(null);
      await fetchMessages(chat.email, false);
    } else {
      setSelectedGroup(chat);
      setSelectedEmployee(null);
      await fetchMessages(chat.id, true);
    }
  };

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

  // Update renderChatList to use handleChatSelect
  const renderChatList = () => {
    return activeChats.map((chat) => {
      const isEmployee = 'email' in chat;
      const chatId = isEmployee ? chat.email : chat.id;
      const unreadCount = unreadMessages[chatId] || 0;
      
      return (
        <ListItemButton
          key={chatId}
          selected={
            isEmployee
              ? selectedEmployee?.email === chat.email
              : selectedGroup?.id === chat.id
          }
          onClick={() => handleChatSelect(chat)}
        >
          <ListItemAvatar>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              color={chat.online ? 'success' : 'default'}
            >
              <Avatar src={chat.avatar_url}>
                {isEmployee 
                  ? (chat.first_name?.[0] || chat.email[0]).toUpperCase()
                  : chat.name[0].toUpperCase()
                }
              </Avatar>
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" noWrap>
                  {isEmployee ? chat.getDisplayName?.() : chat.name}
                </Typography>
                {unreadCount > 0 && (
                  <Chip
                    size="small"
                    label={unreadCount}
                    color="primary"
                    sx={{ ml: 1, height: 20, minWidth: 20 }}
                  />
                )}
              </Box>
            }
            secondary={
              <Typography variant="caption" color="text.secondary" noWrap>
                {isEmployee && chat.position}
                {lastMessages[chatId]?.content && (
                  <>
                    {isEmployee && chat.position && ' • '}
                    {lastMessages[chatId].content}
                  </>
                )}
              </Typography>
            }
          />
        </ListItemButton>
      );
    });
  };

  const renderChatHeader = () => {
    if (!selectedEmployee && !selectedGroup) return null;

    const chat = selectedEmployee || selectedGroup;
    const isEmployee = 'email' in chat;

    return (
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          color={chat.online ? 'success' : 'default'}
        >
          <Avatar src={chat.avatar_url}>
            {isEmployee 
              ? (chat.first_name?.[0] || chat.email[0]).toUpperCase()
              : chat.name[0].toUpperCase()
            }
          </Avatar>
        </Badge>
        <Box ml={2}>
          <Typography variant="subtitle1">
            {isEmployee ? chat.getDisplayName?.() : chat.name}
          </Typography>
          {isEmployee && chat.position && (
            <Typography variant="caption" color="text.secondary">
              {chat.position}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const styles = {
    searchInput: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      p: 1,
      display: 'flex',
      alignItems: 'center',
      mb: 2,
      '& .MuiInputBase-root': {
        ml: 1,
        flex: 1,
      },
      '& .MuiInputBase-input': {
        padding: '2px 0',
      },
    },
    chatList: {
      maxHeight: 400,
      overflowY: 'auto',
      '&::-webkit-scrollbar': {
        width: 6,
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: theme.palette.background.paper,
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.divider,
        borderRadius: 3,
      },
    },
    messageArea: {
      flex: 1,
      overflowY: 'auto',
      p: 2,
      '&::-webkit-scrollbar': {
        width: 6,
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: theme.palette.background.paper,
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.divider,
        borderRadius: 3,
      },
    },
    message: {
      backgroundColor: theme.palette.background.paper,
      borderRadius: 1,
      p: 1,
      mb: 1,
      maxWidth: '75%',
      wordBreak: 'break-word',
    },
    sentMessage: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      alignSelf: 'flex-end',
    },
    receivedMessage: {
      backgroundColor: theme.palette.background.default,
      alignSelf: 'flex-start',
    },
    messageInput: {
      p: 2,
      backgroundColor: theme.palette.background.paper,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
    unreadBadge: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      px: 1,
      py: 0.5,
      borderRadius: 1,
      fontSize: '0.7rem',
      flexShrink: 0,
    },
  };

  return (
    <>
      <IconButton
        onClick={() => setAnchorEl(document.body)}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 90, 
          bgcolor: theme.palette.primary.main,
          color: 'white',
          '&:hover': {
            bgcolor: theme.palette.primary.dark,
          },
          boxShadow: 4,
        }}
      >
        <Badge
          badgeContent={Object.values(unreadMessages).reduce((sum, count) => sum + count, 0)}
          color="error"
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { right: -3, top: 3 } }}
        >
          <ChatIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
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
            width: 800,  
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
            <Box sx={styles.searchInput}>
              <SearchIcon color="action" sx={{ mr: 1 }} />
              <InputBase
                placeholder="Search chats..."
                variant="outlined"
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
          </Paper>

          {/* Active Chats List */}
          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              '& .MuiListItemButton-root.active': {
                bgcolor: theme.palette.primary.main,
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
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
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
                  <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
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
            {renderChatList()}
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
              onClick={() => setCreateGroupOpen(true)}
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
          {renderChatHeader()}

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column-reverse', 
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
                              ? theme.palette.primary.main
                              : theme.palette.background.paper,
                            color: message.sender_id === user?.email
                              ? theme.palette.primary.contrastText
                              : theme.palette.text.primary,
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
                bgcolor: theme.palette.background.paper,
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
                    bgcolor: theme.palette.background.paper,
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
                    bgcolor: newMessage.trim()
                      ? theme.palette.primary.main
                      : 'transparent',
                    '&:hover': {
                      bgcolor: newMessage.trim()
                        ? theme.palette.primary.dark
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
        onGroupCreated={(newGroup) => {
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
        }}
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
