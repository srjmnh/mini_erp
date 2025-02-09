import { useEffect, useRef } from 'react';
import { Channel } from 'stream-chat';
import debounce from 'lodash/debounce';

export default function useTyping(channel: Channel | null) {
  const isTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!channel) return;

    // Debounced function to stop typing
    const stopTyping = debounce(() => {
      if (isTyping.current) {
        channel.stopTyping();
        isTyping.current = false;
      }
    }, 1000);

    // Function to handle typing
    const handleTyping = () => {
      if (!channel) return;
      if (!isTyping.current) {
        channel.startTyping();
        isTyping.current = true;
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping.current) {
          channel.stopTyping();
          isTyping.current = false;
        }
      }, 3000);
    };

    return () => {
      stopTyping.cancel();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping.current) {
        channel.stopTyping();
        isTyping.current = false;
      }
    };
  }, [channel]);

  const handleTypingEvent = () => {
    if (!channel) return;
    if (!isTyping.current) {
      channel.startTyping();
      isTyping.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping.current) {
        channel.stopTyping();
        isTyping.current = false;
      }
    }, 3000);
  };

  return handleTypingEvent;
}
