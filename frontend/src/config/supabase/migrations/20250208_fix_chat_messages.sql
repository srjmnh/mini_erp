-- Drop existing table and recreate with correct column types
DROP TABLE IF EXISTS chat_messages CASCADE;

CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id TEXT NOT NULL,  -- Changed from UUID to TEXT to support Firebase UIDs
    receiver_id TEXT NOT NULL,  -- TEXT to support both Firebase UIDs and 'ai-assistant'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their messages
CREATE POLICY "Users can read their messages"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid()::text OR 
        receiver_id = auth.uid()::text OR 
        receiver_id = 'ai-assistant'
    );

-- Create policy to allow users to insert messages
CREATE POLICY "Users can insert messages"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()::text OR 
        sender_id = 'ai-assistant'
    );

-- Create indexes for faster queries
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
