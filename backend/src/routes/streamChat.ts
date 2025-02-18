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

router.get('/users', async (req, res) => {
  try {
    const response = await serverClient.queryUsers(
      {}, 
      { last_active: -1 }, 
      { limit: 50 }
    );
    res.json(response.users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Task creation endpoint
router.post('/tasks/create', async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      assignee,
      assignedBy,
      status,
      type,
      chatId
    } = req.body;

    // Validate required fields
    if (!title || !dueDate || !assignee || !assignedBy) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // Create task in your database
    const task = {
      id: Date.now().toString(),
      title,
      description,
      dueDate,
      priority,
      assignee,
      assignedBy,
      status,
      type,
      chatId,
      createdAt: new Date().toISOString()
    };

    // Here you would typically save the task to your database
    // For now, we'll just return the task object
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      message: 'Failed to create task'
    });
  }
});

export default router;
