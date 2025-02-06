import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSupabase } from '@/contexts/SupabaseContext';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/config/supabase';

interface DepartmentDocumentsProps {
  departmentId: string;
  departmentName: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  size: number;
  type: string;
  path: string;
}

export const DepartmentDocuments = ({ departmentId, departmentName }: DepartmentDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { uploadFile } = useSupabase();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Fetching documents for department:', departmentId);

      // List files in the department's folder
      const { data: files, error } = await supabase.storage
        .from('documents')
        .list(`departments/${departmentId}`);

      if (error) {
        throw error;
      }

      console.log('Found files:', files);

      if (!files) {
        setDocuments([]);
        return;
      }

      // Get URLs for all files
      const docs = await Promise.all(files.map(async (file) => {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(`departments/${departmentId}/${file.name}`);

        return {
          id: file.id,
          name: file.name,
          url: urlData.publicUrl,
          createdAt: file.created_at,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || '',
          path: `departments/${departmentId}/${file.name}`
        };
      }));

      console.log('Processed documents:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!departmentId) return;
    fetchDocuments();

    // Set up real-time subscription for changes
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'storage',
          table: 'objects',
          filter: `path=like.departments/${departmentId}/%`
        },
        () => {
          console.log('Document change detected, refreshing...');
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [departmentId]);

  const handleUpload = async (file: File) => {
    try {
      const path = `departments/${departmentId}`;
      const url = await uploadFile(file, 'documents', path);
      await fetchDocuments(); // Refresh the list after upload
      setUploadOpen(false);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocumentIcon /> Documents
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadOpen(true)}
          size="small"
        >
          Upload Document
        </Button>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 4,
            bgcolor: 'action.hover',
            borderRadius: 1
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some documents to get started
          </Typography>
        </Box>
      ) : (
        <List sx={{ 
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          {documents.map((doc, index) => (
            <React.Fragment key={doc.id}>
              {index > 0 && <Divider />}
              <ListItem 
                sx={{ 
                  py: 2,
                  px: 3,
                  '&:hover': { 
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>
                  <DocumentIcon color="primary" sx={{ fontSize: 28 }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                      {doc.name}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={2} alignItems="center" color="text.secondary">
                      <Typography variant="caption" sx={{ 
                        bgcolor: 'action.hover',
                        px: 1,
                        py: 0.5,
                        borderRadius: 0.5,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        {formatFileSize(doc.size)}
                      </Typography>
                      <Typography variant="caption">
                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                  }
                  sx={{ my: 0 }}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="download" 
                    href={doc.url} 
                    target="_blank"
                    sx={{ 
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.lighter',
                      }
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Upload Dialog */}
      <Dialog 
        open={uploadOpen} 
        onClose={() => setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <UploadIcon color="primary" />
            <Typography>Upload Document</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box
            component="label"
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              style={{ display: 'none' }}
            />
            <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Drag and drop a file here, or click to select
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
