-- Drop existing objects
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS folders;
DROP TYPE IF EXISTS document_section;

-- Create document section enum
CREATE TYPE document_section AS ENUM ('general', 'department', 'employee');

-- Create folders table
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    section document_section NOT NULL,
    parent_id UUID REFERENCES folders(id),
    department_id UUID REFERENCES departments(id),
    employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_folder_name_per_parent UNIQUE (name, parent_id),
    CONSTRAINT valid_section_department CHECK (
        (section = 'department' AND department_id IS NOT NULL AND employee_id IS NULL) OR
        (section = 'employee' AND employee_id IS NOT NULL AND department_id IS NULL) OR
        (section = 'general' AND department_id IS NULL AND employee_id IS NULL)
    )
);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    section document_section NOT NULL,
    folder_id UUID REFERENCES folders(id),
    department_id UUID REFERENCES departments(id),
    employee_id UUID REFERENCES employees(id),
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_section_department CHECK (
        (section = 'department' AND department_id IS NOT NULL AND employee_id IS NULL) OR
        (section = 'employee' AND employee_id IS NOT NULL AND department_id IS NULL) OR
        (section = 'general' AND department_id IS NULL AND employee_id IS NULL)
    )
);

-- Create trigger to update updated_at timestamp
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

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_department_id ON folders(department_id);
CREATE INDEX idx_folders_employee_id ON folders(employee_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_department_id ON documents(department_id);
CREATE INDEX idx_documents_employee_id ON documents(employee_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
