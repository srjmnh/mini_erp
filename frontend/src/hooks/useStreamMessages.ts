import { useState, useEffect } from 'react';
import { Channel, MessageResponse } from 'stream-chat';

export const useStreamMessages = (channel: Channel | null) => {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channel) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await channel.watch();
        setMessages(response.messages || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    };

    fetchMessages();

    // Listen for new messages
    const handleNewMessage = (event: { message: MessageResponse }) => {
      setMessages((prevMessages) => [...prevMessages, event.message]);
    };

    // Listen for message updates
    const handleMessageUpdated = (event: {
      message: MessageResponse;
    }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === event.message.id ? event.message : msg
        )
      );
    };

    channel.on('message.new', handleNewMessage);
    channel.on('message.updated', handleMessageUpdated);

    return () => {
      channel.off('message.new', handleNewMessage);
      channel.off('message.updated', handleMessageUpdated);
    };
  }, [channel]);

  return { messages, loading };
};
