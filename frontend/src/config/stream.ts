import { StreamChat } from 'stream-chat';

// Initialize Stream Chat client
const chatClient = StreamChat.getInstance(
  import.meta.env.VITE_STREAM_API_KEY as string
);

export const initializeStreamUser = async (
  userId: string,
  email: string,
  name?: string | null,
  image?: string | null
) => {
  try {
    // Disconnect any existing user first
    if (chatClient.userID) {
      await chatClient.disconnectUser();
    }

    // Get token from backend
    const response = await fetch('http://localhost:3000/api/stream/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        name: name || email.split('@')[0],
        image,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get token');
    }

    const { token } = await response.json();

    // Connect user to Stream
    await chatClient.connectUser(
      {
        id: userId,
        email,
        name: name || email.split('@')[0],
        image,
      },
      token
    );

    return chatClient;
  } catch (error) {
    console.error('Error initializing Stream user:', error);
    throw error;
  }
};

export const disconnectUser = async () => {
  try {
    if (chatClient?.userID) {
      await chatClient.disconnectUser();
    }
  } catch (error) {
    console.error('Error disconnecting user:', error);
  }
};

export { chatClient };
