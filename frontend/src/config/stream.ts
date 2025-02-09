import { StreamChat } from 'stream-chat';
import axios from 'axios';

// Initialize Stream Chat client
export const chatClient = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

export const initializeStreamUser = async (user: { email: string; name?: string }) => {
  try {
    // Get token from backend
    const response = await axios.post('http://localhost:3000/api/stream/token', {
      userId: user.email.replace('@', '_').replace('.', '_'), // Stream doesn't allow @ in IDs
      name: user.name,
      email: user.email,
    });

    const { token } = response.data;

    // Connect the user
    await chatClient.connectUser(
      {
        id: user.email.replace('@', '_').replace('.', '_'),
        name: user.name || user.email.split('@')[0],
        email: user.email,
      },
      token
    );

    return chatClient;
  } catch (error) {
    console.error('Error connecting to Stream:', error);
    throw error;
  }
};

export const disconnectUser = async () => {
  try {
    await chatClient.disconnectUser();
  } catch (error) {
    console.error('Error disconnecting from Stream:', error);
  }
};
