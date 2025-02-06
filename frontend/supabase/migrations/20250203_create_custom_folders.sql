-- Create custom folders table
CREATE TABLE IF NOT EXISTS custom_folders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    parent_id UUID REFERENCES custom_folders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_custom_folders_path ON custom_folders USING btree(path);
CREATE INDEX IF NOT EXISTS idx_custom_folders_created_by ON custom_folders(created_by);

-- Enable RLS
ALTER TABLE custom_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Folders are viewable by authenticated users" ON custom_folders;
DROP POLICY IF EXISTS "Users can create folders" ON custom_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON custom_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON custom_folders;

-- Allow authenticated users to view all folders
CREATE POLICY "Folders are viewable by authenticated users" 
    ON custom_folders FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow authenticated users to create folders
CREATE POLICY "Users can create folders" 
    ON custom_folders FOR INSERT 
    TO authenticated 
    WITH CHECK (created_by IS NOT NULL);

-- Allow users to update their own folders
CREATE POLICY "Users can update their own folders" 
    ON custom_folders FOR UPDATE 
    TO authenticated 
    USING (created_by = auth.uid());

-- Allow users to delete their own folders
CREATE POLICY "Users can delete their own folders" 
    ON custom_folders FOR DELETE 
    TO authenticated 
    USING (created_by = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_custom_folders_updated_at ON custom_folders;
CREATE TRIGGER update_custom_folders_updated_at
    BEFORE UPDATE ON custom_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create employee_skills table
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create employee_equipment table
CREATE TABLE IF NOT EXISTS employee_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL,
    serial_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create employee_onboarding table
CREATE TABLE IF NOT EXISTS employee_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    completed_date TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_equipment_employee_id ON employee_equipment(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_employee_id ON employee_onboarding(employee_id);

-- Add RLS policies
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON employee_skills
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users" ON employee_skills
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON employee_equipment
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users" ON employee_equipment
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON employee_onboarding
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users" ON employee_onboarding
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
