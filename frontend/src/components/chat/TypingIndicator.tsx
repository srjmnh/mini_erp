import React, { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { Channel, Event, UserResponse } from 'stream-chat';
import { chatClient } from '@/config/stream';

interface TypingIndicatorProps {
  channel: Channel | null;
}

const dotAnimation = keyframes`
  0%, 20% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
  80%, 100% {
    transform: translateY(0);
  }
`;

export default function TypingIndicator({ channel }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<UserResponse[]>([]);

  useEffect(() => {
    if (!channel) return;

    const handleTypingStart = (event: Event) => {
      const user = event.user;
      if (!user || user.id === chatClient.userID) return;

      setTypingUsers(prev => {
        if (prev.some(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    };

    const handleTypingStop = (event: Event) => {
      const user = event.user;
      if (!user) return;

      setTypingUsers(prev => prev.filter(u => u.id !== user.id));
    };

    channel.on('typing.start', handleTypingStart);
    channel.on('typing.stop', handleTypingStop);

    // Clean up stale typing indicators after 7 seconds
    const cleanup = setInterval(() => {
      setTypingUsers(prev => {
        const now = new Date().getTime();
        return prev.filter(user => {
          const lastTyping = channel.state.typing[user.id]?.received_at;
          return lastTyping && now - lastTyping.getTime() < 7000;
        });
      });
    }, 1000);

    return () => {
      channel.off('typing.start', handleTypingStart);
      channel.off('typing.stop', handleTypingStop);
      clearInterval(cleanup);
    };
  }, [channel]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name || 'Someone'} is typing`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name || 'Someone'} and ${
        typingUsers[1].name || 'someone'
      } are typing`;
    }
    return 'Several people are typing';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {[0, 1, 2].map(i => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: `${dotAnimation} 1.4s infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontStyle: 'italic',
        }}
      >
        {getTypingText()}
      </Typography>
    </Box>
  );
}
