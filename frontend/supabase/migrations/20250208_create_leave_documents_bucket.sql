-- Create a bucket for employee documents including medical certificates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', true);

-- Allow authenticated users to upload medical certificates
CREATE POLICY "Allow authenticated users to upload medical certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'employee-documents' AND 
    (storage.foldername(name))[1] = 'medical-certificates'
);

-- Allow anyone to read medical certificates (since we're using public URLs)
CREATE POLICY "Allow public access to medical certificates"
ON storage.objects FOR SELECT TO anon
USING (
    bucket_id = 'employee-documents' AND 
    (storage.foldername(name))[1] = 'medical-certificates'
);
