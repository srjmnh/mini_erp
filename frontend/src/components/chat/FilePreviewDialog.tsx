import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  file: {
    url: string;
    name: string;
    type: string;
  } | null;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({ open, onClose, file }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [file?.url]);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';
  const isVideo = file.type.startsWith('video/');

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  const handleLoadSuccess = () => {
    setLoading(false);
    setError(false);
  };

  const handleLoadError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: theme.palette.background.paper
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography variant="h6" component="div" sx={{ 
            textOverflow: 'ellipsis', 
            overflow: 'hidden', 
            whiteSpace: 'nowrap' 
          }}>
            {file.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={handleDownload}
            sx={{ color: theme.palette.primary.main }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            onClick={onClose}
            sx={{ color: theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ 
        p: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: theme.palette.background.default,
        position: 'relative',
        minHeight: '400px'
      }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%'
          }}>
            <CircularProgress />
          </Box>
        )}
        {isImage && (
          <img
            src={file.url}
            alt={file.name}
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 100px)',
              objectFit: 'contain',
              display: loading ? 'none' : 'block'
            }}
          />
        )}
        {isPDF && (
          <iframe
            src={`${file.url}#toolbar=0`}
            title={file.name}
            width="100%"
            height="calc(90vh - 100px)"
            style={{ 
              border: 'none',
              display: loading ? 'none' : 'block'
            }}
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
          />
        )}
        {isVideo && (
          <video
            controls
            onLoadedData={handleLoadSuccess}
            onError={handleLoadError}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 100px)',
              display: loading ? 'none' : 'block'
            }}
          >
            <source src={file.url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        )}
        {error && (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center',
            color: theme.palette.error.main
          }}>
            <Typography variant="body1">
              Failed to load preview. You can still download the file using the download button above.
            </Typography>
          </Box>
        )}
        {!isImage && !isPDF && !isVideo && !error && !loading && (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center',
            color: theme.palette.text.secondary
          }}>
            <Typography variant="body1">
              Preview is not available for this file type.
              <br />
              Click the download button above to download the file.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
