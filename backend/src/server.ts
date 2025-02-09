import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import streamChatRoutes from './routes/streamChat';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/stream', streamChatRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
