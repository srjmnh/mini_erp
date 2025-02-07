import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Grid,
  Chip,
  IconButton,
  Divider,
  useTheme,
  alpha,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Person as PersonIcon,
  Description as DocumentIcon,
  Build as EquipmentIcon,
  Psychology as SkillsIcon,
  ListAlt as OnboardingIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  WorkOutline as PositionIcon,
  CalendarToday as JoinDateIcon,
  AttachMoney as SalaryIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../contexts/FirestoreContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import EditDialog from './EditDialog';
import MiniDocumentManager from './MiniDocumentManager';
import SkillsSection from './SkillsSection';
import EquipmentSection from './EquipmentSection';
import OnboardingWizard from './OnboardingWizard';
import PhotoUpload from './PhotoUpload';
import RoleManagement from './RoleManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: theme.shadows[1],
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="subtitle1">
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { employees, departments, updateEmployee } = useFirestore();
  const { uploadFile, supabase } = useSupabase();
  const theme = useTheme();

  // State declarations
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [departmentHead, setDepartmentHead] = useState<any>(null);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingReportsTo, setEditingReportsTo] = useState(false);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);

  // Helper functions
  const getAvailableManagers = (employee: any) => {
    // Get the employee's department
    const employeeDepartment = departments.find(d => d.id === employee.departmentId);
    // Get the department head if exists
    const departmentHead = employeeDepartment?.headId ? 
      employees.find(e => e.id === employeeDepartment.headId) : null;

    // Show all employees except the current one
    return employees.filter(e => 
      e.id !== employee.id && // Can't report to themselves
      e.status === 'active' // Only show active employees
    ).sort((a, b) => {
      // Put department head first if exists
      if (a.id === departmentHead?.id) return -1;
      if (b.id === departmentHead?.id) return 1;
      // Then sort by position
      if (a.position?.includes('Manager') && !b.position?.includes('Manager')) return -1;
      if (!a.position?.includes('Manager') && b.position?.includes('Manager')) return 1;
      // Then sort by name
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  };

  const getDepartmentHead = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (!department?.headId) return null;
    return employees.find(e => e.id === department.headId);
  };

  const getManagerName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return 'Not Found';
    return `${employee.firstName} ${employee.lastName}`;
  };

  const handleUpdateReportsTo = async () => {
    if (!employee || !id) return;

    try {
      setError(null);
      await updateEmployee(id, {
        ...employee,
        reportsTo: selectedManager,
        updatedAt: new Date().toISOString()
      });
      setEmployee(prev => ({ ...prev, reportsTo: selectedManager }));
      setEditingReportsTo(false);
    } catch (error: any) {
      console.error('Error updating reporting manager:', error);
      setError('Failed to update reporting manager: ' + error.message);
    }
  };

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const employeeData = employees.find(e => e.id === id);
        if (!employeeData) {
          setError('Employee not found');
          return;
        }

        setEmployee(employeeData);
        
        // Get department head
        if (employeeData.departmentId) {
          const dept = departments.find(d => d.id === employeeData.departmentId);
          if (dept?.headId) {
            const head = employees.find(e => e.id === dept.headId);
            setDepartmentHead(head);
          }
        }

        // Get available managers
        const managers = employees.filter(e => 
          e.id !== id && 
          e.status === 'active' && 
          (e.currentLevel > (employeeData.currentLevel || 0) || e.id === departmentHead?.id)
        );
        setAvailableManagers(managers);

      } catch (err: any) {
        console.error('Error fetching employee data:', err);
        setError(err.message || 'Error fetching employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, employees, departments]);

  // Event handlers
  const handleSkillsSave = async (newSkills: string[]) => {
    if (!id) return;

    try {
      setError(null);
      await updateEmployee(id, { skills: newSkills });
      setEmployee(prev => ({ ...prev, skills: newSkills }));
    } catch (error: any) {
      console.error('Error saving skills:', error);
      setError('Failed to save skills: ' + error.message);
    }
  };

  const handleEquipmentSave = async (newEquipment: any[]) => {
    if (!id) return;

    try {
      setError(null);
      await updateEmployee(id, { equipment: newEquipment });
      setEmployee(prev => ({ ...prev, equipment: newEquipment }));
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      setError('Failed to save equipment: ' + error.message);
    }
  };

  const handleOnboardingSave = async (newSteps: any[]) => {
    if (!id) return;

    try {
      setError(null);
      await updateEmployee(id, { onboardingSteps: newSteps });
      setEmployee(prev => ({ ...prev, onboardingSteps: newSteps }));
    } catch (error: any) {
      console.error('Error saving onboarding steps:', error);
      setError('Failed to save onboarding steps: ' + error.message);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEmployee(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      await updateEmployee(id, employee);
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setError('Failed to save changes: ' + error.message);
    }
  };

  const getDepartmentName = (departmentId: string | undefined) => {
    if (!departmentId) return 'Not Assigned';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Not Assigned';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    
    try {
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}_${Date.now()}.${fileExt}`;
      const filePath = `employee_photos/${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = await supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      // Update employee record
      await updateEmployee(id, {
        ...employee,
        photoUrl: publicUrl,
        updatedAt: new Date().toISOString()
      });
      setEmployee(prev => ({ ...prev, photoUrl: publicUrl }));
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo');
    }
  };

  if (!id) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No employee ID provided</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Employee not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Section */}
      <Box sx={{ mb: 2, bgcolor: 'primary.main', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, gap: 2 }}>
          <input
            type="file"
            accept="image/*"
            id="photo-upload"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
          <label htmlFor="photo-upload">
            <Box sx={{ position: 'relative', cursor: 'pointer' }}>
              <Avatar
                src={employee.photoUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                sx={{
                  width: 48,
                  height: 48,
                  border: '2px solid',
                  borderColor: 'primary.contrastText'
                }}
              >
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </Avatar>
              <Box
                className="upload-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '50%',
                  opacity: 0,
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': { opacity: 1 }
                }}
              >
                <CameraAltIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
          </label>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'primary.contrastText' }}>
                  {`${employee.firstName} ${employee.lastName}`}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>
                  {employee.position || 'Unassigned'} {employee.currentLevel ? `• Level ${employee.currentLevel}` : ''}
                </Typography>
              </Box>
              <Chip 
                label={departments.find(d => d.id === employee.departmentId)?.name || 'Unassigned'}
                size="small"
                sx={{ 
                  height: 20,
                  bgcolor: alpha('#fff', 0.1),
                  color: 'primary.contrastText',
                  '& .MuiChip-label': { px: 1, fontSize: '0.75rem' }
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
              bgcolor: 'background.default'
            }}
          >
            <Tab label="Info" />
            <Tab label="Documents" />
            <Tab label="Skills" />
            <Tab label="Equipment" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Personal Information */}
                <Grid item xs={12}>
                  <Box sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Personal Information</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={`${employee.firstName} ${employee.lastName}`}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          value={employee.email}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={employee.phone || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Join Date"
                      value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

              {/* Address Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Address</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={employee.address?.street || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={employee.address?.city || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={employee.address?.state || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Pin Code"
                      value={employee.address?.pincode || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Employment Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Employment Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={departments.find(d => d.id === employee.departmentId)?.name || 'Not Assigned'}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={employee.position || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Level"
                      value={employee.currentLevel || ''}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Status"
                      value={employee.status || 'active'}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Section */}
      <Paper 
        elevation={0}
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
              },
            }}
          >
            <Tab 
              icon={<PersonIcon />} 
              label="Info" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<DocumentIcon />} 
              label="Documents" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<SkillsIcon />} 
              label="Skills" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<SalaryIcon />} 
              label="Role & Salary" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<EquipmentIcon />} 
              label="Equipment" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<OnboardingIcon />} 
              label="Onboarding" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box component="form" sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>Personal Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={employee.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={employee.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={employee.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={employee.role}
                      onChange={(e) => handleFieldChange('role', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={employee.department}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Join Date"
                      type="date"
                      value={employee.joiningDate || ''}
                      onChange={(e) => handleFieldChange('joiningDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  {/* Address Fields */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={employee.address?.street || ''}
                      onChange={(e) => handleFieldChange('address', { ...employee.address, street: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={employee.address?.city || ''}
                      onChange={(e) => handleFieldChange('address', { ...employee.address, city: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={employee.address?.state || ''}
                      onChange={(e) => handleFieldChange('address', { ...employee.address, state: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Pin Code"
                      value={employee.address?.pincode || ''}
                      onChange={(e) => handleFieldChange('address', { ...employee.address, pincode: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Employment Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>Employment Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={employee.position}
                      onChange={(e) => handleFieldChange('position', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={employee.department}
                      onChange={(e) => handleFieldChange('department', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Level"
                      value={employee.currentLevel}
                      onChange={(e) => handleFieldChange('currentLevel', parseInt(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Salary"
                      value={employee.salary}
                      onChange={(e) => handleFieldChange('salary', parseFloat(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Status"
                      value={employee.status || 'active'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Skills"
                      value={employee.skills?.join(', ') || ''}
                      onChange={(e) => handleFieldChange('skills', e.target.value.split(',').map(s => s.trim()))}
                      helperText="Enter skills separated by commas"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Reporting Structure */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>Reporting Structure</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Stack spacing={2}>
                      {/* Department Head Info */}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Department Head
                        </Typography>
                        <Typography>
                          {(() => {
                            const departmentHead = getDepartmentHead(employee.departmentId);
                            if (departmentHead) {
                              return `${departmentHead.firstName} ${departmentHead.lastName}`;
                            }
                            return 'No Department Head Assigned';
                          })()}
                        </Typography>
                      </Box>

                      {/* Direct Manager Selection */}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Direct Manager
                        </Typography>
                        <TextField
                          select
                          fullWidth
                          value={employee.reportsTo || ''}
                          onChange={(e) => handleFieldChange('reportsTo', e.target.value)}
                          disabled={employee.position?.includes('Department Head')}
                          helperText={
                            employee.position?.includes('Department Head') 
                              ? "Department Heads don't have a reporting manager" 
                              : "Select a direct manager if different from Department Head"
                          }
                        >
                          <MenuItem value="">
                            <em>Default (Department Head)</em>
                          </MenuItem>
                          {getAvailableManagers(employee).map((manager) => (
                            <MenuItem key={manager.id} value={manager.id}>
                              <Stack>
                                <Typography>
                                  {manager.firstName} {manager.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {manager.position} • {departments.find(d => d.id === manager.departmentId)?.name}
                                </Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Stack>
                    {hasChanges && (
                      <Button
                        variant="contained"
                        onClick={handleSaveChanges}
                        sx={{ mt: 2, minWidth: 100 }}
                      >
                        Save
                      </Button>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <MiniDocumentManager employeeId={id} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <SkillsSection
            skills={employee.skills || []}
            onSave={handleSkillsSave}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <RoleManagement
            employeeId={id}
            currentRole={employee.role}
            currentSalary={employee.salary}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <EquipmentSection
            equipment={employee.equipment || []}
            onSave={handleEquipmentSave}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <OnboardingWizard
            steps={employee.onboardingSteps || []}
            onSave={handleOnboardingSave}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
}
