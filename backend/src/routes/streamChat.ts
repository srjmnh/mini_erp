import express from 'express';
import { generateStreamToken, createStreamUser } from '../config/streamChat';

const router = express.Router();

router.post('/token', async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or update user in Stream
    await createStreamUser(userId, name || email.split('@')[0], email);

    // Generate token
    const token = generateStreamToken(userId);

    res.json({ token });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    res.status(500).json({ error: 'Error generating token' });
  }
});

router.post('/create-chat', async (req, res) => {
  try {
    const { currentUser, otherUser } = req.body;

    if (!currentUser || !otherUser) {
      return res.status(400).json({ error: 'Missing user information' });
    }

    // Create both users
    await createStreamUser(
      currentUser.id,
      currentUser.name,
      currentUser.email,
      currentUser.image,
      currentUser.position
    );

    await createStreamUser(
      otherUser.id,
      otherUser.name,
      otherUser.email,
      otherUser.image,
      otherUser.position
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating chat users:', error);
    res.status(500).json({ error: 'Error creating chat users' });
  }
});

export default router;
