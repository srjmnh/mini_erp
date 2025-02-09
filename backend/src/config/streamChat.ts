import { StreamChat } from 'stream-chat';

const streamChat = new StreamChat(
  'dvgdy83wzzx2',
  'qch5rx5kvqnxc4rqffb7mm66v62uhz7p4qtgucbeja7t3y4wyn6c3mrpd29mprq3'
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
      name: name,
      email: email,
      image: image,
      position: position,
    });
  } catch (error) {
    console.error('Error creating Stream user:', error);
    throw error;
  }
};
