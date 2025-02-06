import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  IconButton,
  Grid,
  Avatar,
  Paper,
  Divider,
  Alert,
  TextField,
  Tabs,
  Tab,
  Autocomplete,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  LinearProgress,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Description as DocumentIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { DraggableOrgChart } from './DraggableOrgChart';
import type { Department, Employee, Document } from '@/types/models';

export default function DepartmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    departments, 
    employees, 
    documents,
    updateDepartment, 
    updateEmployee, 
    addDepartment, 
    deleteDepartment,
    addDocument,
    deleteDocument 
  } = useFirestore();
  const [tabValue, setTabValue] = useState('overview');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddEmployeeDialog, setOpenAddEmployeeDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const department = departments.find(d => d.id === id);
  const departmentEmployees = employees.filter(e => e.departmentId === id);
  const departmentDocuments = documents.filter(d => d.departmentId === id);

  const manager = employees.find(e => e.id === department?.managerId);
  const deputyManager = employees.find(e => e.id === department?.deputyManagerId);

  const handleDocumentMenuOpen = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setSelectedDocument(document);
    setAnchorEl(event.currentTarget);
  };

  const handleDocumentMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDocumentDelete = async () => {
    if (selectedDocument) {
      try {
        await deleteDocument(selectedDocument.id);
        handleDocumentMenuClose();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !department) return;

    try {
      const newDoc = {
        name: file.name,
        type: file.type,
        size: file.size,
        departmentId: department.id,
        uploadedBy: 'Current User', // Replace with actual user
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDocument(newDoc);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  if (!department) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => navigate('/departments')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Department not found</Typography>
          </Stack>
          <Typography color="text.secondary">
            The department you're looking for doesn't exist or has been deleted.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/departments')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Departments
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={() => navigate('/departments')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            {department.name}
          </Typography>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setOpenEditDialog(true)}
            variant="outlined"
            size="small"
          >
            Edit
          </Button>
        </Stack>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Upper Section - Department Info and Documents */}
        <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
          {/* Left Panel - Department Info */}
          <Box sx={{ width: '70%', p: 2, overflow: 'auto' }}>
            {!manager && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This department has no assigned head. Please assign a department head.
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Department Overview Card */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Department Information
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                      {department.description || 'No description available'}
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Department Head
                        </Typography>
                        <Autocomplete
                          value={manager || null}
                          onChange={(_, newValue) => {
                            if (department) {
                              updateDepartment(department.id, {
                                ...department,
                                managerId: newValue?.id || null,
                                updatedAt: new Date().toISOString()
                              });
                            }
                          }}
                          options={departmentEmployees}
                          getOptionLabel={(option) => option.name}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select department head" />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar sx={{ width: 24, height: 24 }}>
                                  <PersonIcon />
                                </Avatar>
                                <Typography>{option.name}</Typography>
                              </Stack>
                            </Box>
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Deputy Manager
                        </Typography>
                        <Autocomplete
                          value={deputyManager || null}
                          onChange={(_, newValue) => {
                            if (department) {
                              updateDepartment(department.id, {
                                ...department,
                                deputyManagerId: newValue?.id || null,
                                updatedAt: new Date().toISOString()
                              });
                            }
                          }}
                          options={departmentEmployees.filter(e => e.id !== department.managerId)}
                          getOptionLabel={(option) => option.name}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select deputy manager" />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar sx={{ width: 24, height: 24 }}>
                                  <PersonIcon />
                                </Avatar>
                                <Typography>{option.name}</Typography>
                              </Stack>
                            </Box>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Team Members Grid */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6">Team Members</Typography>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setOpenAddEmployeeDialog(true)}
                        variant="outlined"
                        size="small"
                      >
                        Add Member
                      </Button>
                    </Stack>
                    <Grid container spacing={2}>
                      {departmentEmployees.map((employee) => (
                        <Grid item xs={12} sm={6} md={4} key={employee.id}>
                          <Paper sx={{ p: 2 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar>
                                <PersonIcon />
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2">{employee.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {employee.position || 'No position'}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Right Panel - Documents */}
          <Box sx={{ width: '30%', borderLeft: 1, borderColor: 'divider', p: 2, bgcolor: 'grey.50', overflow: 'auto' }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Department Documents</Typography>
                <Button
                  component="label"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  Upload
                  <input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </Stack>
              <List>
                {departmentDocuments.map((doc) => (
                  <ListItem
                    key={doc.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(event) => handleDocumentMenuOpen(event, doc)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <DocumentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.name}
                      secondary={new Date(doc.createdAt).toLocaleDateString()}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>
          </Box>
        </Box>

        {/* Bottom Panel - Organization Chart */}
        <Box sx={{ 
          height: '300px', 
          borderTop: 1, 
          borderColor: 'divider',
          p: 2,
          bgcolor: 'background.default'
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Organization Chart</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                // Handle adding sub-department
              }}
            >
              Add Sub-department
            </Button>
          </Stack>
          <Box sx={{ height: 'calc(100% - 48px)' }}>
            <DraggableOrgChart
              department={department}
              subDepartments={departments.filter(d => d.parentDepartmentId === department.id)}
              employees={departmentEmployees}
              onEmployeeMove={async (employeeId, newDepartmentId) => {
                try {
                  const employee = employees.find(e => e.id === employeeId);
                  if (employee) {
                    await updateEmployee(employee.id, {
                      ...employee,
                      departmentId: newDepartmentId,
                      updatedAt: new Date().toISOString()
                    });
                  }
                } catch (error) {
                  console.error('Error moving employee:', error);
                }
              }}
              onCreateSubDepartment={async (name, description) => {
                try {
                  await addDepartment({
                    name,
                    description,
                    parentDepartmentId: department.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                } catch (error) {
                  console.error('Error creating sub-department:', error);
                }
              }}
              onDeleteSubDepartment={async (subDepartmentId) => {
                try {
                  await deleteDepartment(subDepartmentId);
                } catch (error) {
                  console.error('Error deleting sub-department:', error);
                }
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Document Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDocumentMenuClose}
      >
        <MenuItem onClick={handleDocumentMenuClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDocumentDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
