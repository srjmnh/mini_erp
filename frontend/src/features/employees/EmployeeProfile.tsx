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
  const { supabase } = useSupabase();
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const theme = useTheme();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchEmployeeData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const employeeData = employees.find(e => e.id === id);
        console.log('Fetched employee data:', employeeData);
        
        if (!employeeData) {
          throw new Error('Employee not found');
        }

        if (isMounted) {
          setEmployee(employeeData);
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching employee data:', error);
        if (isMounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    fetchEmployeeData();

    return () => {
      isMounted = false;
    };
  }, [id, employees]);

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

  const getManagerName = (managerId: string | undefined) => {
    if (!managerId) return 'Not Assigned';
    const manager = employees.find(e => e.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Not Assigned';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || !event.target.files[0]) return;
      
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

      console.log('Photo uploaded, public URL:', publicUrl);

      // Update employee record with new photo URL
      await updateEmployee(id, {
        photoUrl: publicUrl,
        updatedAt: new Date().toISOString().split('T')[0]
      });

      console.log('Employee record updated with new photo URL');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
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
      <Paper 
        elevation={0}
        sx={{ 
          p: 4,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ position: 'relative', mb: 3, textAlign: 'center' }}>
              <input
                type="file"
                accept="image/*"
                id="photo-upload"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="photo-upload">
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    cursor: 'pointer',
                    '&:hover .upload-overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    src={employee.photoUrl}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid',
                      borderColor: 'primary.main',
                      boxShadow: theme.shadows[3],
                    }}
                  >
                    {employee.firstName[0]}{employee.lastName[0]}
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
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <CameraAltIcon />
                  </Box>
                </Box>
              </label>
            </Box>
            <Box sx={{ ml: 2 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                {employee.firstName} {employee.lastName}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {employee.position}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  label={employee.status}
                  size="small"
                  sx={{ 
                    bgcolor: employee.status === 'active' ? alpha('#4caf50', 0.2) : alpha('#9e9e9e', 0.2),
                    color: 'white',
                    textTransform: 'capitalize',
                  }}
                />
                <Chip 
                  label={getDepartmentName(employee.departmentId)}
                  size="small"
                  sx={{ 
                    bgcolor: alpha('#ffffff', 0.2),
                    color: 'white',
                  }}
                />
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Email</Typography>
                  <Typography>{employee.email}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Phone</Typography>
                  <Typography>{employee.phone || 'Not provided'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Department</Typography>
                  <Typography>{getDepartmentName(employee.departmentId)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Join Date</Typography>
                  <Typography>{new Date(employee.joinDate).toLocaleDateString()}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Employee ID</Typography>
                  <Typography>{employee.employeeId || id}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Location</Typography>
                  <Typography>{employee.workLocation || 'Not specified'}</Typography>
                </Box>
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
                      label="First Name"
                      value={employee.firstName}
                      onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={employee.lastName}
                      onChange={(e) => handleFieldChange('lastName', e.target.value)}
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
                      label="Date of Birth"
                      type="date"
                      value={employee.dateOfBirth || ''}
                      onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Address"
                      multiline
                      rows={2}
                      value={employee.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Employment Details */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3, mt: 3 }}>Employment Details</Typography>
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
                    <Typography variant="body2" color="text.secondary">
                      Department
                    </Typography>
                    <Typography>
                      {getDepartmentName(employee.departmentId)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Employee ID"
                      value={employee.employeeId || ''}
                      onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Employment Type"
                      value={employee.employmentType || 'Full-time'}
                      onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                    >
                      {['Full-time', 'Part-time', 'Contract', 'Intern'].map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Join Date"
                      type="date"
                      value={employee.joinDate || ''}
                      onChange={(e) => handleFieldChange('joinDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Status"
                      value={employee.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                    >
                      {['active', 'inactive', 'on_leave'].map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>

              {/* Department Info */}
              <Grid item xs={12}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Department Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Department
                        </Typography>
                        <Typography>
                          {getDepartmentName(employee.departmentId)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Reports To
                        </Typography>
                        <Typography>
                          {getManagerName(employee.reportsTo)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Additional Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3, mt: 3 }}>Additional Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Work Location"
                      value={employee.workLocation || ''}
                      onChange={(e) => handleFieldChange('workLocation', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Team"
                      value={employee.team || ''}
                      onChange={(e) => handleFieldChange('team', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Reports To"
                      value={employee.reportsTo || ''}
                      onChange={(e) => handleFieldChange('reportsTo', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Name"
                      value={employee.emergencyContact?.name || ''}
                      onChange={(e) => handleFieldChange('emergencyContact', { 
                        ...employee.emergencyContact,
                        name: e.target.value 
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Phone"
                      value={employee.emergencyContact?.phone || ''}
                      onChange={(e) => handleFieldChange('emergencyContact', {
                        ...employee.emergencyContact,
                        phone: e.target.value
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Salary"
                      type="number"
                      value={employee.salary || ''}
                      onChange={(e) => handleFieldChange('salary', parseFloat(e.target.value))}
                      InputProps={{
                        startAdornment: <span style={{ marginRight: 8 }}>$</span>,
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Save Button */}
              <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveChanges}
                  disabled={!hasChanges}
                >
                  Save Changes
                </Button>
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
          <EquipmentSection
            equipment={employee.equipment || []}
            onSave={handleEquipmentSave}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <OnboardingWizard
            steps={employee.onboardingSteps || []}
            onSave={handleOnboardingSave}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
}
