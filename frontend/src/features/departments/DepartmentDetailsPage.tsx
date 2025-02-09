import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Paper,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemButton,
  DialogContentText,
  FormEvent,
  Chip,
  Container,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  PersonOutline as PersonOutlineIcon,
  Computer as ComputerIcon,
  Print as PrinterIcon,
  Phone as PhoneIcon,
  Chair as ChairIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import type { Department, Employee } from '@/types/models';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { DepartmentDocuments } from './DepartmentDocuments';
import { format } from 'date-fns';

interface DepartmentStats {
  totalMembers: number;
  performanceScore: number;
}

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  field: string;
  value: any;
  onSave: (value: any) => void;
  title: string;
}

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onClose,
  field,
  value,
  onSave,
  title,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();

  useEffect(() => {
    if (field === 'head' || field === 'deputy') {
      setSelectedEmployee(value);
    } else {
      setInputValue(value || '');
    }
  }, [field, value]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (field !== 'head' && field !== 'deputy') return;
      
      setLoading(true);
      try {
        const employeesRef = collection(db, 'employees');
        // Query only employees from current department
        const q = query(employeesRef, where('departmentId', '==', id));
        const employeesSnap = await getDocs(q);
        const employeesList = employeesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.name || 'Unnamed Employee'
          } as Employee;
        });

        // Sort employees by name
        employeesList.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setEmployees(employeesList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
      setLoading(false);
    };

    if (open && (field === 'head' || field === 'deputy')) {
      fetchEmployees();
    }
  }, [open, field, id]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (field === 'head' || field === 'deputy') {
      onSave(selectedEmployee);
    } else {
      onSave(inputValue);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSave}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {field === 'head' || field === 'deputy' ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Select a member from the current department to assign as {field === 'head' ? 'Department Head' : 'Deputy Head'}.
              </DialogContentText>
              <FormControl fullWidth>
                <InputLabel id="employee-select-label">Select Employee</InputLabel>
                <Select
                  labelId="employee-select-label"
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const employee = employees.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(employee || null);
                  }}
                  label="Select Employee"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {loading ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        Loading employees...
                      </Box>
                    </MenuItem>
                  ) : employees.length === 0 ? (
                    <MenuItem disabled>
                      <em>No department members available</em>
                    </MenuItem>
                  ) : (
                    employees.map((employee) => (
                      <MenuItem 
                        key={employee.id} 
                        value={employee.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24,
                            bgcolor: 'primary.main',
                            fontSize: '0.875rem'
                          }}
                        >
                          {employee.name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography>
                            {employee.name}
                          </Typography>
                          {employee.position && (
                            <Typography variant="caption" color="text.secondary">
                              {employee.position}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </>
          ) : (
            <TextField
              fullWidth
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              margin="dense"
              variant="outlined"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={field === 'head' || field === 'deputy' ? !selectedEmployee : !inputValue.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  onConfirm: () => void;
}

const TransferDialog: React.FC<TransferDialogProps> = ({ open, onClose, employee, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Transfer Employee</DialogTitle>
      <DialogContent>
        <Box>
          <Typography>
            {employee.name} is currently assigned to another department. 
            Would you like to transfer them to this department?
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AddMembersDialogProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  currentMembers: Employee[];
}

const AddMembersDialog: React.FC<AddMembersDialogProps> = ({ open, onClose, departmentId, currentMembers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesRef = collection(db, 'employees');
        const employeesSnap = await getDocs(employeesRef);
        const allEmployees = employeesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure name is set, fallback to firstName + lastName if name is not present
            name: data.name || 'Unnamed Employee'
          } as Employee;
        });
        
        // Filter out current members
        const availableEmployees = allEmployees.filter(
          emp => !currentMembers.some(member => member.id === emp.id)
        );
        
        setEmployees(availableEmployees);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching employees:', error);
        showSnackbar('Failed to load employees', 'error');
        setLoading(false);
      }
    };

    if (open) {
      fetchEmployees();
    }
  }, [open, currentMembers]);

  const handleEmployeeSelect = async (employee: Employee) => {
    setSelectedEmployee(employee);
    if (employee.departmentId) {
      setShowTransferDialog(true);
    } else {
      await handleAddMember(employee);
    }
  };

  const handleAddMember = async (employee: Employee) => {
    try {
      const batch = writeBatch(db);

      // If employee is a head of another department, clean up old department
      if (employee.departmentId) {
        const oldDeptRef = doc(db, 'departments', employee.departmentId);
        const oldDeptSnap = await getDoc(oldDeptRef);
        
        if (oldDeptSnap.exists()) {
          const oldDeptData = oldDeptSnap.data();
          // Clean up department head/deputy references
          if (oldDeptData.headId === employee.id) {
            batch.update(oldDeptRef, {
              headId: null,
              head: null,
              updatedAt: new Date().toISOString()
            });
            // Update employee position
            batch.update(doc(db, 'employees', employee.id), {
              position: employee.position === 'Department Head' ? null : employee.position,
              departmentId,
              updatedAt: new Date().toISOString()
            });
          } else if (oldDeptData.deputyId === employee.id) {
            batch.update(oldDeptRef, {
              deputyId: null,
              deputy: null,
              updatedAt: new Date().toISOString()
            });
            // Update employee position
            batch.update(doc(db, 'employees', employee.id), {
              position: employee.position === 'Deputy Head' ? null : employee.position,
              departmentId,
              updatedAt: new Date().toISOString()
            });
          } else {
            // Regular member transfer
            batch.update(doc(db, 'employees', employee.id), {
              departmentId,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } else {
        // New member addition
        batch.update(doc(db, 'employees', employee.id), {
          departmentId,
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();
      showSnackbar('Employee added successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Error adding employee:', error);
      showSnackbar('Failed to add employee', 'error');
    }
  };

  const handleTransferConfirm = async () => {
    if (selectedEmployee) {
      await handleAddMember(selectedEmployee);
      setShowTransferDialog(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchTerm = searchQuery.toLowerCase();
    const fullName = (emp.name || '').toLowerCase();
    const position = (emp.position || '').toLowerCase();
    return fullName.includes(searchTerm) || position.includes(searchTerm);
  });

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Department Members</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredEmployees.length === 0 ? (
            <Typography color="text.secondary" align="center" py={3}>
              No employees available
            </Typography>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredEmployees.map((employee) => (
                <ListItemButton
                  key={employee.id}
                  onClick={() => handleEmployeeSelect(employee)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: employee.departmentId ? 'warning.light' : 'primary.light' }}>
                      {employee.name?.[0] || 'U'}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={employee.name}
                    secondary={
                      <Box component="span">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {employee.position || 'No Position'}
                          </Typography>
                          {employee.departmentId && (
                            <Tooltip title="Currently in another department">
                              <Box
                                sx={{
                                  bgcolor: 'warning.light',
                                  color: 'warning.dark',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.75rem',
                                }}
                              >
                                Transfer Required
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {selectedEmployee && (
        <TransferDialog
          open={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          employee={selectedEmployee}
          onConfirm={handleTransferConfirm}
        />
      )}
    </>
  );
};

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
      id={`department-tabpanel-${index}`}
      aria-labelledby={`department-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  assignedTo?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warranty?: string;
}

const assetTypes = [
  { type: 'computer', label: 'Computer/Laptop', icon: <ComputerIcon /> },
  { type: 'printer', label: 'Printer/Scanner', icon: <PrinterIcon /> },
  { type: 'phone', label: 'Phone/Mobile', icon: <PhoneIcon /> },
  { type: 'furniture', label: 'Furniture', icon: <ChairIcon /> },
  { type: 'other', label: 'Other', icon: <InventoryIcon /> }
];

interface AddAssetDialogProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  onAssetAdded: () => void;
}

const AddAssetDialog: React.FC<AddAssetDialogProps> = ({
  open,
  onClose,
  departmentId,
  onAssetAdded
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyEndDate: ''
  });
  const { showSnackbar } = useSnackbar();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assetsRef = collection(db, 'assets');
      await addDoc(assetsRef, {
        ...formData,
        departmentId,
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showSnackbar('Asset added successfully', 'success');
      onAssetAdded();
      onClose();
    } catch (error) {
      console.error('Error adding asset:', error);
      showSnackbar('Failed to add asset', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Asset Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl fullWidth required>
              <InputLabel>Asset Type</InputLabel>
              <Select
                value={formData.type}
                label="Asset Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {assetTypes.map((type) => (
                  <MenuItem key={type.type} value={type.type}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {type.icon}
                      <Typography>{type.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Serial Number"
              fullWidth
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
            <TextField
              label="Purchase Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
            <TextField
              label="Warranty End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.warrantyEndDate}
              onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Add Asset</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface AssignProjectDialogProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  onProjectAssigned: () => void;
}

const AssignProjectDialog: React.FC<AssignProjectDialogProps> = ({
  open,
  onClose,
  departmentId,
  onProjectAssigned
}) => {
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSnackbar } = useSnackbar();
  const { departments } = useFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('status', '!=', 'completed'));
        const querySnapshot = await getDocs(q);
        const projectsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter out projects that are already assigned to this department
        const filteredProjects = projectsList.filter(project => 
          !project.departments?.some(dept => dept.id === departmentId)
        );
        
        setAvailableProjects(filteredProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        showSnackbar('Failed to load projects', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchProjects();
    }
  }, [open, departmentId]);

  const handleAssignProject = async (projectId: string) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      const projectData = projectDoc.data();
      
      // Get current departments or initialize empty array
      const currentDepartments = projectData?.departments || [];
      
      // Check if department is already assigned
      if (currentDepartments.some(dept => dept.id === departmentId)) {
        showSnackbar('Project is already assigned to this department', 'warning');
        return;
      }

      // Add new department to the array
      const updatedDepartments = [
        ...currentDepartments,
        {
          id: departmentId,
          name: departments.find(d => d.id === departmentId)?.name || '',
          assignedAt: new Date().toISOString()
        }
      ];

      await updateDoc(projectRef, {
        departments: updatedDepartments,
        updatedAt: new Date().toISOString()
      });

      showSnackbar('Project assigned successfully', 'success');
      onProjectAssigned();
      onClose();
    } catch (error) {
      console.error('Error assigning project:', error);
      showSnackbar('Failed to assign project', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assign Project to Department</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : availableProjects.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>No available projects found</Alert>
        ) : (
          <Grid container spacing={2}>
            {availableProjects.map((project) => (
              <Grid item xs={12} key={project.id}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <WorkIcon color="primary" />
                      <Typography variant="subtitle1">{project.name}</Typography>
                      <Stack direction="row" spacing={1} ml="auto">
                        <Chip 
                          label={project.status} 
                          size="small"
                          color={
                            project.status === 'completed' ? 'success' :
                            project.status === 'in_progress' ? 'warning' :
                            project.status === 'review' ? 'info' :
                            'default'
                          }
                        />
                        <Chip 
                          label={project.priority} 
                          size="small"
                          color={
                            project.priority === 'high' ? 'error' :
                            project.priority === 'medium' ? 'warning' :
                            'default'
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleAssignProject(project.id)}
                        >
                          Assign
                        </Button>
                      </Stack>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {project.description}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Chip 
                        icon={<CalendarIcon />}
                        label={project.endDate ? format(new Date(project.endDate), 'PP') : 'No end date'}
                        size="small"
                      />
                      <Chip 
                        icon={<GroupIcon />}
                        label={`${project.members?.length || 0} members`}
                        size="small"
                      />
                      {project.progress !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                          <Typography variant="body2" color="text.secondary">
                            Progress:
                          </Typography>
                          <Typography variant="body2" color="text.primary">
                            {project.progress}%
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const DepartmentAssets = ({ departmentId }: { departmentId: string }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchAssets = async () => {
    try {
      const assetsRef = collection(db, 'assets');
      const q = query(assetsRef, where('departmentId', '==', departmentId));
      const querySnapshot = await getDocs(q);
      const assetsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Asset));
      setAssets(assetsList);
    } catch (error) {
      console.error('Error fetching assets:', error);
      showSnackbar('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [departmentId]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Department Assets</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => setAddAssetDialogOpen(true)}
        >
          Add Asset
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : assets.length === 0 ? (
        <Alert severity="info">No assets found for this department</Alert>
      ) : (
        <Grid container spacing={2}>
          {assetTypes.map((type) => {
            const typeAssets = assets.filter(asset => asset.type === type.type);
            if (typeAssets.length === 0) return null;

            return (
              <Grid item xs={12} key={type.type}>
                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    {type.icon}
                    <Typography variant="subtitle1">{type.label}</Typography>
                    <Chip 
                      label={`${typeAssets.length} items`} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 'auto' }} 
                    />
                  </Stack>
                  <List dense>
                    {typeAssets.map((asset) => (
                      <ListItem
                        key={asset.id}
                        secondaryAction={
                          <Chip 
                            label={asset.status} 
                            size="small"
                            color={asset.status === 'available' ? 'success' : 'warning'}
                          />
                        }
                      >
                        <ListItemIcon>
                          {type.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={asset.name}
                          secondary={asset.assignedTo ? `Assigned to: ${asset.assignedTo}` : 'Unassigned'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      <AddAssetDialog
        open={addAssetDialogOpen}
        onClose={() => setAddAssetDialogOpen(false)}
        departmentId={departmentId}
        onAssetAdded={fetchAssets}
      />
    </Box>
  );
};

const DepartmentProjects = ({ departmentId }: { departmentId: string }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignProjectDialogOpen, setAssignProjectDialogOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, 'projects');
      const querySnapshot = await getDocs(projectsRef);
      
      // Filter projects that have this department in their departments array
      const projectsList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(project => 
          project.departments?.some(dept => dept.id === departmentId)
        );
        
      setProjects(projectsList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showSnackbar('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [departmentId]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Department Projects</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => setAssignProjectDialogOpen(true)}
        >
          Assign Project
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : projects.length === 0 ? (
        <Alert severity="info">No projects assigned to this department</Alert>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid item xs={12} md={6} key={project.id}>
              <Paper 
                sx={{ 
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <WorkIcon color="primary" />
                    <Typography variant="subtitle1">{project.name}</Typography>
                    <Stack direction="row" spacing={1} ml="auto">
                      <Chip 
                        label={project.status} 
                        size="small"
                        color={
                          project.status === 'completed' ? 'success' :
                          project.status === 'in_progress' ? 'warning' :
                          project.status === 'review' ? 'info' :
                          'default'
                        }
                      />
                      <Chip 
                        label={project.priority} 
                        size="small"
                        color={
                          project.priority === 'high' ? 'error' :
                          project.priority === 'medium' ? 'warning' :
                          'default'
                        }
                      />
                    </Stack>
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary">
                    {project.description || 'No description provided'}
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip 
                      icon={<CalendarIcon />}
                      label={project.endDate ? format(new Date(project.endDate), 'PP') : 'No end date'}
                      size="small"
                    />
                    <Chip 
                      icon={<GroupIcon />}
                      label={`${project.members?.length || 0} members`}
                      size="small"
                    />
                    {project.progress !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <Typography variant="body2" color="text.secondary">
                          Progress:
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          {project.progress}%
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <AssignProjectDialog
        open={assignProjectDialogOpen}
        onClose={() => setAssignProjectDialogOpen(false)}
        departmentId={departmentId}
        onProjectAssigned={fetchProjects}
      />
    </Box>
  );
};

const DepartmentDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showSnackbar } = useSnackbar();
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [departmentEmployees, setDepartmentEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats>({
    totalMembers: 0,
    performanceScore: 85
  });

  // Edit dialog state
  const [editDialog, setEditDialog] = useState({
    open: false,
    field: '',
    value: null,
    title: ''
  });

  // Add members dialog state
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleEditClick = (field: string, currentValue: any, title: string) => {
    setEditDialog({
      open: true,
      field,
      value: currentValue,
      title
    });
  };

  const handleSaveField = async (field: string, value: any) => {
    if (!id || !department) return;

    try {
      const batch = writeBatch(db);
      const departmentRef = doc(db, 'departments', id);
      const updateData: any = {};

      if (field === 'head' || field === 'deputy') {
        if (value) {
          // Update the department with new head/deputy
          updateData[`${field}Id`] = value.id;
          updateData[field] = {
            id: value.id,
            name: value.name,
            email: value.email
          };

          // Update the employee's role
          const employeeRef = doc(db, 'employees', value.id);
          batch.update(employeeRef, {
            role: field === 'head' ? 'Department Head' : 'Deputy Head',
            isManager: true,
            updatedAt: new Date().toISOString()
          });

          // If setting a new head
          if (field === 'head') {
            // Update all department employees to have this head as their manager
            const departmentEmployeesRef = collection(db, 'employees');
            const departmentEmployeesQuery = query(departmentEmployeesRef, where('departmentId', '==', id));
            const employeesSnapshot = await getDocs(departmentEmployeesQuery);

            employeesSnapshot.docs.forEach(empDoc => {
              // Don't update the head's own managerId
              if (empDoc.id !== value.id) {
                batch.update(doc(db, 'employees', empDoc.id), {
                  managerId: value.id,
                  updatedAt: new Date().toISOString()
                });
              }
            });

            // Remove old head if exists
            if (department.headId && department.headId !== value.id) {
              const oldHeadRef = doc(db, 'employees', department.headId);
              batch.update(oldHeadRef, {
                role: 'Employee',
                isManager: false,
                updatedAt: new Date().toISOString()
              });
            }
          } else {
            // If setting deputy, their manager should be the department head
            if (department.headId) {
              batch.update(employeeRef, {
                managerId: department.headId,
                updatedAt: new Date().toISOString()
              });
            }

            // Remove old deputy if exists
            if (department.deputyId && department.deputyId !== value.id) {
              const oldDeputyRef = doc(db, 'employees', department.deputyId);
              batch.update(oldDeputyRef, {
                role: 'Employee',
                isManager: false,
                updatedAt: new Date().toISOString()
              });
            }
          }
        } else {
          // Removing head/deputy
          if (field === 'head') {
            updateData.headId = null;
            updateData.head = null;
            
            if (department.headId) {
              // Remove the head role from the employee
              const oldHeadRef = doc(db, 'employees', department.headId);
              batch.update(oldHeadRef, {
                role: 'Employee',
                isManager: false,
                updatedAt: new Date().toISOString()
              });

              // Remove this manager from all department employees
              const departmentEmployeesRef = collection(db, 'employees');
              const departmentEmployeesQuery = query(departmentEmployeesRef, where('departmentId', '==', id));
              const employeesSnapshot = await getDocs(departmentEmployeesQuery);

              employeesSnapshot.docs.forEach(empDoc => {
                if (empDoc.data().managerId === department.headId) {
                  batch.update(doc(db, 'employees', empDoc.id), {
                    managerId: null,
                    updatedAt: new Date().toISOString()
                  });
                }
              });
            }
          } else {
            updateData.deputyId = null;
            updateData.deputy = null;
            
            if (department.deputyId) {
              const oldDeputyRef = doc(db, 'employees', department.deputyId);
              batch.update(oldDeputyRef, {
                role: 'Employee',
                isManager: false,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      } else {
        // Handle other fields
        updateData[field] = value;
      }

      batch.update(departmentRef, updateData);
      await batch.commit();
      
      showSnackbar('Department updated successfully', 'success');
      setEditDialog({ open: false, field: '', value: null, title: '' });
    } catch (error) {
      console.error('Error updating department:', error);
      showSnackbar('Failed to update department', 'error');
    }
  };

  useEffect(() => {
    if (!id) return;

    const unsubscribeDepartment = onSnapshot(
      doc(db, 'departments', id),
      async (docSnap) => {
        if (docSnap.exists()) {
          const departmentData = docSnap.data();
          
          // Fetch head details if exists
          let headData = null;
          if (departmentData.headId) {
            const headSnap = await getDoc(doc(db, 'employees', departmentData.headId));
            if (headSnap.exists()) {
              const data = headSnap.data();
              headData = {
                id: headSnap.id,
                ...data,
                name: data.name || 'Unnamed Employee'
              };
            }
          }

          // Fetch deputy details if exists
          let deputyData = null;
          if (departmentData.deputyId) {
            const deputySnap = await getDoc(doc(db, 'employees', departmentData.deputyId));
            if (deputySnap.exists()) {
              const data = deputySnap.data();
              deputyData = {
                id: deputySnap.id,
                ...data,
                name: data.name || 'Unnamed Employee'
              };
            }
          }

          setDepartment({
            id: docSnap.id,
            ...departmentData,
            head: headData,
            deputy: deputyData
          });
        }
      }
    );

    // Fetch department employees
    const unsubscribeEmployees = onSnapshot(
      query(collection(db, 'employees'), where('departmentId', '==', id)),
      (querySnapshot) => {
        const employees = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setDepartmentEmployees(employees);
      }
    );

    return () => {
      unsubscribeDepartment();
      unsubscribeEmployees();
    };
  }, [id]);

  const getReportingManager = (employee: Employee) => {
    if (!department) return 'No Department Head';
    
    if (department.headId === employee.id) {
      return 'Department Head';
    }
    
    if (department.head) {
      return department.head.name || 'Unnamed Employee';
    }
    
    return 'No Department Head';
  };

  const renderEmployeeList = () => {
    return departmentEmployees.map((employee) => (
      <ListItem
        key={employee.id}
        sx={{
          borderRadius: 1,
          mb: 1,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <ListItemIcon>
          <Avatar sx={{ bgcolor: employee.id === department?.headId ? 'primary.main' : 'grey.400' }}>
            {employee.name?.[0] || 'U'}
          </Avatar>
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>{employee.name}</Typography>
              {employee.id === department?.headId && (
                <Chip
                  size="small"
                  label="Department Head"
                  color="primary"
                  sx={{ height: 20 }}
                />
              )}
              {employee.id === department?.deputyId && (
                <Chip
                  size="small"
                  label="Deputy Head"
                  color="success"
                  sx={{ height: 20 }}
                />
              )}
            </Box>
          }
          secondary={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {employee.position || 'No Position'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                •
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reports to: {getReportingManager(employee)}
              </Typography>
            </Stack>
          }
        />
        <IconButton
          size="small"
          onClick={() => handleRemoveMember(employee.id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon />
        </IconButton>
      </ListItem>
    ));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get department data
      const departmentRef = doc(db, 'departments', id!);
      const departmentSnap = await getDoc(departmentRef);
      
      if (!departmentSnap.exists()) {
        throw new Error('Department not found');
      }
      
      const deptData = { id: departmentSnap.id, ...departmentSnap.data() } as Department;
      setDepartment(deptData);
      
      // Get all employees in a single query
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where("departmentId", "==", deptData.id));
      const employeesSnap = await getDocs(q);
      
      const deptEmployees = employeesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : (data.firstName || data.lastName || 'Unnamed Employee')),
          position: data.position || 'No Position',
          departmentId: data.departmentId || null
        };
      });
      
      setDepartmentEmployees(deptEmployees);
      setFilteredEmployees(deptEmployees);

      // Update department stats
      const stats = {
        totalMembers: deptEmployees.length,
        performanceScore: deptData.performanceScore || 85
      };
      setDepartmentStats(stats);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching department data:', error);
      setError('Failed to load department data');
      setLoading(false);
    }
  };

  const filterEmployees = (searchTerm: string) => {
    if (departmentEmployees) {
      const filtered = departmentEmployees.filter(emp => {
        const term = searchTerm.toLowerCase();
        const employeeName = getEmployeeDisplayName(emp).toLowerCase();
        const position = (emp.position || '').toLowerCase();
        return employeeName.includes(term) || position.includes(term);
      });
      setFilteredEmployees(filtered);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    filterEmployees(newSearchQuery);
  };

  const handleAddMember = async (employeeId: string) => {
    try {
      const batch = writeBatch(db);
      const employeeRef = doc(db, 'employees', employeeId);
      const employeeSnap = await getDoc(employeeRef);
      
      if (!employeeSnap.exists()) {
        throw new Error('Employee not found');
      }

      const employeeData = employeeSnap.data();
      const departmentRef = doc(db, 'departments', id!);
      const departmentSnap = await getDoc(departmentRef);

      if (departmentSnap.exists()) {
        const deptData = departmentSnap.data();
        
        // If employee is head or deputy, clean up department references
        if (deptData.headId === employeeId) {
          batch.update(departmentRef, {
            headId: null,
            head: null,
            updatedAt: new Date().toISOString()
          });
          // Update employee position
          batch.update(employeeRef, {
            departmentId: null,
            position: null, // Clear position if they were Department Head
            updatedAt: new Date().toISOString()
          });
        } else if (deptData.deputyId === employeeId) {
          batch.update(departmentRef, {
            deputyId: null,
            deputy: null,
            updatedAt: new Date().toISOString()
          });
          // Update employee position
          batch.update(employeeRef, {
            departmentId: null,
            position: null, // Clear position if they were Deputy Head
            updatedAt: new Date().toISOString()
          });
        } else {
          // Regular member removal
          batch.update(employeeRef, {
            departmentId: null,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      showSnackbar('Employee removed successfully', 'success');
    } catch (error) {
      console.error('Error removing employee:', error);
      showSnackbar('Failed to remove employee', 'error');
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    try {
      const batch = writeBatch(db);
      const employeeRef = doc(db, 'employees', employeeId);
      const employeeSnap = await getDoc(employeeRef);
      
      if (!employeeSnap.exists()) {
        throw new Error('Employee not found');
      }

      const employeeData = employeeSnap.data();
      const departmentRef = doc(db, 'departments', id!);
      const departmentSnap = await getDoc(departmentRef);

      if (departmentSnap.exists()) {
        const deptData = departmentSnap.data();
        
        // If employee is head or deputy, clean up department references
        if (deptData.headId === employeeId) {
          batch.update(departmentRef, {
            headId: null,
            head: null,
            updatedAt: new Date().toISOString()
          });
          // Update employee position
          batch.update(employeeRef, {
            departmentId: null,
            position: null, // Clear position if they were Department Head
            updatedAt: new Date().toISOString()
          });
        } else if (deptData.deputyId === employeeId) {
          batch.update(departmentRef, {
            deputyId: null,
            deputy: null,
            updatedAt: new Date().toISOString()
          });
          // Update employee position
          batch.update(employeeRef, {
            departmentId: null,
            position: null, // Clear position if they were Deputy Head
            updatedAt: new Date().toISOString()
          });
        } else {
          // Regular member removal
          batch.update(employeeRef, {
            departmentId: null,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      showSnackbar('Employee removed successfully', 'success');
    } catch (error) {
      console.error('Error removing employee:', error);
      showSnackbar('Failed to remove employee', 'error');
    }
  };

  const handleAddMembersClick = () => {
    setAddMembersDialogOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const getEmployeeDisplayName = (employee: Employee) => {
    return employee.name || 'Unnamed Employee';
  };

  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!department) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header Section */}
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <IconButton 
            onClick={() => navigate('/departments')} 
            size="small"
            sx={{ 
              bgcolor: 'white',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="500">
            {department?.name || 'Loading...'}
          </Typography>
        </Stack>

        {/* Department Info Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 4, 
            bgcolor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Box>
                  <Stack 
                    direction="row" 
                    spacing={2} 
                    alignItems="center" 
                    sx={{ 
                      mb: 3,
                      pb: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: '#E3F2FD',
                        borderRadius: 1,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <DescriptionIcon sx={{ color: '#1976D2' }} />
                    </Box>
                    <Typography variant="h6" color="primary" fontWeight="500">
                      Department Information
                    </Typography>
                  </Stack>
                </Box>
                
                <Box>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick('description', department?.description || '', 'Description')}
                        sx={{ 
                          bgcolor: '#F5F5F5',
                          '&:hover': { bgcolor: '#E0E0E0' }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Typography sx={{ color: '#424242' }}>
                      {department?.description || 'No description available'}
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick('location', department?.location || '', 'Location')}
                        sx={{ 
                          bgcolor: '#F5F5F5',
                          '&:hover': { bgcolor: '#E0E0E0' }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Typography sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#424242'
                    }}>
                      <LocationIcon sx={{ mr: 1, color: '#757575' }} />
                      {department?.location || 'Not specified'}
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#424242'
                    }}>
                      <CalendarIcon sx={{ mr: 1, color: '#757575' }} />
                      {department?.createdAt ? formatDate(department.createdAt) : 'Not available'}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Stack 
                  direction="row" 
                  spacing={2} 
                  alignItems="center" 
                  sx={{ 
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: '#E8F5E9',
                      borderRadius: 1,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <AssessmentIcon sx={{ color: '#2E7D32' }} />
                  </Box>
                  <Typography variant="h6" color="success.main" fontWeight="500">
                    Department Statistics
                  </Typography>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: { xs: 2, sm: 3 }, 
                        textAlign: 'center', 
                        bgcolor: '#E3F2FD',
                        borderRadius: 2,
                        transition: 'transform 0.2s',
                        border: '1px solid',
                        borderColor: 'primary.light',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 40, sm: 48 },
                          height: { xs: 40, sm: 48 },
                          borderRadius: '50%',
                          bgcolor: '#1976D2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2
                        }}
                      >
                        <GroupIcon sx={{ color: 'white', fontSize: { xs: 24, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant="h4" 
                        color="primary.main" 
                        gutterBottom 
                        fontWeight="500"
                        sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                      >
                        {departmentStats.totalMembers}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        fontWeight="500"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Total Members
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: { xs: 2, sm: 3 }, 
                        textAlign: 'center', 
                        bgcolor: '#E8F5E9',
                        borderRadius: 2,
                        transition: 'transform 0.2s',
                        border: '1px solid',
                        borderColor: 'success.light',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: 40, sm: 48 },
                          height: { xs: 40, sm: 48 },
                          borderRadius: '50%',
                          bgcolor: '#2E7D32',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2
                        }}
                      >
                        <AssessmentIcon sx={{ color: 'white', fontSize: { xs: 24, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant="h4" 
                        color="success.main" 
                        gutterBottom 
                        fontWeight="500"
                        sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                      >
                        {departmentStats.performanceScore}%
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        fontWeight="500"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Performance Score
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Leadership Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ mr: 1 }} /> Department Leadership
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    {department?.head?.name?.[0] || 'H'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" color="text.secondary">Department Head</Typography>
                    <Typography variant="h6">
                      {department?.head ? getEmployeeDisplayName(department.head) : 'Not Assigned'}
                    </Typography>
                  </Box>
                  <IconButton 
                    color="primary"
                    onClick={() => handleEditClick('head', department?.head, 'Assign Department Head')}
                  >
                    <EditIcon />
                  </IconButton>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                    {department?.deputy?.name?.[0] || 'D'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" color="text.secondary">Deputy Head</Typography>
                    <Typography variant="h6">
                      {department?.deputy ? getEmployeeDisplayName(department.deputy) : 'Not Assigned'}
                    </Typography>
                  </Box>
                  <IconButton 
                    color="primary"
                    onClick={() => handleEditClick('deputy', department?.deputy, 'Assign Deputy Head')}
                  >
                    <EditIcon />
                  </IconButton>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {/* Member Management Section */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupIcon sx={{ mr: 1 }} /> Member Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleAddMembersClick}
                size="small"
              >
                Add Members
              </Button>
            </Box>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search members..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />

            {filteredEmployees.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  {searchQuery ? 'No matching members found' : 'No members in this department'}
                </Typography>
              </Box>
            ) : (
              <List>
                {renderEmployeeList()}
              </List>
            )}
          </Stack>
        </Paper>

        {/* Documents Section */}
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tab icon={<FolderIcon />} iconPosition="start" label="Documents" />
                <Tab icon={<InventoryIcon />} iconPosition="start" label="Assets" />
                <Tab icon={<AssignmentIcon />} iconPosition="start" label="Projects" />
              </Tabs>
            </Box>
            
            <TabPanel value={selectedTab} index={0}>
              <DepartmentDocuments
                departmentId={id}
                departmentName={department?.name || ''}
              />
            </TabPanel>
            
            <TabPanel value={selectedTab} index={1}>
              <DepartmentAssets departmentId={id} />
            </TabPanel>
            
            <TabPanel value={selectedTab} index={2}>
              <DepartmentProjects departmentId={id} />
            </TabPanel>
          </Paper>
        </Box>

        {/* Edit Dialog */}
        <EditDialog
          open={editDialog.open}
          onClose={() => setEditDialog({ ...editDialog, open: false })}
          field={editDialog.field}
          value={editDialog.value}
          onSave={(value) => handleSaveField(editDialog.field, value)}
          title={editDialog.title}
        />

        {/* Add Members Dialog */}
        <AddMembersDialog
          open={addMembersDialogOpen}
          onClose={() => setAddMembersDialogOpen(false)}
          departmentId={id!}
          currentMembers={departmentEmployees}
        />
      </Stack>
    </Container>
  );
};

export default DepartmentDetailsPage;
