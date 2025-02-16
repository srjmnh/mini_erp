import express from 'express';
import { StreamChat } from 'stream-chat';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error('Stream API key and secret must be defined');
}

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

// Generate Stream token
router.post('/token', async (req, res) => {
  try {
    const { userId, email, name, image } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' });
    }

    console.log('Generating token for user:', { userId, email, name });
    
    // Create or update user
    await serverClient.upsertUser({
      id: userId,
      email,
      name: name || email.split('@')[0],
      image,
    });

    // Generate token
    const token = serverClient.createToken(userId);
    console.log('Token generated successfully');

    res.json({ token });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Create chat
router.post('/create-chat', async (req, res) => {
  try {
    const { currentUser, otherUser } = req.body;
    console.log('Create chat request:', { currentUser, otherUser });

    // Validate required fields
    if (!currentUser?.id || !otherUser?.id || !currentUser?.email || !otherUser?.email) {
      return res.status(400).json({ error: 'Both users must have id and email' });
    }

    // Create users if they don't exist
    await serverClient.upsertUsers([
      {
        id: currentUser.id,
        name: currentUser.name || currentUser.email.split('@')[0],
        email: currentUser.email,
        image: currentUser.image,
      },
      {
        id: otherUser.id,
        name: otherUser.name || otherUser.email.split('@')[0],
        email: otherUser.email,
        image: otherUser.image,
      },
    ]);

    // Create unique channel ID using sorted IDs
    const sortedIds = [currentUser.id, otherUser.id].sort();
    const channelId = `chat_${sortedIds[0]}_${sortedIds[1]}`;

    // Create the channel
    const channel = serverClient.channel('messaging', channelId, {
      members: [currentUser.id, otherUser.id],
      created_by: {
        id: currentUser.id,
        name: currentUser.name || currentUser.email.split('@')[0],
        image: currentUser.image
      },
      data: {
        config: {
          commands: ['giphy']
        }
      }
    });

    await channel.create();
    console.log('Channel created:', channelId);
    
    res.json({ success: true, channelId });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

export default router;
