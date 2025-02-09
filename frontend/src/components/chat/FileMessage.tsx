import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Link,
} from '@mui/material';
import {
  Description as FileIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface FileMessageProps {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isOwnMessage: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FileMessage({ fileName, fileUrl, fileType, fileSize, isOwnMessage }: FileMessageProps) {
  const isImage = fileType.startsWith('image/');

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Paper
        sx={{
          p: 1,
          backgroundColor: isOwnMessage ? 'primary.main' : 'grey.100',
          color: isOwnMessage ? 'white' : 'inherit',
          maxWidth: '70%',
        }}
      >
        {isImage ? (
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={fileUrl}
              alt={fileName}
              sx={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 1,
                display: 'block',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                p: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                {fileName}
              </Typography>
              <Link href={fileUrl} download target="_blank" sx={{ color: 'inherit' }}>
                <IconButton size="small" sx={{ color: 'inherit' }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Link>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileIcon />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {fileName}
              </Typography>
              <Typography variant="caption" color={isOwnMessage ? 'inherit' : 'text.secondary'}>
                {formatFileSize(fileSize)}
              </Typography>
            </Box>
            <Link href={fileUrl} download target="_blank" sx={{ color: 'inherit' }}>
              <IconButton size="small" sx={{ color: isOwnMessage ? 'inherit' : 'primary.main' }}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Link>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
