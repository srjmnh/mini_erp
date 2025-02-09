import { StreamChat } from 'stream-chat';

if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
  throw new Error('Stream Chat API key and secret are required');
}

const streamChat = new StreamChat(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

export const generateStreamToken = (userId: string) => {
  return streamChat.createToken(userId);
};

export const createStreamUser = async (
  userId: string,
  name: string,
  email: string,
  image?: string,
  position?: string
) => {
  try {
    await streamChat.upsertUser({
      id: userId,
      name,
      email,
      image,
      role: position || 'user',
    });
  } catch (error) {
    console.error('Error creating Stream user:', error);
    throw error;
  }
};
