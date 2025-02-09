-- Backup existing messages
CREATE TABLE IF NOT EXISTS chat_messages_backup AS
SELECT * FROM chat_messages;

-- Create chat_groups table if not exists
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('department', 'custom')),
    department_id TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_group_members table if not exists
CREATE TABLE IF NOT EXISTS chat_group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Drop and recreate chat_messages table
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create new chat_messages table with group support
CREATE TABLE chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'group')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restore old messages
INSERT INTO chat_messages (id, content, sender_id, receiver_id, created_at, updated_at, message_type, read)
SELECT 
    id, 
    content, 
    sender_id, 
    receiver_id, 
    created_at, 
    updated_at,
    'direct' as message_type,
    CASE 
        WHEN created_at < NOW() - INTERVAL '1 day' THEN TRUE 
        ELSE FALSE 
    END as read
FROM chat_messages_backup;

-- Drop backup table
DROP TABLE chat_messages_backup;

-- Disable RLS since we're using service role
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- Create indexes
DROP INDEX IF EXISTS idx_chat_messages_sender;
DROP INDEX IF EXISTS idx_chat_messages_receiver;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_group;
DROP INDEX IF EXISTS idx_chat_group_members_user;
DROP INDEX IF EXISTS idx_chat_group_members_group;

CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX idx_chat_group_members_group ON chat_group_members(group_id);

-- Enable realtime
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
