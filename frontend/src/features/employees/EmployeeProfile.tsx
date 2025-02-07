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
  const { employees, departments, updateEmployee, fetchDepartments } = useFirestore();
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const { supabase } = useSupabase();
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const theme = useTheme();
  const [hasChanges, setHasChanges] = useState(false);
  const [editingReportsTo, setEditingReportsTo] = useState(false);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);

  const getAvailableManagers = (employee: any) => {
    // Show all employees except the current one
    return employees.filter(e => 
      e.id !== employee.id && // Can't report to themselves
      e.status === 'active' // Only show active employees
    ).sort((a, b) => {
      // Sort by position (Department Heads first, then managers, then others)
      if (a.position?.includes('Department Head') && !b.position?.includes('Department Head')) return -1;
      if (!a.position?.includes('Department Head') && b.position?.includes('Department Head')) return 1;
      if (a.position?.includes('Manager') && !b.position?.includes('Manager')) return -1;
      if (!a.position?.includes('Manager') && b.position?.includes('Manager')) return 1;
      // Then sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const getDepartmentHead = (departmentId: string) => {
    if (!departmentId || !departments.length) return null;
    
    const department = departments.find(d => d.id === departmentId);
    if (!department) return null;

    // Try to find department head, manager, or lead
    const deptHead = employees.find(e => 
      e.departmentId === departmentId && 
      (e.position?.toLowerCase().includes('head') || 
       e.position?.toLowerCase().includes('manager') || 
       e.position?.toLowerCase().includes('lead'))
    );

    if (deptHead) {
      console.log('Found department head:', { 
        name: deptHead.name, 
        position: deptHead.position, 
        dept: deptHead.departmentId 
      });
      return { ...deptHead, department };
    }

    return deptHead ? { ...deptHead, department } : null;
  };

  const getManagerName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee?.departmentId) {
      return 'No Department Assigned';
    }
    
    // If employee has a custom reports-to relationship
    if (employee.reportsTo) {
      const manager = employees.find(e => e.id === employee.reportsTo);
      return manager ? manager.name : 'Unknown Manager';
    }
    
    // Find department head
    const head = getDepartmentHead(employee.departmentId);
    return head ? `${head.name} (${head.department.name} ${head.position})` : 'No Department Head';
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

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        await fetchDepartments();
        setDepartmentsLoaded(true);
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, [fetchDepartments]);

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
                    alt={employee.name || 'Employee'}
                    sx={{
                      width: 120,
                      height: 120,
                      border: '4px solid',
                      borderColor: 'primary.main',
                      boxShadow: theme.shadows[3],
                    }}
                  >
                    {employee.name ? employee.name.split(' ').map(n => n[0]).join('') : 'E'}
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
                {employee.name || 'Employee'}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {employee.position}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  select
                  size="small"
                  label="Reports To"
                  value={employee.reportsTo || ''}
                  onChange={(e) => handleFieldChange('reportsTo', e.target.value)}
                  sx={{ minWidth: 250, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
                  InputProps={{
                    sx: { color: 'white', '.MuiSelect-icon': { color: 'white' } }
                  }}
                  InputLabelProps={{
                    sx: { color: 'white' }
                  }}
                >
                  <MenuItem value="">
                    <Stack>
                      <Typography>
                        <em>
                          {(() => {
                            if (!departmentsLoaded || !employee.departmentId) {
                              return 'Loading...';
                            }

                            const head = getDepartmentHead(employee.departmentId);
                            if (head) {
                              return `Default (${head.name} - ${head.department.name} ${head.position})`;
                            }

                            const dept = departments.find(d => d.id === employee.departmentId);
                            return dept ? 
                              `Default (No Head for ${dept.name} Department)` : 
                              'Default (No Department Assigned)';
                          })()} 
                        </em>
                      </Typography>
                    </Stack>
                  </MenuItem>
                  {getAvailableManagers(employee).map((manager) => {
                    const managerDept = departments.find(d => d.id === manager.departmentId);
                    return (
                      <MenuItem key={manager.id} value={manager.id}>
                        <Stack>
                          <Typography>{manager.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {manager.position} • {managerDept?.name || 'No Department'}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </TextField>
                {hasChanges && (
                  <Button 
                    variant="contained" 
                    onClick={handleSaveChanges}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                  >
                    Save Changes
                  </Button>
                )}
              </Box>
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
                  <Typography>{departments.find(d => d.id === employee.departmentId)?.name || 'Not Assigned'}</Typography>
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
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ color: 'white' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>Reports To</Typography>
                  <Typography>
                    {employee.reportsTo ? 
                      employees.find(e => e.id === employee.reportsTo)?.name : 
                      employees.find(e => e.departmentId === employee.departmentId && e.position?.toLowerCase().includes('head'))?.name || 'No Manager'}
                  </Typography>
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
            <Tab 
              icon={<BusinessIcon />} 
              label="Role & Promotion" 
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={employee.name || ''}
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

              {/* Employment Information */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>Employment Information</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Position"
                      value={employee.position || ''}
                      onChange={(e) => handleFieldChange('position', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Department"
                      value={employee.departmentId || ''}
                      onChange={(e) => handleFieldChange('departmentId', e.target.value)}
                    >
                      {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </MenuItem>
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
                      label="Status"
                      value={employee.status || 'active'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="on_leave">On Leave</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Work Location"
                      value={employee.workLocation || ''}
                      onChange={(e) => handleFieldChange('workLocation', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Reporting Structure */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 3 }}>Reporting Structure</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        select
                        fullWidth
                        label="Reports To"
                        value={employee.reportsTo || ''}
                        onChange={(e) => handleFieldChange('reportsTo', e.target.value)}
                        disabled={employee.position?.includes('Department Head')}
                        helperText={
                          employee.position?.includes('Department Head') 
                            ? "Department Heads don't have a reporting manager" 
                            : "Override default reporting structure"
                        }
                      >
                        <MenuItem value="">
                          <Stack>
                            {(() => {
                              console.log('Department ID:', employee.departmentId);
                              console.log('All Employees:', employees.map(e => ({ id: e.id, name: e.name, dept: e.departmentId, pos: e.position })));
                              
                              const deptHead = employees.find(e => 
                                e.departmentId === employee.departmentId && 
                                (e.position?.toLowerCase().includes('head') || 
                                 e.position?.toLowerCase().includes('manager') || 
                                 e.position?.toLowerCase().includes('lead'))
                              );
                              
                              console.log('Found Department Head:', deptHead);
                              const dept = departments.find(d => d.id === employee.departmentId);
                              
                              if (deptHead) {
                                return (
                                  <>
                                    <Typography>
                                      <em>Default ({deptHead.name})</em>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {deptHead.position} • {dept?.name}
                                    </Typography>
                                  </>
                                );
                              }
                              
                              return (
                                <Typography>
                                  <em>No Department Head Assigned for {dept?.name || 'Department'}</em>
                                </Typography>
                              );
                            })()}
                          </Stack>
                        </MenuItem>
                        {getAvailableManagers(employee).map((manager) => (
                          <MenuItem key={manager.id} value={manager.id}>
                            <Stack>
                              <Typography>
                                {manager.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {manager.position} • {departments.find(d => d.id === manager.departmentId)?.name}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </TextField>
                      {hasChanges && (
                        <Button
                          variant="contained"
                          onClick={handleSaveChanges}
                          sx={{ minWidth: 100 }}
                        >
                          Save
                        </Button>
                      )}
                    </Stack>
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

        <TabPanel value={activeTab} index={5}>
          <RoleManagement
            employeeId={id}
            currentRole={employee.role}
            currentSalary={employee.salary || 0}
          />
        </TabPanel>
      </Paper>
    </Box>
  );
}
