-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure to initialize document tables
CREATE OR REPLACE FUNCTION init_document_tables()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    trigger_exists boolean;
BEGIN
    -- Create enum for document sections if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_section') THEN
        CREATE TYPE document_section AS ENUM ('general', 'department', 'employee');
    END IF;

    -- Create folders table if it doesn't exist
    CREATE TABLE IF NOT EXISTS folders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        section document_section NOT NULL,
        parent_id UUID REFERENCES folders(id),
        department_id VARCHAR(255),
        employee_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Create documents table if it doesn't exist
    CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        folder_id UUID REFERENCES folders(id),
        section document_section NOT NULL,
        department_id VARCHAR(255),
        employee_id VARCHAR(255),
        file_path TEXT NOT NULL,
        file_type VARCHAR(50),
        file_size BIGINT,
        uploaded_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );

    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS idx_folders_section ON folders(section);
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_folders_department_id ON folders(department_id);
    CREATE INDEX IF NOT EXISTS idx_folders_employee_id ON folders(employee_id);

    CREATE INDEX IF NOT EXISTS idx_documents_section ON documents(section);
    CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);
    CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);

    -- Check if triggers exist
    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_folders'
    ) INTO trigger_exists;

    -- Create triggers if they don't exist
    IF NOT trigger_exists THEN
        CREATE TRIGGER set_updated_at_folders
            BEFORE UPDATE ON folders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_documents'
    ) INTO trigger_exists;

    IF NOT trigger_exists THEN
        CREATE TRIGGER set_updated_at_documents
            BEFORE UPDATE ON documents
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;
