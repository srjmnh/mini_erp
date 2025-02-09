import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  user: any;
  chatClient: any;
  setCurrentUserStatus: (status: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [currentUserStatus, setCurrentUserStatus] = useState(null);

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

  useEffect(() => {
    const initializeChat = async () => {
      if (!user) {
        if (chatClient) {
          await chatClient.disconnectUser();
          setChatClient(null);
        }
        return;
      }

      try {
        console.log('Initializing chat for user:', user.uid);
        const client = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);
        
        // Get token from backend
        const response = await fetch('http://localhost:3000/api/stream/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            organization: user.organization
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to get Stream token');
        }

        const { token } = await response.json();
        console.log('Received token from backend');
        
        // Connect user with server token
        await client.connectUser(
          {
            id: user.uid,
            name: user.displayName || user.email || 'Anonymous',
            image: user.photoURL || undefined,
            organization: user.organization
          },
          token
        );

        console.log('Connected to Stream chat');
        setChatClient(client);
        setCurrentUserStatus('online');
      } catch (error) {
        console.error('Error connecting to Stream:', error);
        setChatClient(null);
      }
    };

    initializeChat();

    return () => {
      const cleanup = async () => {
        if (chatClient) {
          await chatClient.disconnectUser();
          setChatClient(null);
        }
      };
      cleanup();
    };
  }, [user]);

  const value = {
    messages,
    isProcessing,
    addMessage,
    setProcessing: setIsProcessing,
    clearMessages,
    user,
    chatClient,
    setCurrentUserStatus,
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
