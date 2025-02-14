import { supabase } from '@/config/supabase';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'employee-photos';

export class StorageError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}

export const uploadEmployeePhoto = async (file: File, employeeId: string) => {
  try {
    console.log('Starting photo upload process...', { employeeId });

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new StorageError('File size must be less than 5MB');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new StorageError('File must be an image');
    }

    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}/${uuidv4()}.${fileExt}`;

    console.log('Uploading file:', {
      bucket: BUCKET_NAME,
      fileName,
      fileSize: file.size,
      fileType: file.type
    });

    // Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      
      if (uploadError.statusCode === '404' && uploadError.message === 'Bucket not found') {
        throw new StorageError('Storage not properly configured. Please contact support.');
      }
      if (uploadError.statusCode === '401' || uploadError.statusCode === '403') {
        throw new StorageError('Storage permissions error. Please contact support.');
      }
      if (uploadError.statusCode === '400') {
        const message = uploadError.message || 'Failed to upload photo';
        throw new StorageError(`Upload failed: ${message}`);
      }
      throw new StorageError('Failed to upload photo', uploadError);
    }

    console.log('File uploaded successfully:', uploadData);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('Generated public URL:', urlData);

    if (!urlData?.publicUrl) {
      throw new StorageError('Failed to get public URL for uploaded file');
    }

    return urlData.publicUrl;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    console.error('Unexpected error during upload:', error);
    throw new StorageError('Failed to upload photo. Please try again.');
  }
};

export const deleteEmployeePhoto = async (photoUrl: string) => {
  try {
    // Extract the file path from the URL
    const filePath = photoUrl.split(`${BUCKET_NAME}/`)[1];
    
    if (!filePath) {
      throw new StorageError('Invalid photo URL');
    }

    console.log('Attempting to delete file:', {
      bucket: BUCKET_NAME,
      filePath
    });

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Supabase storage error:', error);

      if (error.statusCode === '404') {
        // If the file is already deleted, we can consider this a success
        return;
      }
      if (error.statusCode === '401' || error.statusCode === '403') {
        throw new StorageError('Storage permissions error. Please contact support.');
      }
      throw new StorageError('Failed to delete photo', error);
    }

    console.log('File deleted successfully');
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    console.error('Unexpected error during deletion:', error);
    throw new StorageError('Failed to delete photo. Please try again.');
  }
};

export const uploadCandidateDocument = async (file: File, candidateId: string) => {
  try {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new StorageError('File size must be less than 10MB');
    }

    // Check if file exists
    if (!file) {
      throw new StorageError('No file provided');
    }

    // Log file information for debugging
    console.log('File type:', file.type);
    console.log('File name:', file.name);

    // Get file extension
    const fileExt = file?.name?.split('.')?.pop()?.toLowerCase() || '';
    
    // Create a unique file name with the original extension
    const fileName = `candidates/${candidateId}/${uuidv4()}.${fileExt}`;

    console.log('Uploading candidate document:', {
      bucket: BUCKET_NAME,
      fileName,
      fileSize: file.size,
      fileType: file.type
    });

    // Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new StorageError('Failed to upload document', uploadError);
    }

    if (!uploadData) {
      throw new StorageError('No upload data received');
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      fileName: file.name,
      url: publicUrl,
      path: fileName
    };

  } catch (error) {
    console.error('Error in uploadCandidateDocument:', error);
    throw error instanceof StorageError ? error : new StorageError('Failed to upload document', error);
  }
};

export const uploadChatFile = async (file: File, userId: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `employees/${userId}/chat/${fileName}`;  // Store in employee's folder

    const { data, error } = await supabase.storage
      .from('documents')  // Using the existing documents bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
