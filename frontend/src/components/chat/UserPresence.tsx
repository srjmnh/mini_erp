import React, { useState, useEffect } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  TextField,
  IconButton,
  Tooltip,
  keyframes,
} from '@mui/material';
import {
  CheckCircle,
  DoNotDisturb,
  Timer,
  Clear,
  Edit,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { chatClient } from '@/config/stream';
import { useAuth } from '@/contexts/AuthContext';

interface UserPresenceProps {
  userId: string;
  name: string;
  imageUrl?: string;
  status?: string;
  showStatus?: boolean;
  showCustomStatus?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'online':
      return '#44b700';
    case 'away':
      return '#ffa726';
    case 'busy':
      return '#ef5350';
    case 'offline':
    default:
      return '#bdbdbd';
  }
};

const getSizeProps = (size?: string) => {
  switch (size) {
    case 'small':
      return { width: 32, height: 32, fontSize: '1rem' };
    case 'large':
      return { width: 56, height: 56, fontSize: '1.5rem' };
    default:
      return { width: 40, height: 40, fontSize: '1.25rem' };
  }
};

const pulseAnimation = keyframes`
  0% {
    transform: scale(.95);
    box-shadow: 0 0 0 0 rgba(68, 183, 0, 0.3);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(68, 183, 0, 0);
  }
  100% {
    transform: scale(.95);
    box-shadow: 0 0 0 0 rgba(68, 183, 0, 0);
  }
`;

const StyledBadgeStatus = styled(Badge)(({ theme, status }: { theme: any; status: string }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: status === 'online' 
      ? '#44b700'
      : status === 'busy'
      ? '#ff3d00'
      : status === 'away'
      ? '#ffa000'
      : '#bdbdbd',
    color: status === 'online'
      ? '#44b700'
      : status === 'busy'
      ? '#ff3d00'
      : status === 'away'
      ? '#ffa000'
      : '#bdbdbd',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: status === 'online' ? `${pulseAnimation} 2s infinite` : 'none',
      border: '1px solid currentColor',
      content: '""',
    },
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
}));

const UserPresence: React.FC<UserPresenceProps> = ({
  userId,
  name,
  imageUrl,
  status,
  showStatus = false,
  showCustomStatus = false,
  size = 'medium',
}) => {
  const [customStatus, setCustomStatus] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newCustomStatus, setNewCustomStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useAuth();
  const isCurrentUser = user?.id === userId;

  const [statusState, setStatus] = useState(status);
  const sizeProps = getSizeProps(size);
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!chatClient || !userId) return;

    const handleUserPresence = (event: any) => {
      if (event.user.id === userId) {
        setStatus(event.type === 'user.online' ? 'online' : 'offline');
      }
    };

    // Only query status for the current user
    if (user?.id === userId) {
      chatClient.queryUsers({ id: userId }).then(response => {
        const queriedUser = response.users[0];
        if (queriedUser) {
          setStatus(queriedUser.online ? 'online' : queriedUser.status || 'offline');
          setCustomStatus(queriedUser.custom_status || '');
        }
      });

      chatClient.on('user.presence.changed', handleUserPresence);
      
      return () => {
        chatClient.off('user.presence.changed', handleUserPresence);
      };
    } else {
      // For other users, just use the initial status
      setStatus(status);
    }
  }, [userId, user?.id]);

  const avatar = (
    <Avatar
      src={imageUrl}
      sx={{
        ...sizeProps,
        bgcolor: !imageUrl ? `hsl(${userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)` : undefined,
      }}
    >
      {!imageUrl && initials}
    </Avatar>
  );

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isCurrentUser) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!chatClient) return;
    
    try {
      await chatClient.partialUpdateUser({
        id: userId,
        set: {
          status: newStatus,
        },
      });
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setAnchorEl(null);
  };

  const handleCustomStatusSave = async () => {
    if (!chatClient) return;
    
    try {
      await chatClient.partialUpdateUser({
        id: userId,
        set: {
          custom_status: newCustomStatus,
        },
      });
      setCustomStatus(newCustomStatus);
      setEditingStatus(false);
    } catch (error) {
      console.error('Failed to update custom status:', error);
    }
  };

  if (!showStatus) {
    return avatar;
  }

  const statusColor = getStatusColor(statusState);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: statusColor,
            color: statusColor,
            boxShadow: '0 0 0 2px white',
            '&::after': {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '1px solid currentColor',
              content: '""',
            },
          },
        }}
      >
        {avatar}
      </Badge>

      {showCustomStatus && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {name}
          </Typography>
          {editingStatus ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <TextField
                size="small"
                value={newCustomStatus}
                onChange={(e) => setNewCustomStatus(e.target.value)}
                placeholder="Set a status"
                variant="outlined"
                sx={{ minWidth: 200 }}
              />
              <IconButton size="small" onClick={handleCustomStatusSave} color="primary">
                <CheckCircle fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setEditingStatus(false)}>
                <Clear fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {customStatus || (isCurrentUser ? 'Set a status' : '')}
              </Typography>
              {isCurrentUser && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setNewCustomStatus(customStatus);
                    setEditingStatus(true);
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={() => handleStatusChange('online')}>
          <ListItemIcon>
            <CheckCircle fontSize="small" sx={{ color: '#44b700' }} />
          </ListItemIcon>
          Online
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('busy')}>
          <ListItemIcon>
            <DoNotDisturb fontSize="small" sx={{ color: '#ff3d00' }} />
          </ListItemIcon>
          Busy
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('away')}>
          <ListItemIcon>
            <Timer fontSize="small" sx={{ color: '#ffa000' }} />
          </ListItemIcon>
          Away
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserPresence;
