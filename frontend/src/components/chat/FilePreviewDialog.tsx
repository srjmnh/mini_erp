import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { PDFViewer } from '../shared/PDFViewer';

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  file: {
    url: string;
    type: string;
    name: string;
  } | null;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({ open, onClose, file }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoadSuccess = () => {
    setLoading(false);
    setError(null);
  };

  const handleLoadError = () => {
    setLoading(false);
    setError('Failed to load preview');
  };

  const handleDownload = () => {
    if (file?.url) {
      window.open(file.url, '_blank');
    }
  };

  const getGoogleViewerUrl = (fileUrl: string) => {
    return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`;
  };

  const renderContent = () => {
    if (!file) return null;

    if (file.type === 'application/pdf') {
      return (
        <Box sx={{ width: '100%', height: '70vh', position: 'relative' }}>
          <PDFViewer fileUrl={file.url} />
          {error && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ mt: 2 }}
              >
                Download File Instead
              </Button>
            </Box>
          )}
        </Box>
      );
    }

    if (file.type === 'application/msword' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/vnd.ms-excel' || 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-powerpoint' ||
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.type === 'text/plain') {
      return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe
            src={getGoogleViewerUrl(file.url)}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
          />
          {error && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ mt: 2 }}
              >
                Download File Instead
              </Button>
            </Box>
          )}
        </Box>
      );
    }

    if (file.type.startsWith('image/')) {
      return (
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
      );
    }

    if (file.type.startsWith('video/')) {
      return (
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
      );
    }

    return (
      <Box sx={{ p: 3, textAlign: 'center', color: theme.palette.text.secondary }}>
        <Typography variant="body1">
          Preview is not available for this file type.
          <br />
          Click the download button above to download the file.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: 'calc(100% - 64px)',
          maxHeight: 'calc(100% - 64px)'
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="div" sx={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}>
            {file?.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleDownload}>
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: '400px'
      }}>
        {loading && (
          <Box sx={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.paper',
            zIndex: 1
          }}>
            <CircularProgress />
            <Typography>Loading preview...</Typography>
          </Box>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
