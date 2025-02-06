-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(1024) NOT NULL,
  folder_path TEXT NOT NULL,
  type VARCHAR(1024),
  size BIGINT,
  storage_path TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on folder_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_folder_path ON files(folder_path);

-- Create index on created_by for user-specific queries
CREATE INDEX IF NOT EXISTS idx_files_created_by ON files(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  -- Check if trigger exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_files_timestamp') THEN
    CREATE TRIGGER update_files_timestamp
      BEFORE UPDATE ON files
      FOR EACH ROW
      EXECUTE FUNCTION update_files_updated_at();
  END IF;
END $$;

-- Create RLS policies
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON files;
DROP POLICY IF EXISTS "Enable insert access for all users" ON files;
DROP POLICY IF EXISTS "Enable update access for all users" ON files;
DROP POLICY IF EXISTS "Enable delete access for all users" ON files;

-- Create new policies that allow all operations
CREATE POLICY "Enable read access for all users"
ON files FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON files FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
ON files FOR UPDATE
USING (true);

CREATE POLICY "Enable delete access for all users"
ON files FOR DELETE
USING (true);
