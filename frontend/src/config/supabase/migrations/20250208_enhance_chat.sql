-- Create chat groups table
CREATE TABLE chat_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('department', 'custom')), -- department or custom group
    department_id TEXT, -- null for custom groups
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group members table
CREATE TABLE chat_group_members (
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Modify chat_messages to support group chats
ALTER TABLE chat_messages ADD COLUMN group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'group'));

-- Create indexes
CREATE INDEX idx_chat_groups_department ON chat_groups(department_id);
CREATE INDEX idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX idx_group_members_user ON chat_group_members(user_id);

-- Disable RLS for all tables
ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
