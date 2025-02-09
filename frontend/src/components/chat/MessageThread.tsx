import React, { useState, useEffect } from 'react';
import { Box, Typography, Divider, TextField, IconButton } from '@mui/material';
import { MessageResponse } from 'stream-chat';
import Message from './Message';
import SendIcon from '@mui/icons-material/Send';
import { chatClient } from '@/config/stream';

interface MessageThreadProps {
  parentMessage: MessageResponse;
  onClose: () => void;
}

export default function MessageThread({ parentMessage, onClose }: MessageThreadProps) {
  const [replies, setReplies] = useState<MessageResponse[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadReplies = async () => {
      if (!parentMessage.id) return;

      try {
        setLoading(true);
        const response = await chatClient.getReplies(parentMessage.id);
        setReplies(response.messages);
      } catch (error) {
        console.error('Error loading replies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplies();
  }, [parentMessage.id]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !parentMessage.cid) return;

    try {
      const channel = chatClient.channel('messaging', parentMessage.cid);
      await channel.sendMessage({
        text: replyText,
        parent_id: parentMessage.id,
      });
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Thread Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Thread
        </Typography>
      </Box>

      {/* Parent Message */}
      <Box sx={{ p: 2 }}>
        <Message message={parentMessage} isThreaded />
      </Box>

      <Divider />

      {/* Replies */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {loading ? (
          <Typography variant="body2" color="text.secondary" align="center">
            Loading replies...
          </Typography>
        ) : replies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center">
            No replies yet
          </Typography>
        ) : (
          replies.map((reply) => (
            <Message
              key={reply.id}
              message={reply}
              isThreaded
            />
          ))
        )}
      </Box>

      {/* Reply Input */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          placeholder="Reply in thread..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          multiline
          maxRows={4}
          size="small"
        />
        <IconButton
          color="primary"
          onClick={handleSendReply}
          disabled={!replyText.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
