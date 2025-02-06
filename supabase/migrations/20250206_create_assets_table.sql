-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN ('computer', 'printer', 'phone', 'furniture', 'other')),
    status VARCHAR NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    serial_number VARCHAR,
    purchase_date DATE,
    warranty_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index on department_id for faster queries
CREATE INDEX IF NOT EXISTS idx_assets_department_id ON assets(department_id);

-- Create index on assigned_to for faster queries
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);

-- Add RLS policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are viewable by authenticated users"
    ON assets FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Assets are insertable by authenticated users"
    ON assets FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Assets are updatable by authenticated users"
    ON assets FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Assets are deletable by authenticated users"
    ON assets FOR DELETE
    TO authenticated
    USING (true);
