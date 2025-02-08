-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    department_id TEXT NOT NULL,  -- Store Firestore department ID as text
    sender_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read messages
-- Note: Department-level security is handled in the application layer
CREATE POLICY "Users can read messages"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow users to insert their own messages
CREATE POLICY "Users can insert their own messages"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_chat_messages_department ON chat_messages(department_id);

-- Enable realtime subscriptions for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
