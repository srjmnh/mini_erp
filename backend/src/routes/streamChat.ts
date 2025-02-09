import express from 'express';
import { StreamChat } from 'stream-chat';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

router.post('/token', async (req, res) => {
  try {
    const { userId, email, name, image } = req.body;
    
    // Create or update the user with admin client
    await serverClient.upsertUser({
      id: userId,
      email,
      name: name || email.split('@')[0],
      image,
    });

    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Error generating token' });
  }
});

router.post('/create-user', async (req, res) => {
  try {
    const { userId, email, name, image } = req.body;
    
    await serverClient.upsertUser({
      id: userId,
      email,
      name: name || email.split('@')[0],
      image,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

export default router;
