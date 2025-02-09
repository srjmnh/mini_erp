import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Popper,
  ClickAwayListener,
  InputBase,
  styled,
} from '@mui/material';
import { chatClient } from '@/config/stream';
import { debounce } from 'lodash';
import { User } from 'stream-chat';
import UserPresence from './UserPresence';

const StyledInput = styled(InputBase)(({ theme }) => ({
  flex: 1,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1),
    fontSize: '0.9rem',
    lineHeight: '1.5',
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 0.8,
    },
  },
}));

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  placeholder?: string;
  channel: any;
}

interface MentionData {
  startPosition: number;
  text: string;
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  channel,
}: MentionInputProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mentionData, setMentionData] = useState<MentionData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!channel || query.length < 1) {
        setUsers([]);
        return;
      }

      try {
        const response = await chatClient.queryUsers(
          {
            id: { $ne: chatClient.userID as string },
            $or: [
              { name: { $autocomplete: query } },
              { id: { $autocomplete: query } },
            ],
          },
          { id: 1 },
          { limit: 10 }
        );
        setUsers(response.users);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      }
    }, 200),
    [channel]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const lastAtSymbol = newValue.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = newValue.slice(lastAtSymbol + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');

      if (spaceAfterAt === -1) {
        setMentionData({
          startPosition: lastAtSymbol,
          text: textAfterAt,
        });
        searchUsers(textAfterAt);
        if (inputRef.current) {
          setAnchorEl(inputRef.current);
        }
      } else if (spaceAfterAt === 0) {
        setMentionData(null);
        setAnchorEl(null);
      }
    } else {
      setMentionData(null);
      setAnchorEl(null);
    }

    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!anchorEl) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter' && users.length > 0) {
      e.preventDefault();
      handleMentionSelect(users[selectedIndex]);
    } else if (e.key === 'Escape') {
      setAnchorEl(null);
      setMentionData(null);
    }
  };

  const handleMentionSelect = (user: User) => {
    if (!mentionData) return;

    const beforeMention = value.slice(0, mentionData.startPosition);
    const afterMention = value.slice(mentionData.startPosition + mentionData.text.length + 1);
    const newValue = `${beforeMention}@${user.id} ${afterMention}`;

    onChange(newValue);
    setAnchorEl(null);
    setMentionData(null);
    setSelectedIndex(0);
  };

  const handleClickAway = () => {
    setAnchorEl(null);
    setMentionData(null);
    setSelectedIndex(0);
  };

  return (
    <Box sx={{ position: 'relative', flex: 1 }}>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 0.5,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          '&:hover': {
            borderColor: 'text.primary',
          },
          '&:focus-within': {
            borderColor: 'primary.main',
            borderWidth: 2,
          },
        }}
      >
        <StyledInput
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          sx={{ flex: 1 }}
        />
      </Paper>

      <Popper
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        placement="top"
        style={{ zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={handleClickAway}>
          <Paper
            elevation={3}
            sx={{
              width: 320,
              maxHeight: 400,
              overflow: 'auto',
              mt: 1,
              mb: 1,
            }}
          >
            <List>
              {users.map((user, index) => (
                <ListItem
                  key={user.id}
                  button
                  selected={index === selectedIndex}
                  onClick={() => handleMentionSelect(user)}
                  sx={{
                    px: 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <UserPresence
                      userId={user.id}
                      imageUrl={user.image}
                      name={user.name || user.id}
                      size="small"
                      showStatus
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name || user.id}
                    secondary={user.id}
                    primaryTypographyProps={{
                      variant: 'subtitle2',
                      sx: { fontWeight: 500 },
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { color: 'text.secondary' },
                    }}
                  />
                </ListItem>
              ))}
              {users.length === 0 && (
                <ListItem sx={{ py: 2 }}>
                  <ListItemText
                    primary="No users found"
                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}
