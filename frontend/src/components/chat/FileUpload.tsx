import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Paper,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  AttachFile,
  Close,
  Image,
  Description,
  CloudUpload,
} from '@mui/icons-material';
import { chatClient } from '@/config/stream';

interface FileUploadProps {
  onFileUpload: (url: string, fileType: string) => void;
  channelId: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  preview?: string;
}

export default function FileUpload({ onFileUpload, channelId }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      file,
      progress: 0,
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    for (const fileData of newFiles) {
      try {
        const formData = new FormData();
        formData.append('file', fileData.file);

        const response = await chatClient.sendFile(channelId, formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.file === fileData.file ? { ...f, progress } : f
              )
            );
          },
        });

        onFileUpload(response.file, fileData.file.type);

        // Remove the uploaded file from the list
        setUploadingFiles((prev) =>
          prev.filter((f) => f.file !== fileData.file)
        );
      } catch (error) {
        console.error('Error uploading file:', error);
        // Remove the failed file from the list
        setUploadingFiles((prev) =>
          prev.filter((f) => f.file !== fileData.file)
        );
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileToRemove: File) => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.file !== fileToRemove)
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image />;
    }
    return <Description />;
  };

  return (
    <Box>
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        ref={fileInputRef}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      <Tooltip title="Attach File">
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          size="small"
        >
          <AttachFile />
        </IconButton>
      </Tooltip>

      {uploadingFiles.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 1,
            p: 2,
            maxHeight: 300,
            overflow: 'auto',
          }}
          elevation={3}
        >
          <Grid container spacing={2}>
            {uploadingFiles.map((fileData) => (
              <Grid item xs={12} key={fileData.file.name}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  {fileData.preview ? (
                    <Box
                      component="img"
                      src={fileData.preview}
                      sx={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 1,
                      }}
                    />
                  ) : (
                    getFileIcon(fileData.file.type)
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" noWrap>
                      {fileData.file.name}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={fileData.progress}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeFile(fileData.file)}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
