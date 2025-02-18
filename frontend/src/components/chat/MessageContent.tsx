import React from 'react';
import { Box, Typography } from '@mui/material';
import parse from 'html-react-parser';

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  return (
    <Box>
      <Typography component="div">
        {parse(content)}
      </Typography>
    </Box>
  );
};

export default MessageContent;