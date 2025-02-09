import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  Description,
  Download,
  ZoomIn,
  ZoomOut,
  Close,
} from '@mui/icons-material';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface MessageAttachmentProps {
  url: string;
  type: string;
  filename?: string;
}

export default function MessageAttachment({
  url,
  type,
  filename,
}: MessageAttachmentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isImage = type.startsWith('image/');

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  if (isImage) {
    return (
      <>
        <Paper
          sx={{
            position: 'relative',
            maxWidth: 300,
            overflow: 'hidden',
            cursor: 'pointer',
            '&:hover .attachment-overlay': {
              opacity: 1,
            },
          }}
          onClick={() => setIsPreviewOpen(true)}
        >
          <Box
            component="img"
            src={url}
            alt={filename || 'Image attachment'}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: 200,
              objectFit: 'contain',
            }}
          />
          <Box
            className="attachment-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
          >
            <IconButton color="inherit" size="small">
              <ZoomIn />
            </IconButton>
          </Box>
        </Paper>

        <Dialog
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogContent
            sx={{
              position: 'relative',
              p: 0,
              height: '90vh',
              bgcolor: 'black',
            }}
          >
            <IconButton
              onClick={() => setIsPreviewOpen(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
                zIndex: 1,
              }}
            >
              <Close />
            </IconButton>
            <TransformWrapper>
              {({ zoomIn, zoomOut }) => (
                <>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1,
                      display: 'flex',
                      gap: 1,
                    }}
                  >
                    <IconButton
                      onClick={() => zoomIn()}
                      sx={{
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                    >
                      <ZoomIn />
                    </IconButton>
                    <IconButton
                      onClick={() => zoomOut()}
                      sx={{
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                        },
                      }}
                    >
                      <ZoomOut />
                    </IconButton>
                  </Box>
                  <TransformComponent>
                    <Box
                      component="img"
                      src={url}
                      alt={filename || 'Image preview'}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Paper
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        maxWidth: 300,
      }}
    >
      <Description />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {filename || 'File attachment'}
        </Typography>
      </Box>
      <IconButton size="small" onClick={handleDownload}>
        <Download fontSize="small" />
      </IconButton>
    </Paper>
  );
}
