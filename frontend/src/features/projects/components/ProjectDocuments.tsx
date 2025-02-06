import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as DefaultFileIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { LoadingButton } from '@mui/lab';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  storage_path: string;
  created_at: string;
}

const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon />;
  if (type === 'application/pdf') return <PdfIcon />;
  return <DefaultFileIcon />;
};

interface ProjectDocumentsProps {
  projectId: string;
}

export default function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { supabase } = useSupabase();
  const { showSnackbar } = useSnackbar();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data: files, error } = await supabase
        .from('files')
        .select('*')
        .eq('folder_path', `projects/${projectId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      showSnackbar('Failed to fetch files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `projects/${projectId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(percent);
          },
        });

      if (uploadError) throw uploadError;

      // Add file record to database
      const { error: dbError } = await supabase.from('files').insert({
        name: file.name,
        type: file.type,
        size: file.size,
        folder_path: `projects/${projectId}`,
        storage_path: filePath,
      });

      if (dbError) throw dbError;

      showSnackbar('File uploaded successfully', 'success');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      showSnackbar('Failed to upload file', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      showSnackbar('Failed to download file', 'error');
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      showSnackbar('File deleted successfully', 'success');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      showSnackbar('Failed to delete file', 'error');
    }
    setSelectedFile(null);
    setAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Project Documents</Typography>
        <Button
          component="label"
          variant="contained"
          startIcon={<UploadIcon />}
          disabled={uploading}
        >
          Upload File
          <input
            type="file"
            hidden
            onChange={handleUpload}
            onClick={(e) => (e.currentTarget.value = '')}
          />
        </Button>
      </Box>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" color="text.secondary">
            Uploading... {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getFileIcon(file.type)}
                    <Typography variant="subtitle1" sx={{ ml: 1, flexGrow: 1 }} noWrap>
                      {file.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedFile(file);
                        setAnchorEl(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Size: {formatFileSize(file.size)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded: {new Date(file.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setSelectedFile(null);
          setAnchorEl(null);
        }}
      >
        <MenuItem onClick={() => selectedFile && handleDownload(selectedFile)}>
          <DownloadIcon sx={{ mr: 1 }} /> Download
        </MenuItem>
        <MenuItem onClick={() => selectedFile && handleDelete(selectedFile)}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
