-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to photos" ON storage.objects;

-- Create bucket if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('employee-photos', 'employee-photos', true)
    ON CONFLICT (id) DO UPDATE
    SET public = true;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects FOR ALL
USING (
    bucket_id = 'employee-photos'
)
WITH CHECK (
    bucket_id = 'employee-photos'
);
