import React, { useRef, useState } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { uploadEmployeePhoto, deleteEmployeePhoto, StorageError } from '@/services/supabaseStorage';

interface PhotoUploadProps {
  photoUrl: string | null;
  employeeId: string;
  employeeName: string;
  onPhotoChange: (url: string | null) => void;
}

export default function PhotoUpload({
  photoUrl,
  employeeId,
  employeeName,
  onPhotoChange,
}: PhotoUploadProps) {
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePhotoSelect = () => {
    fileInputRef.current?.click();
    handleClose();
  };

  const handlePhotoDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      if (photoUrl) {
        await deleteEmployeePhoto(photoUrl);
      }
      onPhotoChange(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      if (error instanceof StorageError) {
        setError(error.message);
      } else {
        setError('Failed to delete photo. Please try again.');
      }
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting photo upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        employeeId
      });

      // Delete old photo if exists
      if (photoUrl) {
        console.log('Deleting old photo:', photoUrl);
        await deleteEmployeePhoto(photoUrl);
        console.log('Old photo deleted successfully');
      }

      // Upload new photo
      console.log('Uploading new photo...');
      const newPhotoUrl = await uploadEmployeePhoto(file, employeeId);
      console.log('Upload successful, new URL:', newPhotoUrl);
      
      // Update the UI
      console.log('Updating UI with new photo URL');
      onPhotoChange(newPhotoUrl);
      console.log('Photo upload process complete');
    } catch (error) {
      console.error('Error in photo upload process:', error);
      if (error instanceof StorageError) {
        setError(error.message);
      } else {
        setError('Failed to upload photo. Please try again.');
      }
    } finally {
      setLoading(false);
      // Clear the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        src={photoUrl || `https://ui-avatars.com/api/?name=${employeeName}&size=128`}
        alt={employeeName}
        sx={{ 
          width: 120, 
          height: 120, 
          border: '4px solid white',
          filter: loading ? 'brightness(0.7)' : 'none',
        }}
      />
      
      {loading && (
        <CircularProgress
          size={30}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-15px',
            marginLeft: '-15px',
          }}
        />
      )}

      <IconButton
        onClick={handleClick}
        disabled={loading}
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'background.default' },
        }}
      >
        <EditIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handlePhotoSelect}>
          <PhotoCameraIcon sx={{ mr: 1 }} />
          <Typography>Upload Photo</Typography>
        </MenuItem>
        {photoUrl && (
          <MenuItem onClick={handlePhotoDelete}>
            <DeleteIcon sx={{ mr: 1 }} />
            <Typography>Remove Photo</Typography>
          </MenuItem>
        )}
      </Menu>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
