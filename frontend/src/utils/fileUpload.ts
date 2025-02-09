import { useAuth } from '../contexts/AuthContext';

interface FileUploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const uploadChatFile = async (file: File, userPrefix: string): Promise<FileUploadResult> => {
  const { supabase } = useAuth();

  const timestamp = new Date().getTime();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `chat-attachments/${userPrefix}/${timestamp}_${cleanFileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
};
