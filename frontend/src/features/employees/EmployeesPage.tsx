import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Tooltip,
  useTheme,
  alpha,
  Grid,
  Stack,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useProjects } from '@/contexts/ProjectContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/config/firebase';

// Get Firestore instance
const db = getFirestore(app);

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  salary: number | string;
  status: 'active' | 'inactive';
  photoUrl: string;
  departmentId: string | undefined;
}

interface Employee extends EmployeeFormData {
  id: string;
  name?: string;
  departmentName?: string;
  isDepartmentHead: boolean;
}

interface Department {
  id: string;
  name: string;
  managerId: string | undefined;
}

interface Project {
  id: string;
  name: string;
  status: string;
  members: {
    employeeId: string;
    role: string;
  }[];
}

const initialFormData: EmployeeFormData = {
  firstName: '',
  lastName: '',
  email: '',
  position: '',
  salary: '',
  status: 'active',
  photoUrl: '',
  departmentId: undefined,
};

export default function EmployeesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { employees, departments, addEmployee, updateEmployee, deleteEmployee, loading, error } = useFirestore();
  const { projects } = useProjects();
  const { supabase } = useSupabase();
  const { showSnackbar } = useSnackbar();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleViewProfile = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleEdit = (employee: Employee) => {
    console.log('Editing employee:', employee);
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      position: employee.position,
      salary: employee.salary,
      status: employee.status,
      photoUrl: employee.photoUrl || '',
      departmentId: employee.departmentId,
    });
    setOpen(true);
  };

  const handleDelete = async (employee: Employee) => {
    try {
      // Check if employee is assigned to any active projects
      const activeProjects = projects.filter(project => 
        project.status !== 'completed' && 
        project.members.some(member => member.employeeId === employee.id)
      );

      if (activeProjects.length > 0) {
        showSnackbar(
          `Cannot delete employee. They are currently assigned to ${activeProjects.length} active project(s)`, 
          'error'
        );
        return;
      }

      await deleteEmployee(employee.id);
      showSnackbar('Employee deleted successfully', 'success');
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to delete employee', 'error');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (selectedEmployee) {
        await updateEmployee({
          ...selectedEmployee,
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`,
          updatedAt: new Date().toISOString(),
        });
        showSnackbar('Employee updated successfully', 'success');
      } else {
        await addEmployee({
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showSnackbar('Employee added successfully', 'success');
      }
      setOpen(false);
      setSelectedEmployee(null);
      setFormData(initialFormData);
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : 'An error occurred', 'error');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file || !selectedEmployee) {
      console.error('No file or employee selected');
      return;
    }
    
    try {
      setUploadingPhoto(true);
      console.log('Starting photo upload for employee:', selectedEmployee);
      
      // 1. Upload to Supabase
      const path = `${selectedEmployee.id}/${Date.now()}-${file.name}`;
      console.log('Uploading to Supabase:', { path });
      
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      // 2. Get public URL
      const { data } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(path);

      const publicUrl = data.publicUrl;
      console.log('Got Supabase URL:', publicUrl);

      // 3. Update employee in Firebase directly
      const employeeRef = doc(db, 'employees', selectedEmployee.id);
      console.log('Updating employee photo:', {
        id: selectedEmployee.id,
        photoUrl: publicUrl
      });

      const updateData = {
        photoUrl: publicUrl,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(employeeRef, updateData);

      // 4. Verify the update
      const verifySnap = await getDoc(employeeRef);
      const verifyData = verifySnap.data();
      console.log('Verified employee data:', verifyData);

      if (!verifyData?.photoUrl) {
        throw new Error('Photo URL not saved properly');
      }

      // 5. Update local state
      setFormData(prev => ({
        ...prev,
        photoUrl: publicUrl
      }));

      console.log('Photo upload and save completed successfully');

    } catch (error) {
      console.error('Error in photo upload:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getDepartmentName = (departmentId: string | undefined) => {
    if (!departmentId) return 'Not Assigned';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Not Assigned';
  };

  const getManagerName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee?.departmentId) return 'Not Assigned';
    
    const department = departments.find(d => d.id === employee.departmentId);
    if (!department?.managerId) return 'No Department Head';
    
    const manager = employees.find(e => e.id === department.managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown';
  };

  const isEmployeeDepartmentHead = (employeeId: string) => {
    return departments.some(d => d.managerId === employeeId);
  };

  const getDepartmentHeadOf = (employeeId: string) => {
    const department = departments.find(d => d.managerId === employeeId);
    return department ? department.name : null;
  };

  const filteredEmployees = employees.filter(employee => 
    employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'An error occurred while loading employees'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box 
        sx={{ 
          mb: 4, 
          p: 3,
          borderRadius: 2,
          background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Employees
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.8 }}>
            Manage your organization's workforce
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedEmployee(null);
            setFormData(initialFormData);
            setOpen(true);
          }}
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            '&:hover': {
              bgcolor: alpha('#ffffff', 0.9),
            },
          }}
        >
          Add Employee
        </Button>
      </Box>

      {/* Search */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              '& .MuiInput-underline:before': { borderBottom: 'none' },
              '& .MuiInput-underline:hover:before': { borderBottom: 'none' },
              '& .MuiInput-underline:after': { borderBottom: 'none' },
            }}
          />
        </Box>
      </Paper>

      {/* Employee Grid */}
      <Grid container spacing={3}>
        {filteredEmployees.map((employee) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
            <Card
              onClick={() => handleViewProfile(employee.id)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 3,
                position: 'relative',
                bgcolor: isEmployeeDepartmentHead(employee.id) 
                  ? alpha(theme.palette.primary.main, 0.05)
                  : 'background.paper',
                borderLeft: isEmployeeDepartmentHead(employee.id)
                  ? `6px solid ${theme.palette.primary.main}`
                  : 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              {/* Employee Header with Photo */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar
                    src={employee.photoUrl}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    sx={{
                      width: 56,
                      height: 56,
                      border: `2px solid ${theme.palette.primary.main}`,
                    }}
                  >
                    {employee.firstName[0]}{employee.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {employee.firstName} {employee.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {employee.position}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Status Chip */}
                <Chip
                  label={employee.status}
                  size="small"
                  sx={{
                    bgcolor: employee.status === 'active' 
                      ? alpha(theme.palette.success.main, 0.1)
                      : alpha(theme.palette.error.main, 0.1),
                    color: employee.status === 'active'
                      ? 'success.main'
                      : 'error.main',
                  }}
                />
              </Box>

              {/* Department & Role Info */}
              <Stack spacing={1} sx={{ mt: 'auto' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={getDepartmentName(employee.departmentId)}
                    size="small"
                    sx={{
                      bgcolor: employee.departmentId ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                      color: employee.departmentId ? 'primary.main' : 'text.secondary',
                    }}
                  />
                  {isEmployeeDepartmentHead(employee.id) ? (
                    <Chip
                      label={`Head of ${getDepartmentHeadOf(employee.id)}`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: 'success.main',
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                      Reports to: {getManagerName(employee.id)}
                    </Typography>
                  )}
                </Box>
              </Stack>

              {/* Active Projects */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Active Projects</Typography>
                <Stack spacing={1}>
                  {projects
                    .filter(project => 
                      project.status !== 'completed' && 
                      project.members.some(member => member.employeeId === employee.id)
                    )
                    .map(project => (
                      <Box
                        key={project.id}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'background.default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="body2">{project.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.members.find(m => m.employeeId === employee.id)?.role || 'Team Member'}
                          </Typography>
                        </Box>
                        <Chip
                          label={project.status.replace('_', ' ')}
                          size="small"
                          color={project.status === 'active' ? 'primary' : 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    ))}
                  {!projects.some(project => 
                    project.status !== 'completed' && 
                    project.members.some(member => member.employeeId === employee.id)
                  ) && (
                    <Typography variant="body2" color="text.secondary">
                      No active projects
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {/* Photo Upload */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                id="photo-upload"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
              <Avatar
                src={formData.photoUrl}
                alt="Employee photo"
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  cursor: 'pointer',
                  border: '4px solid',
                  borderColor: 'primary.main',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={() => !uploadingPhoto && document.getElementById('photo-upload')?.click()}
              >
                {formData.firstName?.[0]}
                {formData.lastName?.[0]}
              </Avatar>
              <Button
                variant="outlined"
                size="small"
                onClick={() => !uploadingPhoto && document.getElementById('photo-upload')?.click()}
                disabled={uploadingPhoto}
                sx={{ mb: 2 }}
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Position"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  required
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Department"
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departmentId: e.target.value as string | undefined,
                    })
                  }
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="">Not Assigned</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {selectedEmployee ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
