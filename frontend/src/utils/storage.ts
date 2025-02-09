import { supabase } from '@/config/supabase';

const BUCKET_NAME = 'documents';

export const uploadReceipt = async (
  file: File, 
  userId: string
): Promise<string> => {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `employees/${userId}/expenses/${fileName}`;  // Store in employee's folder

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      throw new Error('Only images and PDF files are allowed');
    }

    // Upload with upsert enabled
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Enable upsert
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      if (uploadError.message.includes('storage/bucket-not-found')) {
        throw new Error('Storage bucket not found. Please contact support.');
      } else if (uploadError.message.includes('Unauthorized')) {
        throw new Error('Not authorized to upload files. Please check your permissions.');
      } else {
        throw new Error(uploadError.message);
      }
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Receipt upload error:', error);
    if (error instanceof Error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Failed to upload receipt');
  }
};
