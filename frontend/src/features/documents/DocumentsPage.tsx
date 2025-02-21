import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Container,
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  Avatar,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LoadingButton
} from '@mui/lab';
import {
  Folder as FolderIcon,
  ArrowBack as ArrowBackIcon,
  Upload as UploadIcon,
  CreateNewFolder as NewFolderIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  MoreVert as MoreVertIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Business as DepartmentIcon,
  People as EmployeesIcon,
  Search as SearchIcon,
  TextSnippet as TextIcon,
  Code as CodeIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { DepartmentView } from './components/DepartmentView';
import { EmployeeView } from './components/EmployeeView';
import { Worker } from '@react-pdf-viewer/core';
import { Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  isFolder?: boolean;
  documentCount?: number;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isValidFileName = (name: string): boolean => {
  // Skip temporary files, system files, and raw cache files
  const invalidPatterns = [
    /^\./,  // Hidden files
    /^[0-9]{8,}-/, // Timestamp prefixed files
    /^gen-lang-client-/, // Generated language files
    /^ud[0-9a-f]{6,}\.webp$/, // Generated image files
    /\.folder$/, // Folder marker files
    /\.tmp$/, // Temporary files
    /\.cache$/ // Cache files
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(name));
};

const sections = [
  {
    id: 'departments',
    title: 'Departments',
    description: 'Access and manage department-specific documents and files',
    icon: <DepartmentIcon />,
    color: '#2196f3',
  },
  {
    id: 'employees',
    title: 'Employees',
    description: 'View and manage employee documents, contracts, and personal files',
    icon: <EmployeesIcon />,
    color: '#4caf50',
  },
  {
    id: 'general',
    title: 'Personal Drive',
    description: 'Your private workspace for managing personal files and documents',
    icon: <DescriptionIcon />,
    color: '#ff9800',
  },
];

export default function DocumentsPage() {
  const theme = useTheme();
  const { supabase } = useSupabase();
  const { user } = useAuth(); // Use the auth hook instead
  const { showSnackbar } = useSnackbar();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] = useState<FileItem | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add useCallback to prevent recreation of functions
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      let path = currentPath.join('/');
      
      // If we're in personal drive, only show user files
      if (currentPath[0] === 'personal') {
        // Check if user is authenticated
        if (!user) {
          showSnackbar('Please sign in to view your personal drive', 'error');
          setFiles([]);
          return;
        }
        
        const { data: userFiles, error } = await supabase.storage
          .from('documents')
          .list(`personal/${user.id}/${currentPath.slice(1).join('/')}`);

        if (error) throw error;

        // Process files and folders
        const processedFiles = await Promise.all((userFiles || []).map(async (item) => {
          // Skip .keep files
          if (item.name === '.keep') return null;
          
          // Check if item is a folder by checking if it has no mimetype or is a directory
          const isFolder = !item.metadata?.mimetype || item.metadata?.isDir;
          
          if (isFolder) {
            const folderPath = [...currentPath, item.name].join('/');
            const { data: folderContents } = await supabase.storage
              .from('documents')
              .list(folderPath);
            
            // Filter out .keep and .folder files from count
            const documentCount = (folderContents || [])
              .filter(f => !f.name.startsWith('.'))  // Exclude all hidden files
              .filter(f => f.metadata?.mimetype)     // Only count actual files
              .length;
            
            return {
              id: item.id || item.name,
              name: item.name,
              type: 'folder',
              size: 0,
              documentCount,
              createdAt: item.created_at,
              isFolder: true
            };
          }

          // Regular file
          return {
            id: item.id || item.name,
            name: item.name,
            size: item.metadata?.size || 0,
            type: item.metadata?.mimetype,
            createdAt: item.created_at,
            isFolder: false
          };
        }));

        // Sort: folders first, then files alphabetically
        const sortedFiles = processedFiles
          .filter(Boolean) // Remove null entries
          .filter(item => !item.name.startsWith('.')) // Remove all hidden files
          .sort((a, b) => {
            if (a.isFolder !== b.isFolder) {
              return a.isFolder ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });

        setFiles(sortedFiles);
        return;
      }

      // For other sections, use existing logic
      const { data, error } = await supabase.storage
        .from('documents')
        .list(path);

      if (error) throw error;

      // Process files and folders
      const processedFiles = await Promise.all((data || []).map(async (item) => {
        // Skip .keep files
        if (item.name === '.keep') return null;
        
        // Check if item is a folder by checking if it has no mimetype or is a directory
        const isFolder = !item.metadata?.mimetype || item.metadata?.isDir;
        
        if (isFolder) {
          const folderPath = [...currentPath, item.name].join('/');
          const { data: folderContents } = await supabase.storage
            .from('documents')
            .list(folderPath);
          
          // Filter out .keep and .folder files from count
          const documentCount = (folderContents || [])
            .filter(f => !f.name.startsWith('.'))  // Exclude all hidden files
            .filter(f => f.metadata?.mimetype)     // Only count actual files
            .length;
          
          return {
            id: item.id || item.name,
            name: item.name,
            type: 'folder',
            size: 0,
            documentCount,
            createdAt: item.created_at,
            isFolder: true
          };
        }

        // Regular file
        return {
          id: item.id || item.name,
          name: item.name,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype,
          createdAt: item.created_at,
          isFolder: false
        };
      }));

      // Sort: folders first, then files alphabetically
      const sortedFiles = processedFiles
        .filter(Boolean) // Remove null entries
        .filter(item => !item.name.startsWith('.')) // Remove all hidden files
        .sort((a, b) => {
          if (a.isFolder !== b.isFolder) {
            return a.isFolder ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

      setFiles(sortedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      if (error instanceof Error) {
        showSnackbar(error.message, 'error');
      } else {
        showSnackbar('Failed to fetch files', 'error');
      }
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, supabase, user, showSnackbar]);

  // Single storage verification on mount
  useEffect(() => {
    const verifyStorage = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .list('');

        if (error) throw error;
        
        // Only fetch files if storage is accessible
        fetchFiles();
      } catch (error) {
        console.error('Storage verification failed:', error);
        showSnackbar('Error connecting to storage', 'error');
      }
    };

    verifyStorage();
  }, [supabase, fetchFiles, showSnackbar]);

  // Debounced file fetching when path changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFiles();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentPath, fetchFiles]);

  const getFolderStats = async (folderPath: string) => {
    try {
      const { data: folderContents, error } = await supabase.storage
        .from('documents')
        .list(folderPath);

      if (error) throw error;

      // Filter out the .folder file and count actual documents
      const documentCount = folderContents?.filter(item => !item.name.endsWith('.folder')).length || 0;
      
      return { documentCount };
    } catch (error) {
      console.error('Error getting folder stats:', error);
      return { documentCount: 0 };
    }
  };

  const generateThumbnail = async (file: File | Blob): Promise<string> => {
    try {
      if (!file) {
        console.error('No file received');
        return '';
      }

      // Handle both File and Blob objects
      const blob = file instanceof File ? file : file;
      
      // Ensure we have an image type
      const type = blob.type || '';
      if (!type.startsWith('image/')) {
        console.log('Unsupported file type for thumbnail:', type);
        return '';
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader result is not a string'));
          }
        };
        
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(blob);
      }).catch(error => {
        console.error('Error generating thumbnail:', error);
        return '';
      });
    } catch (error) {
      console.error('Error in generateThumbnail:', error);
      return '';
    }
  };

  useEffect(() => {
    const fetchThumbnails = async () => {
      for (const file of files) {
        // Only try to generate thumbnails for image files
        if (
          file.type?.startsWith('image/') &&
          !thumbnails[file.name] &&
          !file.isFolder
        ) {
          try {
            // Get the correct storage path based on current section
            let storagePath;
            if (currentPath[0] === 'personal') {
              // For personal drive, include user ID in the path
              storagePath = `personal/${user?.id}/${currentPath.slice(1).join('/')}/${file.name}`;
            } else {
              // For other sections (departments, employees), use path as is
              storagePath = `${currentPath.join('/')}/${file.name}`;
            }

            // First get a public URL to verify the file exists
            const { data: { publicUrl }, error: urlError } = await supabase.storage
              .from('documents')
              .getPublicUrl(storagePath);

            if (urlError || !publicUrl) {
              console.error(`Error getting public URL for ${file.name}:`, urlError);
              continue;
            }

            // Now download the file
            const { data, error } = await supabase.storage
              .from('documents')
              .download(storagePath);

            if (error) {
              console.error(`Error downloading ${file.name}:`, error);
              continue;
            }

            if (!data) {
              console.log(`No data received for ${file.name}`);
              continue;
            }

            // Create a new Blob with the correct type
            const imageBlob = new Blob([data], { type: file.type });
            const thumbnail = await generateThumbnail(imageBlob);
            
            if (thumbnail) {
              setThumbnails(prev => ({ ...prev, [file.name]: thumbnail }));
            }
          } catch (error) {
            console.error(`Error processing thumbnail for ${file.name}:`, error);
            // Don't show error to user since thumbnails are not critical
          }
        }
      }
    };

    if (files.length > 0 && user?.id) {
      fetchThumbnails();
    }
  }, [files, currentPath, user?.id]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      setUploading(true);
      
      for (const file of Array.from(files)) {
        const filePath = currentPath[0] === 'personal'
          ? `personal/${user?.id}/${currentPath.slice(1).join('/')}/${file.name}`
          : `${currentPath.join('/')}/${file.name}`;

        const { error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;
      }

      showSnackbar('Files uploaded successfully', 'success');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      showSnackbar('Failed to upload files', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setCreatingFolder(true);
      
      // Create folder path based on section
      let folderPath;
      if (currentPath[0] === 'personal') {
        // For personal drive, include user ID in the path
        folderPath = `personal/${user.id}/${currentPath.slice(1).join('/')}/${newFolderName}/.keep`;
      } else {
        // For other sections (departments, employees), use path as is
        folderPath = `${currentPath.join('/')}/${newFolderName}/.keep`;
      }

      // Create an empty file to mark this as a folder
      const { error } = await supabase.storage
        .from('documents')
        .upload(folderPath, new Blob([]));

      if (error) throw error;

      setNewFolderName('');
      setNewFolderDialogOpen(false);
      showSnackbar('Folder created successfully', 'success');
      fetchFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      if (error instanceof Error) {
        showSnackbar(error.message, 'error');
      } else {
        showSnackbar('Failed to create folder', 'error');
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const LoadingIndicator = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px'
    }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Loading files...</Typography>
    </Box>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  const handleDepartmentClick = (deptId: string) => {
    setCurrentPath(['departments', deptId]);
  };

  const handleEmployeeClick = (empId: string) => {
    setCurrentPath(['employees', empId]);
  };

  const handleFolderClick = async (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
    await fetchFiles();
  };

  const handleBack = async () => {
    setCurrentPath(prev => prev.slice(0, -1));
    await fetchFiles();
  };

  const handlePreview = async (file: FileItem) => {
    try {
      setPreviewFile(file);

      // Get the correct storage path based on current section
      let storagePath;
      if (currentPath[0] === 'personal') {
        // For personal drive, include user ID in the path
        storagePath = `personal/${user?.id}/${currentPath.slice(1).join('/')}`;
      } else {
        // For other sections (departments, employees), use path as is
        storagePath = currentPath.join('/');
      }

      // Get temporary URL for preview
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(`${storagePath}/${file.name}`, 3600); // 1 hour expiry

      if (error) {
        console.error(`Error creating preview URL for ${storagePath}/${file.name}:`, error);
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL received from storage');
      }

      setPreviewUrl(data.signedUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
      showSnackbar('Failed to preview file', 'error');
      setPreviewFile(null);
      setPreviewUrl(null);
    }
  };

  const getFilePreviewUrl = async (file: FileItem) => {
    try {
      const { data: { publicUrl }, error } = await supabase.storage
        .from('documents')
        .getPublicUrl([...currentPath, file.name].join('/'));

      if (error) throw error;
      return publicUrl;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <ImageIcon />;
      case 'pdf':
        return <PictureAsPdfIcon />;
      case 'txt':
      case 'doc':
      case 'docx':
        return <TextIcon />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
        return <CodeIcon />;
      case 'mp4':
      case 'webm':
      case 'mov':
        return <VideoIcon />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <AudioIcon />;
      default:
        return <FileIcon />;
    }
  };

  const handleShare = async (file: FileItem, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent card click
    }
    
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(
          [...currentPath, file.name].join('/'),
          24 * 60 * 60 // 24 hours expiry
        );

      if (data?.signedUrl) {
        setShareUrl(data.signedUrl);
        setSelectedFileForShare(file);
        setShareDialogOpen(true);
        // Copy to clipboard
        await navigator.clipboard.writeText(data.signedUrl);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      showSnackbar('Failed to generate share link', 'error');
    }
  };

  const handleDownload = async (file: FileItem, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent card click
    }
    
    try {
      // Get the correct storage path based on current section
      let storagePath;
      if (currentPath[0] === 'personal') {
        // For personal drive, include user ID in the path
        storagePath = `personal/${user?.id}/${currentPath.slice(1).join('/')}`;
      } else {
        // For other sections (departments, employees), use path as is
        storagePath = currentPath.join('/');
      }

      // Download using the correct path
      const { data, error } = await supabase.storage
        .from('documents')
        .download(`${storagePath}/${file.name}`);

      if (error) {
        console.error(`Error downloading file from path ${storagePath}/${file.name}:`, error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSnackbar('File downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading file:', error);
      showSnackbar('Failed to download file', 'error');
    }
  };

  const renderFileCard = (file: FileItem) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const hasPreview = thumbnails[file.name] || isPdf;

    return (
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          position: 'relative',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            transform: 'translateY(-2px)',
            transition: 'all 0.2s',
            '& .file-actions': {
              opacity: 1,
            },
          },
        }}
        onClick={() => handlePreview(file)}
      >
        <CardContent>
          <Stack spacing={2} alignItems="center" textAlign="center">
            {hasPreview ? (
              isPdf ? (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    borderRadius: 2,
                  }}
                >
                  <PictureAsPdfIcon sx={{ fontSize: 40, color: theme.palette.error.main }} />
                </Box>
              ) : (
                <Box
                  component="img"
                  src={thumbnails[file.name]}
                  alt={file.name}
                  sx={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 1,
                  }}
                />
              )
            ) : (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 2,
                }}
              >
                {getFileIcon(file.name)}
              </Box>
            )}
            <Box>
              <Typography variant="subtitle1" noWrap title={file.name}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.size)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
        {/* Action buttons */}
        <Box
          className="file-actions"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
            transition: 'opacity 0.2s',
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 2,
            display: 'flex',
            gap: 0.5,
            p: 0.5,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            onClick={(e) => handleShare(file, e)}
            sx={{ color: 'primary.main' }}
          >
            <ShareIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => handleDownload(file, e)}
            sx={{ color: 'primary.main' }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Box>
      </Card>
    );
  };

  const renderFolderCard = (folder: FileItem) => (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        height: '100%',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          transform: 'translateY(-2px)',
          transition: 'all 0.2s',
        },
      }}
      onClick={() => handleFolderClick(folder.name)}
    >
      <CardContent>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              borderRadius: 2,
            }}
          >
            <FolderIcon sx={{ fontSize: 48, color: theme.palette.warning.main }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" noWrap title={folder.name}>
              {folder.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {folder.documentCount === 1 
                ? '1 document' 
                : `${folder.documentCount || 0} documents`}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderFileGrid = () => {
    if (loading) {
      return (
        <Grid container spacing={2}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (files.length === 0) {
      return (
        <Box
          sx={{
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary">
            This folder is empty
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {files.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            {item.isFolder ? renderFolderCard(item) : renderFileCard(item)}
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderFileList = () => {
    const renderTableContent = () => {
      if (loading) {
        return (
          <TableBody>
            {[...Array(4)].map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton variant="text" width={200} /></TableCell>
                <TableCell><Skeleton variant="text" width={100} /></TableCell>
                <TableCell><Skeleton variant="text" width={100} /></TableCell>
                <TableCell><Skeleton variant="text" width={50} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        );
      }

      if (files.length === 0) {
        return (
          <TableBody>
            <TableRow>
              <TableCell colSpan={4}>
                <Box
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No files found
                  </Typography>
                  <Typography color="text.secondary">
                    Upload files or create folders to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        );
      }

      return (
        <TableBody>
          {files.map((file) => (
            <TableRow
              key={file.id}
              hover
              onClick={() => file.isFolder ? handleFolderClick(file.name) : handlePreview(file)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <TableCell>
                <Stack direction="row" spacing={2} alignItems="center">
                  {file.isFolder ? (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        borderRadius: 1,
                      }}
                    >
                      <FolderIcon sx={{ color: theme.palette.warning.main }} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        borderRadius: 1,
                      }}
                    >
                      {getFileIcon(file.name)}
                    </Box>
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: file.isFolder ? 500 : 400 }}>
                      {file.name}
                    </Typography>
                    {file.isFolder && (
                      <Typography variant="caption" color="text.secondary">
                        {file.documentCount === 1 ? '1 document' : `${file.documentCount || 0} documents`}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                {!file.isFolder && formatFileSize(file.size)}
              </TableCell>
              <TableCell>
                {formatDate(file.createdAt)}
              </TableCell>
              <TableCell align="right">
                {!file.isFolder && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(e.currentTarget);
                      setSelectedFile(file);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    };

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          {renderTableContent()}
        </Table>
      </TableContainer>
    );
  };

  const renderPreviewDialog = () => {
    if (!previewFile || !previewUrl) return null;

    const ext = previewFile.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    const isPdf = ext === 'pdf';
    const isVideo = ['mp4', 'webm', 'mov'].includes(ext || '');
    const isAudio = ['mp3', 'wav', 'ogg'].includes(ext || '');
    const isDocument = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext || '');

    return (
      <Dialog
        open={Boolean(previewFile)}
        onClose={() => {
          setPreviewFile(null);
          setPreviewUrl(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" component="div">
              {previewFile.name}
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={async () => {
                  const response = await fetch(previewUrl);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewFile.name;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }}
              >
                <DownloadIcon />
              </IconButton>
              <IconButton
                onClick={() => {
                  setPreviewFile(null);
                  setPreviewUrl(null);
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDocument ? (
              <DocViewer
                documents={[{ uri: previewUrl }]}
                pluginRenderers={DocViewerRenderers}
                style={{ width: '100%', height: '100%' }}
                config={{
                  header: {
                    disableHeader: true,
                    disableFileName: true,
                  }
                }}
              />
            ) : isImage ? (
              <img
                src={previewUrl}
                alt={previewFile.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : isVideo ? (
              <video
                src={previewUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : isAudio ? (
              <audio
                src={previewUrl}
                controls
                style={{ width: '100%' }}
              />
            ) : (
              <Stack alignItems="center" spacing={2}>
                {getFileIcon(previewFile.name)}
                <Typography>
                  This file type cannot be previewed. Click the download button to view it.
                </Typography>
              </Stack>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  const handleBreadcrumbClick = (index: number) => {
    // Navigate to the selected path level
    setCurrentPath(currentPath.slice(0, index));
    fetchFiles();
  };

  const renderBreadcrumbs = () => {
    // Start with Document Center
    let pathSegments = ['Document Center'];
    
    // Add each path segment, maintaining the full hierarchy
    currentPath.forEach((segment, index) => {
      if (index === 0 && segment === 'departments') {
        pathSegments.push('Departments');
      } else if (index === 0 && segment === 'employees') {
        pathSegments.push('Employees');
      } else if (index === 0 && segment === 'personal') {
        pathSegments.push('Personal Drive');
      } else {
        pathSegments.push(segment);
      }
    });
    
    return (
      <Breadcrumbs 
        separator="/"
        sx={{ 
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
            mx: 1
          }
        }}
      >
        {pathSegments.map((segment, index) => {
          // For the root level (Document Center)
          if (index === 0) {
            return (
              <Link
                key={segment}
                component="button"
                variant="body1"
                onClick={() => setCurrentPath([])}
                sx={{ 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: currentPath.length === 0 ? theme.palette.text.primary : theme.palette.text.secondary,
                  '&:hover': {
                    color: theme.palette.primary.main
                  }
                }}
              >
                {segment}
              </Link>
            );
          }

          return (
            <Link
              key={segment}
              component="button"
              variant="body1"
              onClick={() => handleBreadcrumbClick(index - 1)}
              sx={{ 
                cursor: 'pointer',
                textDecoration: 'none',
                color: index === pathSegments.length - 1 ? theme.palette.text.primary : theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.primary.main
                }
              }}
            >
              {segment}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderHomeView = () => {
    const categories = [
      {
        id: 'departments',
        title: 'Departments',
        description: 'Access and manage department-specific documents and files',
        icon: <DepartmentIcon />,
        color: theme.palette.primary.main,
        path: '/departments'
      },
      {
        id: 'employees',
        title: 'Employees',
        description: 'View and manage employee documents, contracts, and personal files',
        icon: <EmployeesIcon />,
        color: theme.palette.success.main,
        path: '/employees'
      },
      {
        id: 'personal',
        title: 'Personal Drive',
        description: 'Your private workspace for managing personal files and documents',
        icon: <FileIcon />,
        color: theme.palette.warning.main,
        path: '/personal'
      }
    ];

    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Document Center
        </Typography>
        
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} md={4} key={category.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[8],
                    '& .category-icon': {
                      transform: 'scale(1.1)',
                      bgcolor: alpha(category.color, 0.2),
                    }
                  }
                }}
                onClick={() => handleFolderClick(category.id)}
              >
                <CardContent>
                  <Box 
                    className="category-icon"
                    sx={{ 
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(category.color, 0.1),
                      color: category.color,
                      mb: 2,
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {category.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                    {category.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderMainSections = () => {
    return (
      <>
        <Typography variant="h5" gutterBottom>
          Document Center
        </Typography>
        <Grid container spacing={3}>
          {sections.map((section) => (
            <Grid item xs={12} sm={6} md={4} key={section.id}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: section.color,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s',
                  },
                }}
                onClick={() => handleFolderClick(section.id)}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(section.color, 0.1), color: section.color }}>
                      {section.icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{section.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {section.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
    );
  };

  const renderContent = () => {
    // Show main sections if we're at root
    if (currentPath.length === 0) {
      return renderHomeView();
    }

    // Show department view
    if (currentPath[0] === 'departments' && currentPath.length === 1) {
      return <DepartmentView onSelectDepartment={(deptId) => setCurrentPath(['departments', deptId])} />;
    }

    // Show employee view
    if (currentPath[0] === 'employees' && currentPath.length === 1) {
      return <EmployeeView 
        onSelectEmployee={(empId) => setCurrentPath(['employees', empId])}
        showSnackbar={showSnackbar}
      />;
    }

    // Show file grid for specific department/employee/general
    return (
      <>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {currentPath.length > 0 && (
              <IconButton onClick={handleBack} size="small">
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h6">
              {currentPath.length === 0 ? 'Document Center' : currentPath[currentPath.length - 1]}
            </Typography>
          </Stack>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {viewMode === 'grid' ? renderFileGrid() : renderFileList()}
      </>
    );
  };

  const getPageTitle = () => {
    if (currentPath.length === 0) {
      return 'Document Center';
    }

    if (currentPath[0] === 'departments') {
      return 'Departments';
    }

    if (currentPath[0] === 'employees') {
      return 'Employees';
    }

    return currentPath.join(' / ');
  };

  const renderUploadButton = () => (
    <LoadingButton
      variant="contained"
      component="label"
      loading={uploading}
      loadingPosition="start"
      startIcon={<UploadIcon />}
      sx={{ mr: 2 }}
    >
      Upload
      <input
        type="file"
        hidden
        multiple
        onChange={handleUpload}
        ref={fileInputRef}
      />
    </LoadingButton>
  );

  const renderNewFolderDialog = () => {
    return (
      <Dialog 
        open={newFolderDialogOpen} 
        onClose={() => {
          setNewFolderDialogOpen(false);
          setNewFolderName('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                handleCreateFolder();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setNewFolderDialogOpen(false);
              setNewFolderName('');
            }}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleCreateFolder}
            loading={creatingFolder}
            disabled={!newFolderName.trim()}
          >
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const renderDialogs = () => {
    return (
      <>
        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleUpload}
        />
        {renderNewFolderDialog()}
      </>
    );
  };

  const ShareDialog = () => (
    <Dialog
      open={shareDialogOpen}
      onClose={() => setShareDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Share {selectedFileForShare?.name}
        <IconButton
          aria-label="close"
          onClick={() => setShareDialogOpen(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            value={shareUrl}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setShowCopiedToast(true);
                      setTimeout(() => setShowCopiedToast(false), 2000);
                    }}
                  >
                    Copy
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Link expires in 24 hours
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );

  const ActionMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => setAnchorEl(null)}
    >
      <MenuItem onClick={() => {
        if (selectedFile) handleShare(selectedFile);
        setAnchorEl(null);
      }}>
        <ListItemIcon>
          <ShareIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Share</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => {
        if (selectedFile) handleDownload(selectedFile);
        setAnchorEl(null);
      }}>
        <ListItemIcon>
          <DownloadIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Download</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {currentPath.length > 0 && (
          <>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <IconButton 
                onClick={handleBack} 
                size="small"
                sx={{
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateX(-4px)'
                  }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              {renderBreadcrumbs()}
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<NewFolderIcon />}
                onClick={() => setNewFolderDialogOpen(true)}
              >
                New Folder
              </Button>
              <LoadingButton
                variant="contained"
                component="label"
                loading={uploading}
                loadingPosition="start"
                startIcon={<UploadIcon />}
              >
                Upload Files
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleUpload}
                  ref={fileInputRef}
                />
              </LoadingButton>

              {/* View Toggle */}
              <Box sx={{ ml: 'auto' }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, value) => value && setViewMode(value)}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <GridViewIcon />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ListViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </>
        )}
        
        {renderContent()}
        
        {/* Dialogs */}
        {renderDialogs()}
        {renderPreviewDialog()}
        <ShareDialog />
        <ActionMenu />
      </Box>
    </Container>
  );
}
