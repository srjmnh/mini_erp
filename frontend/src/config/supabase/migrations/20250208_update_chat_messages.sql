-- Add receiver_id column
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS receiver_id TEXT NOT NULL;

-- Add index for faster queries on receiver_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);

-- Update policies to include receiver_id checks
DROP POLICY IF EXISTS "Users can read messages" ON chat_messages;
CREATE POLICY "Users can read their messages"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid()::text OR 
        receiver_id = 'ai-assistant'
    );

-- Update insert policy
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
CREATE POLICY "Users can insert messages"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() OR 
        sender_id::text = 'ai-assistant'
    );
