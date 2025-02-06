import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  content: string;
  type: 'system' | 'user' | 'bot';
}

interface ChatContainerProps {
  messages: Message[];
  isProcessing?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ messages, isProcessing = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [processedMessages, setProcessedMessages] = useState<Message[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [processedMessages]);

  useEffect(() => {
    // Process system messages to make them more natural
    const processMessages = async () => {
      const processed = messages.map(msg => {
        if (msg.type === 'system') {
          // Here you can add logic to transform system messages
          // into more natural language
          return {
            ...msg,
            content: simplifySystemMessage(msg.content)
          };
        }
        return msg;
      });
      setProcessedMessages(processed);
    };

    processMessages();
  }, [messages]);

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        maxHeight: 400,
        overflow: 'auto',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {processedMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg.content}
            type={msg.type}
          />
        ))}
        {isProcessing && (
          <ChatMessage
            message="Processing your request..."
            isLoading={true}
          />
        )}
        <div ref={messagesEndRef} />
      </Box>
    </Paper>
  );
};

// Helper function to simplify system messages
const simplifySystemMessage = (message: string): string => {
  // Add your logic here to transform system messages into more natural language
  // This is a simple example - you can make it more sophisticated
  message = message.replace(/Error:/gi, "I encountered an issue:");
  message = message.replace(/Warning:/gi, "Just to let you know:");
  message = message.replace(/Success:/gi, "Great news!");
  message = message.replace(/\b(Exception|Error)\b/gi, "problem");
  
  // Remove technical jargon
  message = message.replace(/\b(undefined|null|NaN)\b/gi, "missing information");
  message = message.replace(/\b(function|method)\b/gi, "operation");
  
  // Make it more conversational
  if (message.includes("failed")) {
    message = "I wasn't able to complete that. " + message;
  }
  
  return message;
};
