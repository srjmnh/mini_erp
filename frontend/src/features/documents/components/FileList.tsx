import React from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Box,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { formatFileSize } from '../../../utils/formatters';

interface FileData {
  id: string;
  name: string;
  size: number;
  url: string;
  path: string;
}

interface FileListProps {
  files: FileData[];
  onDownload: (file: FileData) => void;
  onDelete: (file: FileData) => void;
  onShare: (file: FileData) => void;
}

export function FileList({ files, onDownload, onDelete, onShare }: FileListProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<FileData | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>, file: FileData) => {
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PdfIcon />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon />;
      case 'doc':
      case 'docx':
        return <DocumentIcon />;
      default:
        return <FileIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {files.map((file) => (
        <React.Fragment key={file.id}>
          <ListItem
            sx={{
              py: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {getFileIcon(file.name)}
            </ListItemIcon>
            <ListItemText
              primary={file.name}
              secondary={formatFileSize(file.size)}
              primaryTypographyProps={{
                sx: {
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                },
              }}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                size="small"
                onClick={(event) => handleClick(event, file)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {selectedFile && (
          <>
            <MenuItem onClick={() => { handleClose(); onDownload(selectedFile); }}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); onShare(selectedFile); }}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => { handleClose(); onDelete(selectedFile); }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}
