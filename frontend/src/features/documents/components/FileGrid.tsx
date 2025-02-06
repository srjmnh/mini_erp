import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Grid,
  Stack,
  Tooltip,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { formatFileSize } from '@/utils/formatters';

interface FileData {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
  type: string;
}

interface FileGridProps {
  files: FileData[];
  onDownload: (file: FileData) => void;
  onDelete: (file: FileData) => void;
  onShare: (file: FileData) => void;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return <PdfIcon fontSize="large" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <ImageIcon fontSize="large" />;
    case 'doc':
    case 'docx':
      return <DocumentIcon fontSize="large" />;
    default:
      return <FileIcon fontSize="large" />;
  }
};

export function FileGrid({ files, onDownload, onDelete, onShare }: FileGridProps) {
  const theme = useTheme();

  if (files.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          No files in this folder
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {files.map((file) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderColor: 'primary.main',
              },
            }}
          >
            <CardContent sx={{ flexGrow: 1, pt: 3 }}>
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                  }}
                >
                  {getFileIcon(file.name)}
                </Box>
                <Stack spacing={0.5} alignItems="center" textAlign="center">
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1.2em',
                      height: '2.4em',
                    }}
                  >
                    {file.name}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip 
                      label={file.type || 'Unknown'} 
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        fontWeight: 500,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', gap: 1, pb: 2 }}>
              <Tooltip title="Download">
                <IconButton
                  size="small"
                  onClick={() => onDownload(file)}
                  sx={{
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton
                  size="small"
                  onClick={() => onShare(file)}
                  sx={{
                    color: theme.palette.info.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                    },
                  }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => onDelete(file)}
                  sx={{
                    color: 'error.main',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
