import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Tooltip,
  Badge,
  Drawer,
  useTheme,
  Divider,
} from '@mui/material';
import {
  TagOutlined,
  LockOutlined,
  SettingsOutlined,
  AddCircleOutline,
  MoreVert,
  Search,
} from '@mui/icons-material';
import { Channel } from 'stream-chat';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, isPrivate: boolean) => void;
}

const CreateChannelDialog = ({
  open,
  onClose,
  onCreateChannel,
}: CreateChannelDialogProps) => {
  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (channelName.trim()) {
      onCreateChannel(channelName.trim(), isPrivate);
      setChannelName('');
      setIsPrivate(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Channel</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Channel Name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. marketing"
            sx={{ mb: 2 }}
          />
          <Button
            variant={isPrivate ? 'contained' : 'outlined'}
            startIcon={<LockOutlined />}
            onClick={() => setIsPrivate(!isPrivate)}
            sx={{ mb: 2 }}
          >
            {isPrivate ? 'Private Channel' : 'Public Channel'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {isPrivate
              ? 'Private channels are only visible to their members'
              : 'Public channels can be joined by anyone'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!channelName.trim()}
        >
          Create Channel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function ChannelList() {
  const theme = useTheme();
  const { user } = useAuth();
  const { client: chatClient, channels, setActiveChannel } = useChat();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('Channels updated:', channels);
  }, [channels]);

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel);
  };

  const handleCreateChannel = async (name: string, isPrivate: boolean) => {
    if (!chatClient || !user?.email) return;

    try {
      const channel = chatClient.channel('messaging', {
        name,
        members: [user.email.replace(/[.@]/g, '_')],
        private: isPrivate,
      });
      await channel.create();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, channel: Channel) => {
    setAnchorEl(event.currentTarget);
    setSelectedChannel(channel);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChannel(null);
  };

  const handleLeaveChannel = async () => {
    if (!selectedChannel || !user?.email) return;

    try {
      await selectedChannel.removeMembers([user.email.replace(/[.@]/g, '_')]);
      handleMenuClose();
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const filteredChannels = channels.filter((channel) =>
    channel.data?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    // Sort by unread count first
    const unreadDiff = (b.state.unreadCount || 0) - (a.state.unreadCount || 0);
    if (unreadDiff !== 0) return unreadDiff;
    
    // Then by last message time
    const aTime = a.state.last_message_at;
    const bTime = b.state.last_message_at;
    if (!aTime || !bTime) return 0;
    return bTime.getTime() - aTime.getTime();
  });

  return (
    <Box sx={{
      width: 280,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper',
      borderRight: 1,
      borderColor: 'divider',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.palette.primary.main,
          color: 'white',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Chats</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="New Chat">
            <IconButton
              size="small"
              onClick={() => setCreateDialogOpen(true)}
              sx={{ color: 'white' }}
            >
              <AddCircleOutline />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              bgcolor: theme.palette.grey[100],
              '&:hover': {
                bgcolor: theme.palette.grey[200],
              },
              '& fieldset': {
                border: 'none',
              },
            },
          }}
        />
      </Box>

      {/* Channel List */}
      <List sx={{ 
        flex: 1, 
        overflow: 'auto',
        px: 1.5,
        py: 1,
        '& .MuiListItem-root': {
          borderRadius: 2,
          mb: 0.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: theme.palette.grey[100],
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            bgcolor: theme.palette.primary.soft,
            '&:hover': {
              bgcolor: theme.palette.primary.soft,
            },
          },
        },
      }}>
        {sortedChannels.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center', 
            color: 'text.secondary',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Box sx={{ 
              p: 2, 
              bgcolor: theme.palette.grey[50], 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                No chats yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a new conversation
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddCircleOutline />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 1 }}
              >
                New Chat
              </Button>
            </Box>
          </Box>
        ) : (
          sortedChannels.map((channel) => (
          <ListItem
            key={channel.cid}
            button
            onClick={() => handleChannelClick(channel)}
            sx={{
              borderRadius: 2,
              mb: 1,
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              '&:hover': {
                bgcolor: theme.palette.grey[50],
                transform: 'translateX(4px)',
              },
            }}
          >
            <ListItemAvatar>
              <Avatar
                src={channel.data?.image}
                sx={{
                  bgcolor: !channel.data?.image
                    ? `hsl(${(channel.data?.name || '').length * 30}, 70%, 50%)`
                    : undefined
                }}
              >
                {(channel.data?.name || '')[0]?.toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: channel.state.unreadCount ? 600 : 500,
                      color: channel.state.unreadCount ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {channel.data?.name || 'Unnamed Chat'}
                  </Typography>
                  {channel.state.unreadCount > 0 && (
                    <Badge
                      badgeContent={channel.state.unreadCount}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.7rem',
                          height: '16px',
                          minWidth: '16px',
                        },
                      }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {channel.state.last_message?.text || 'No messages yet'}
                  </Typography>
                  {channel.state.last_message_at && (
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {new Date(channel.state.last_message_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  )}
                </Box>
              }
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e, channel);
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {/* Channel Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {}}>
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>
          Channel Settings
        </MenuItem>
        <MenuItem onClick={handleLeaveChannel} sx={{ color: 'error.main' }}>
          Leave Channel
        </MenuItem>
      </Menu>

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </Box>
  );
}
