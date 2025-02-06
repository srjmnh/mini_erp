import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as DefaultFileIcon,
  Article as DocumentFileIcon,
  TableChart as SpreadsheetIcon,
} from '@mui/icons-material';
import { useSupabase } from '@/hooks/useSupabase';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  path: string;
  url: string;
}

interface MiniDocumentManagerProps {
  employeeId: string;
}

export default function MiniDocumentManager({ employeeId }: MiniDocumentManagerProps) {
  const { supabase } = useSupabase();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [employeeId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const path = `employees/${employeeId}`;
      
      const { data, error: listError } = await supabase.storage
        .from('documents')
        .list(path);

      if (listError) throw listError;

      const actualFiles = (data || []).filter(file => !file.name.endsWith('.folder'));
      const filesWithUrls = await Promise.all(
        actualFiles.map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(`${path}/${file.name}`);

          return {
            id: file.id || file.name,
            name: file.name,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || 'unknown',
            created_at: file.created_at || new Date().toISOString(),
            path: `${path}/${file.name}`,
            url: publicUrl,
          };
        })
      );

      setFiles(filesWithUrls);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type.includes('pdf')) return <PdfIcon />;
    if (type.includes('word') || type.includes('document')) return <DocumentFileIcon />;
    if (type.includes('sheet') || type.includes('excel')) return <SpreadsheetIcon />;
    return <DefaultFileIcon />;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
        const filePath = `employees/${employeeId}/${file.name}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;
      }
      
      // Refresh the file list
      await fetchFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([path]);

      if (deleteError) throw deleteError;

      // Refresh the file list
      await fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file. Please try again.');
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.path);

      if (error) throw error;

      // Create a download link
      const a = document.createElement('a');
      const url = window.URL.createObjectURL(data);
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', maxHeight: 400, overflow: 'auto' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Employee Documents
        </Typography>
        <Button
          component="label"
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            hidden
            onChange={handleUpload}
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          />
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <List>
        {files.length === 0 ? (
          <ListItem>
            <ListItemText 
              primary="No documents found" 
              secondary="Upload documents to get started"
            />
          </ListItem>
        ) : (
          files.map((file) => (
            <ListItem 
              key={file.id}
              button
              onClick={() => handleDownload(file)}
            >
              <ListItemIcon>
                {getFileIcon(file.type)}
              </ListItemIcon>
              <ListItemText 
                primary={file.name}
                secondary={`${formatFileSize(file.size)} • ${new Date(file.created_at).toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.path);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
}
