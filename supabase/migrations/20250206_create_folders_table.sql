-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  type VARCHAR(50) NOT NULL,
  parent_path VARCHAR(1024),
  department_id UUID,
  employee_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints after table creation
ALTER TABLE folders
  ADD CONSTRAINT folders_path_unique UNIQUE (path),
  ADD CONSTRAINT folders_type_check CHECK (type IN ('custom', 'department', 'employee')),
  ADD CONSTRAINT folders_parent_path_fkey FOREIGN KEY (parent_path) REFERENCES folders(path) ON DELETE CASCADE,
  ADD CONSTRAINT folders_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  ADD CONSTRAINT folders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  ADD CONSTRAINT folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  ADD CONSTRAINT folders_valid_parent_path CHECK (
    (type = 'custom' AND (parent_path IS NULL OR parent_path LIKE 'custom/%')) OR
    (type = 'department' AND (parent_path IS NULL OR parent_path LIKE 'departments/%')) OR
    (type = 'employee' AND (parent_path IS NULL OR parent_path LIKE 'employees/%'))
  ),
  ADD CONSTRAINT folders_valid_department CHECK (
    (type = 'department' AND department_id IS NOT NULL AND employee_id IS NULL) OR
    (type != 'department' AND department_id IS NULL)
  ),
  ADD CONSTRAINT folders_valid_employee CHECK (
    (type = 'employee' AND employee_id IS NOT NULL AND department_id IS NULL) OR
    (type != 'employee' AND employee_id IS NULL)
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on path for faster lookups
CREATE INDEX folders_path_idx ON folders(path);
CREATE INDEX folders_parent_path_idx ON folders(parent_path);
CREATE INDEX folders_type_idx ON folders(type);

-- Enable RLS and create policies
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY folders_select_policy
  ON folders FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert access to authenticated users
CREATE POLICY folders_insert_policy
  ON folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow update access to folder creators and admins
CREATE POLICY folders_update_policy
  ON folders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow delete access to folder creators and admins
CREATE POLICY folders_delete_policy
  ON folders FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
