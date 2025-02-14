import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Checkbox,
  Typography,
  Chip,
  Box,
  IconButton,
} from '@mui/material';
import {
  Group as GroupIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { StreamChat, Channel } from 'stream-chat';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  position?: string;
}

interface GroupChatDialogProps {
  open: boolean;
  onClose: () => void;
  chatClient: StreamChat | null;
  onChannelCreated: (channel: Channel) => void;
}

export default function GroupChatDialog({ 
  open, 
  onClose, 
  chatClient, 
  onChannelCreated 
}: GroupChatDialogProps) {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!chatClient) {
        console.log('No chat client available');
        return;
      }
      
      try {
        console.log('Fetching users...');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stream/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        console.log('Users response:', users);

        // Filter out the current user and map to our format
        const filteredUsers = users
          .filter((u: any) => u.id !== chatClient.userID)
          .map((u: any) => ({
            id: u.id,
            name: u.name || u.id,
            email: u.email || '',
            photoURL: u.image || '',
            position: u.role || ''
          }));
        
        console.log('Processed users:', filteredUsers);
        setEmployees(filteredUsers);
      } catch (error) {
        console.error('Error fetching employees:', error);
        showSnackbar('Error fetching employees', 'error');
      }
    };

    fetchEmployees();
  }, [chatClient]);

  const handleCreateGroup = async () => {
    if (!chatClient || !user?.email || selectedEmployees.length === 0 || !groupName.trim()) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // Create unique channel ID
      const channelId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize channel with all required data
      const channelData = {
        name: groupName,
        created_by_id: chatClient.userID,
        members: [...selectedEmployees, chatClient.userID],
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`,
      };

      console.log('Creating channel with data:', channelData);
      
      console.log('Creating channel with ID:', channelId);
      // Create a team type channel
      const channel = chatClient.channel('team', channelId, channelData);
      
      try {
        // Create the channel on Stream's servers
        const response = await channel.create();
        console.log('Channel created:', response);
        
        // Add all members to the channel
        const memberResponse = await channel.addMembers([...selectedEmployees, chatClient.userID]);
        console.log('Members added to channel:', memberResponse);

        // Watch the channel to receive real-time updates
        const watchResponse = await channel.watch();
        console.log('Channel watch response:', watchResponse);

        // Send a system message to mark channel creation
        await channel.sendMessage({
          text: `Group ${groupName} created by ${chatClient.user?.name || 'Unknown'}`,
          system: true,
        });

        // Reset form state
        setGroupName('');
        setSelectedEmployees([]);
        setSearchQuery('');

        // Notify success and close dialog
        onChannelCreated(channel);
        showSnackbar('Group chat created successfully', 'success');
        onClose();
      } catch (error) {
        console.error('Error in channel creation process:', error);
        showSnackbar('Error creating group chat. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showSnackbar('Error creating group chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }
      }}
    >
      <DialogTitle sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <GroupIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Create Group Chat
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ 
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Group Name"
          fullWidth
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
        
        <TextField
          margin="dense"
          label="Search Employees"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />

        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            fontWeight: 500
          }}
        >
          <GroupIcon fontSize="small" />
          Selected Members ({selectedEmployees.length})
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: 'action.hover',
          minHeight: '56px'
        }}>
          {selectedEmployees.map(id => {
            const emp = employees.find(e => e.id === id);
            return emp ? (
              <Chip
                key={id}
                label={emp.name}
                onDelete={() => handleToggleEmployee(id)}
                avatar={<Avatar src={emp.photoURL} alt={emp.name}>{emp.name[0]}</Avatar>}
                sx={{ 
                  bgcolor: 'background.paper',
                  borderRadius: '16px',
                  '& .MuiChip-label': {
                    fontWeight: 500,
                  },
                  '& .MuiChip-deleteIcon': {
                    color: 'primary.main',
                    '&:hover': {
                      color: 'error.main',
                    },
                  },
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              />
            ) : null;
          })}
        </Box>

        <List sx={{ 
          maxHeight: 300, 
          overflow: 'auto',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 1,
          '& .MuiListItem-root': {
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          },
        }}>
          {filteredEmployees.map((employee) => (
            <ListItem
              key={employee.id}
              dense
              button
              onClick={() => handleToggleEmployee(employee.id)}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedEmployees.includes(employee.id)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemAvatar>
                <Avatar 
                  src={employee.photoURL} 
                  alt={employee.name}
                  sx={{
                    bgcolor: !employee.photoURL ? `hsl(${employee.name.length * 30}, 70%, 50%)` : undefined
                  }}
                >
                  {employee.name[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={employee.name}
                secondary={employee.email}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ 
        px: 3, 
        py: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 2
      }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          disabled={loading || selectedEmployees.length === 0 || !groupName.trim()}
          startIcon={<GroupIcon />}
        >
          Create Group
        </Button>
      </DialogActions>
    </Dialog>
  );
}
