import React, { createContext, useContext, useState, useCallback } from 'react';

interface Message {
  id: string;
  content: string;
  type: 'system' | 'user' | 'bot';
}

interface ChatContextType {
  messages: Message[];
  isProcessing: boolean;
  addMessage: (content: string, type: Message['type']) => void;
  setProcessing: (processing: boolean) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addMessage = useCallback((content: string, type: Message['type']) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
    };
    
    // If it's a system message, send it to the chatbot for interpretation
    if (type === 'system') {
      const event = new CustomEvent('system-message', { detail: content });
      window.dispatchEvent(event);
    }
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value = {
    messages,
    isProcessing,
    addMessage,
    setProcessing: setIsProcessing,
    clearMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
