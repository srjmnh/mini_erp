import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Divider,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CreateNewFolder as NewFolderIcon,
  Business as DepartmentIcon,
  People as EmployeesIcon,
  Folder as FolderIcon,
  Search as SearchIcon,
  CloudUpload as CloudUploadIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as DefaultFileIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  isFolder?: boolean;
}

const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

export default function DocumentsPage() {
  const theme = useTheme();
  const { departments, employees } = useFirestore();
  const { supabase, customFolders, fetchCustomFolders, getDocumentCount, syncStorageWithDatabase } = useSupabase();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [openNewFolder, setOpenNewFolder] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sectionItems, setSectionItems] = useState<any[]>([]);

  useEffect(() => {
    const loadSectionItems = async () => {
      const deptItems = await Promise.all(departments.map(async dept => ({
        id: dept.id,
        name: dept.name,
        documentCount: await getDocumentCount(`departments/${dept.id}`),
        type: 'department'
      })));

      const empItems = await Promise.all(employees.map(async emp => ({
        id: emp.id,
        name: emp.name || 'Unnamed Employee',
        documentCount: await getDocumentCount(`employees/${emp.id}`),
        photoUrl: emp.photoUrl,
        type: 'employee'
      })));

      setSectionItems([...deptItems, ...empItems]);
    };

    loadSectionItems();
  }, [departments, employees]);

  useEffect(() => {
    if (currentPath.length > 0) {
      fetchFiles();
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.length === 0 && !currentSection) {
      fetchFiles();
    }
  }, [currentPath, currentSection]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      let folderPath = '';

      if (currentPath.length === 0) {
        // Fetch from root/general directory
        folderPath = 'general';
      } else {
        // Join the path parts correctly
        folderPath = currentPath.join('/');
      }
      
      console.log('Fetching files from path:', folderPath);
      console.log('Current path state:', { currentPath, currentSection });

      // Get files from storage to identify folders
      const { data: storageItems, error: storageError } = await supabase.storage
        .from('documents')
        .list(folderPath);

      if (storageError) {
        console.error('Storage error:', storageError);
        throw storageError;
      }

      console.log('Raw storage items:', storageItems);

      // First, identify all folders by looking for .folder files
      const folderNames = new Set(
        (storageItems || [])
          .filter(item => item.name.endsWith('.folder'))
          .map(item => item.name.replace('.folder', ''))
      );

      console.log('Identified folders:', folderNames);

      // Then process all items, marking them as folders if their name matches a folder
      const processedItems = (storageItems || [])
        .filter(item => !item.name.endsWith('.folder')) // Filter out .folder files
        .map(item => {
          const isFolder = folderNames.has(item.name);
          return {
            id: item.id,
            name: item.name,
            type: isFolder ? 'folder' : (item.metadata?.mimetype || 'application/octet-stream'),
            size: isFolder ? 0 : (item.metadata?.size || 0),
            path: `${folderPath}/${item.name}`,
            created_at: item.created_at,
            updated_at: item.created_at,
            isFolder
          };
        });

      // Add folders that don't have any files yet
      folderNames.forEach(folderName => {
        if (!processedItems.some(item => item.name === folderName)) {
          processedItems.push({
            id: folderName,
            name: folderName,
            type: 'folder',
            size: 0,
            path: `${folderPath}/${folderName}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            isFolder: true
          });
        }
      });

      console.log('Final processed items:', processedItems);
      setFiles(processedItems);
    } catch (error) {
      console.error('Error fetching files:', error);
      showSnackbar('Failed to fetch files', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (sectionId: string | null, itemId: string) => {
    console.log('Folder click:', { sectionId, itemId, currentPath });
    
    if (currentPath.length === 0) {
      // Clicking folder in root directory
      setCurrentSection('custom');
      setCurrentPath(['general', itemId]);
    } else {
      setCurrentSection(sectionId);
      setCurrentPath([...currentPath, itemId]);
    }

    console.log('New path:', [...currentPath, itemId]);
    await fetchFiles();
  };

  const handleBack = async () => {
    console.log('Going back from:', currentPath);
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      if (newPath.length === 0) {
        setCurrentSection(null);
      }
      await fetchFiles();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const file = files[0];
      const storagePath = currentPath.length > 0 
        ? `${currentPath.join('/')}/${file.name}`
        : file.name;

      // Get the current folder path (excluding the file name)
      const folderPath = currentPath.length > 0 
        ? currentPath[currentPath.length - 1].split('/')[1] // Get the ID part
        : '';

      console.log('Uploading file with paths:', {
        storagePath,
        folderPath,
        currentPath,
        user
      });

      // Upload file to storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (storageError) throw storageError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Store file metadata in database
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          name: file.name,
          folder_path: folderPath,
          type: file.type,
          size: file.size,
          storage_path: storagePath,
          created_by: user?.id // This can be null
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
      
      showSnackbar('File uploaded successfully', 'success');
      await fetchFiles();
      await fetchCustomFolders(); // Refresh folder counts
    } catch (error) {
      console.error('Error uploading file:', error);
      showSnackbar('Failed to upload file', 'error');
    } finally {
      setUploading(false);
      setOpenUpload(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      // Only allow deletion if user is creator or file has no creator
      if (file.created_by && file.created_by !== user?.id) {
        showSnackbar('You do not have permission to delete this file', 'error');
        return;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('storage_path', file.storage_path);

      if (dbError) throw dbError;
      
      showSnackbar('File deleted successfully', 'success');
      await fetchFiles();
      await fetchCustomFolders(); // Refresh folder counts
    } catch (error) {
      console.error('Error deleting file:', error);
      showSnackbar('Failed to delete file', 'error');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type.includes('pdf')) return <PdfIcon />;
    if (type.includes('document')) return <DocumentIcon />;
    return <DefaultFileIcon />;
  };

  const renderFileGrid = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    console.log('Rendering files:', files);

    return (
      <Grid container spacing={2}>
        {files.map((file) => {
          console.log('Rendering file:', file);
          return (
          <Grid item xs={12} sm={6} md={4} key={file.id}>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    }}
                  >
                    {file.isFolder ? <FolderIcon /> : getFileIcon(file.type)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.isFolder ? 'Folder' : formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {file.isFolder ? (
                      <IconButton
                        size="small"
                        onClick={() => handleFolderClick(currentSection || 'custom', file.name)}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      >
                        <ArrowForwardIcon />
                      </IconButton>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(file)}
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(file)}
                          sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: theme.palette.error.main,
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )})}
      </Grid>
    );
  };

  const sections = [
    {
      id: 'departments',
      title: 'Department Documents',
      description: 'Manage department-specific documents and files',
      icon: <DepartmentIcon />,
      color: '#2196f3',
      items: sectionItems.filter(item => item.type === 'department')
    },
    {
      id: 'employees',
      title: 'Employee Documents',
      description: 'Access employee-related documents and records',
      icon: <EmployeesIcon />,
      color: '#4caf50',
      items: sectionItems.filter(item => item.type === 'employee')
    },
    {
      id: 'custom',
      title: 'General Files',
      description: 'Custom folders for general file management',
      icon: <FolderIcon />,
      color: '#ff9800',
      items: customFolders.map(folder => ({
        ...folder,
        type: 'custom'
      }))
    }
  ];

  const renderContent = () => {
    if (currentPath.length === 0) {
      // Root view (sections)
      return (
        <Grid container spacing={3}>
          {sections.map((section) => (
            <Grid item xs={12} key={section.id}>
              <Card sx={{ boxShadow: theme.shadows[2], '&:hover': { boxShadow: theme.shadows[4] } }}>
                <CardContent>
                  <Stack spacing={3}>
                    {/* Section Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha(section.color, 0.1), color: section.color, width: 48, height: 48 }}>
                          {section.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {section.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {section.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>

                    <Divider />

                    {/* Section Content */}
                    <Grid container spacing={2}>
                      {/* Show files and folders for General Files section */}
                      {section.id === 'custom' && files.map((file) => (
                        <Grid item xs={12} sm={6} md={4} key={file.id}>
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
                          >
                            <CardContent>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(section.color, 0.1),
                                    color: section.color,
                                  }}
                                >
                                  {file.isFolder ? <FolderIcon /> : getFileIcon(file.type)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" noWrap>
                                    {file.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.isFolder ? 'Folder' : formatFileSize(file.size)}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  {file.isFolder ? (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleFolderClick('custom', file.name)}
                                      sx={{
                                        bgcolor: alpha(section.color, 0.1),
                                        color: section.color,
                                      }}
                                    >
                                      <ArrowForwardIcon />
                                    </IconButton>
                                  ) : (
                                    <>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDownload(file)}
                                        sx={{
                                          bgcolor: alpha(section.color, 0.1),
                                          color: section.color,
                                        }}
                                      >
                                        <DownloadIcon />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDelete(file)}
                                        sx={{
                                          bgcolor: alpha(theme.palette.error.main, 0.1),
                                          color: theme.palette.error.main,
                                        }}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </>
                                  )}
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}

                      {/* Show section items for other sections */}
                      {section.id !== 'custom' && section.items.map((item) => (
                        <Grid item xs={12} sm={6} md={4} key={item.id}>
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
                            onClick={() => handleFolderClick(section.id, item.id)}
                          >
                            <CardContent>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha(section.color, 0.1), color: section.color }}>
                                  {item.photoUrl ? (
                                    <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%' }} />
                                  ) : (
                                    <FolderIcon />
                                  )}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" noWrap>
                                    {item.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.documentCount} documents
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(section.color, 0.1),
                                    color: section.color,
                                    '&:hover': { bgcolor: alpha(section.color, 0.2) },
                                  }}
                                >
                                  <ArrowForwardIcon />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                      
                      {/* Add New Folder button only in custom section */}
                      {section.id === 'custom' && (
                        <Grid item xs={12} sm={6} md={4}>
                          <Card
                            variant="outlined"
                            sx={{
                              cursor: 'pointer',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderStyle: 'dashed',
                              '&:hover': {
                                borderColor: section.color,
                                transform: 'translateY(-2px)',
                                transition: 'all 0.2s',
                              },
                            }}
                            onClick={() => setOpenNewFolder(true)}
                          >
                            <CardContent>
                              <Stack spacing={1} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha(section.color, 0.1), color: section.color }}>
                                  <AddIcon />
                                </Avatar>
                                <Typography variant="subtitle1">New Folder</Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    } else {
      // Inside a folder view
      return (
        <>
          {/* Back button and current path */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Back
            </Button>
            <Typography variant="subtitle1" color="text.secondary">
              {currentPath.join(' / ')}
            </Typography>
          </Stack>

          {/* Action buttons */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<NewFolderIcon />}
              onClick={() => setOpenNewFolder(true)}
            >
              New Folder
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setOpenUpload(true)}
            >
              Upload Files
            </Button>
          </Stack>

          {/* Files and folders grid */}
          {renderFileGrid()}
        </>
      );
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showSnackbar('Please enter a folder name', 'error');
      return;
    }

    try {
      setLoading(true);
      let folderPath = '';

      if (currentPath.length === 0) {
        // Create general folder if it doesn't exist
        try {
          const { error: generalError } = await supabase.storage
            .from('documents')
            .upload('general/.folder', new Blob([''], { type: 'text/plain' }), {
              upsert: true
            });
          console.log('General folder creation result:', generalError || 'success');
        } catch (error) {
          // Ignore error if folder already exists
          console.log('General folder might already exist:', error);
        }

        // Now create the new folder inside general
        folderPath = `general/${newFolderName}.folder`;
      } else if (currentSection === 'custom') {
        folderPath = currentPath.length > 0 
          ? `${currentPath.join('/')}/${newFolderName}.folder`
          : `${newFolderName}.folder`;
      } else if (currentSection === 'departments') {
        folderPath = `departments/${currentPath[0]}/${newFolderName}.folder`;
      } else if (currentSection === 'employees') {
        folderPath = `employees/${currentPath[0]}/${newFolderName}.folder`;
      }

      console.log('Creating folder at path:', folderPath);

      // Create an empty .folder file to mark this as a folder
      const { error } = await supabase.storage
        .from('documents')
        .upload(folderPath, new Blob([''], { type: 'text/plain' }), {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Folder creation error:', error);
        throw error;
      }

      console.log('Folder created successfully');
      showSnackbar('Folder created successfully', 'success');
      setNewFolderName('');
      setOpenNewFolder(false);
      
      // Refresh the current view
      await fetchFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      showSnackbar('Failed to create folder', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Stack direction="row" spacing={2} alignItems="center">
            {currentPath.length > 0 && (
              <IconButton onClick={handleBack}>
                <ArrowBackIcon />
              </IconButton>
            )}
            <Box>
              <Typography variant="h4" gutterBottom fontWeight={600}>
                {currentSection ? sections.find(s => s.id === currentSection)?.title : 'Document Center'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {currentPath.length > 0 
                  ? `Viewing ${currentSection} > ${currentPath[currentPath.length - 1].split('/')[1]}`
                  : 'Manage and organize all your company documents in one place'}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setOpenUpload(true)}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            startIcon={<NewFolderIcon />}
            onClick={() => setOpenNewFolder(true)}
          >
            New Folder
          </Button>
        </Stack>
      </Stack>

      {/* Search Bar */}
      <Card 
        sx={{ 
          mb: 4,
          boxShadow: theme.shadows[2],
          '&:hover': { boxShadow: theme.shadows[4] },
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <SearchIcon color="action" />
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search documents, folders, or departments..."
              // value={searchQuery}
              // onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ disableUnderline: true }}
            />
          </Stack>
        </CardContent>
      </Card>

      {renderContent()}

      {/* Upload Dialog */}
      <Dialog
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <Box
            component="label"
            htmlFor="file-upload"
            sx={{
              border: `2px dashed ${theme.palette.divider}`,
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <input
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <CircularProgress size={48} />
            ) : (
              <>
                <CloudUploadIcon
                  sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  Drag and drop files here
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
          <Button variant="contained" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={openNewFolder}
        onClose={() => {
          setOpenNewFolder(false);
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
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenNewFolder(false);
              setNewFolderName('');
            }}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleCreateFolder}
            loading={loading}
            disabled={!newFolderName.trim()}
          >
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* ... rest of the dialogs ... */}
    </Container>
  );
}
