-- Drop existing table if it exists
DROP TABLE IF EXISTS files;

-- Create files table with proper structure
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  folder_path VARCHAR(1024) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  type VARCHAR(255),
  size BIGINT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on folder_id for faster lookups
CREATE INDEX files_folder_path_idx ON files(folder_path);
CREATE INDEX files_storage_path_idx ON files(storage_path);

-- Enable RLS and create policies
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY files_select_policy
  ON files FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert access to authenticated users
CREATE POLICY files_insert_policy
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow update access to file creators and admins
CREATE POLICY files_update_policy
  ON files FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow delete access to file creators and admins
CREATE POLICY files_delete_policy
  ON files FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
