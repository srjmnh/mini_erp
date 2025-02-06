-- Create documents table for storing metadata
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    description TEXT,
    path TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_documents_path ON documents USING btree(path);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all documents
CREATE POLICY "Documents are viewable by authenticated users" 
    ON documents FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow users to create documents
CREATE POLICY "Users can create documents" 
    ON documents FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to update their own documents
CREATE POLICY "Users can update their own documents" 
    ON documents FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = uploaded_by)
    WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents" 
    ON documents FOR DELETE 
    TO authenticated 
    USING (auth.uid() = uploaded_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();
