import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Autocomplete,
  Chip,
  Paper,
  Divider,
  Alert,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  DragIndicator as DragIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useFirestore } from '@/contexts/FirestoreContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { Employee, Department } from '@/contexts/FirestoreContext';
import { useNavigate } from 'react-router-dom';

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showSuccessionDialog, setShowSuccessionDialog] = useState(false);
  const { departments, employees, addDepartment, updateDepartment, deleteDepartment, updateEmployee } = useFirestore();

  // Group employees by department
  const departmentEmployees = departments.reduce<{ [key: string]: Employee[] }>((acc, dept) => {
    acc[dept.id] = employees.filter(e => e.departmentId === dept.id);
    return acc;
  }, {});

  // Check and update departments with invalid managers
  useEffect(() => {
    departments.forEach(dept => {
      const deptEmployees = departmentEmployees[dept.id] || [];
      if (dept.managerId && !deptEmployees.find(e => e.id === dept.managerId)) {
        // Clear the manager ID from department if manager is not in the department
        updateDepartment(dept.id, {
          managerId: null,
          deputyManagerId: null,
          updatedAt: new Date().toISOString()
        }).catch(error => {
          console.error(`Error updating department ${dept.id}:`, error);
        });
      }
    });
  }, [departments, departmentEmployees, updateDepartment]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const employeeId = result.draggableId;

    if (sourceId === destId) return;

    try {
      // Find the employee and source department
      const employee = employees.find(e => e.id === employeeId);
      const sourceDept = departments.find(d => d.id === sourceId);
      
      if (!employee || !sourceDept) return;

      // Check if employee is manager of source department
      const isManager = sourceDept.managerId === employeeId;
      
      if (isManager) {
        // Store context for succession dialog
        window.sessionStorage.setItem('succession-callback', JSON.stringify({
          context: {
            departmentName: sourceDept.name,
            departmentId: sourceId,
            transferringEmployeeId: employeeId
          }
        }));

        // Open succession dialog
        const confirmed = await new Promise(resolve => {
          window.sessionStorage.setItem('succession-callback', JSON.stringify({ resolve, context: { departmentName: sourceDept.name } }));
          setShowSuccessionDialog(true);
        });

        if (!confirmed) return;

        const { replacementId } = confirmed as { replacementId: string };
        
        // Update old department with new manager
        await updateDepartment(sourceId, {
          ...sourceDept,
          managerId: replacementId,
          updatedAt: new Date().toISOString()
        });

        // Update new manager's status
        const newManager = employees.find(e => e.id === replacementId);
        if (newManager) {
          await updateEmployee(replacementId, {
            ...newManager,
            isManager: true,
            position: 'Department Head',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Move employee to new department
      await updateEmployee(employeeId, {
        ...employee,
        departmentId: destId,
        isManager: false,
        position: employee.position === 'Department Head' ? 'Employee' : employee.position,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error moving employee:', error);
      alert('Failed to move employee. Please try again.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const departmentData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      managerId: formData.get('managerId') as string || undefined,
    };

    try {
      if (editingDepartment) {
        // First update the department
        await updateDepartment(editingDepartment.id, {
          ...departmentData,
          updatedAt: new Date().toISOString()
        });

        // If setting a new department head
        if (departmentData.managerId) {
          const employee = employees.find(e => e.id === departmentData.managerId);
          if (employee) {
            // Update the employee to be in this department and set as manager
            await updateEmployee(employee.id, {
              ...employee,
              departmentId: editingDepartment.id, // Ensure they're in this department
              isManager: true,
              position: 'Department Head',
              updatedAt: new Date().toISOString()
            });

            // Clear manager status from previous department head if exists
            const previousManager = employees.find(e => 
              e.id !== departmentData.managerId && 
              e.departmentId === editingDepartment.id && 
              e.isManager
            );
            if (previousManager) {
              await updateEmployee(previousManager.id, {
                ...previousManager,
                isManager: false,
                position: previousManager.position === 'Department Head' ? 'Employee' : previousManager.position,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      } else {
        // Creating new department
        const newDeptId = await addDepartment(departmentData);
        
        // If setting an initial department head
        if (departmentData.managerId && newDeptId) {
          const employee = employees.find(e => e.id === departmentData.managerId);
          if (employee) {
            await updateEmployee(employee.id, {
              ...employee,
              departmentId: newDeptId,
              isManager: true,
              position: 'Department Head',
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      
      setOpenDialog(false);
      form.reset();
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Failed to save department. Please try again.');
    }
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'No Manager';
    const manager = employees.find(e => e.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown Manager';
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditDepartment = (department: Department) => {
    console.log('Editing department:', department);
    setEditingDepartment(department);
    setOpenDialog(true);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(id);
      } catch (error) {
        console.error('Error deleting department:', error);
        alert('Failed to delete department. Please try again.');
      }
    }
  };

  const renderDepartmentCard = (department: Department) => {
    const deptEmployees = departmentEmployees[department.id] || [];
    const departmentHead = deptEmployees.find(e => e.position === 'Department Head');
    const hasDepartmentHead = Boolean(departmentHead);

    return (
      <Card
        key={department.id}
        onClick={() => navigate(`/departments/${department.id}`)}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          {!hasDepartmentHead && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No department head assigned
            </Alert>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" gutterBottom>
              {department.name}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when clicking edit
                handleEditDepartment(department);
              }}
            >
              <EditIcon />
            </IconButton>
          </Stack>

          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            {department.description || 'No description available'}
          </Typography>

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon fontSize="small" />
              <Typography variant="body2">
                Head: {departmentHead ? `${departmentHead.firstName} ${departmentHead.lastName}` : 'Not assigned'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <BusinessIcon fontSize="small" />
              <Typography variant="body2">
                {deptEmployees.length} Employees
              </Typography>
            </Stack>
          </Stack>
        </CardContent>

        <Droppable droppableId={department.id}>
          {(provided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.droppableProps}
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                minHeight: 100
              }}
            >
              <Stack spacing={1}>
                {departmentEmployees[department.id]?.map((employee, index) => (
                  <Draggable
                    key={employee.id}
                    draggableId={employee.id}
                    index={index}
                  >
                    {(provided) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        elevation={1}
                        sx={{ p: 1 }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box {...provided.dragHandleProps}>
                            <DragIcon color="action" />
                          </Box>
                          <Avatar
                            src={employee.photoUrl}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            sx={{ width: 32, height: 32 }}
                          />
                          <Box>
                            <Typography variant="body2">
                              {employee.firstName} {employee.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {employee.position}
                            </Typography>
                          </Box>
                          {employee.isManager && (
                            <Chip
                              label="Manager"
                              size="small"
                              color="primary"
                              sx={{ ml: 'auto' }}
                            />
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            </Paper>
          )}
        </Droppable>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when clicking delete
              handleDeleteDepartment(department.id);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          Departments
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              width: 250,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'background.paper',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingDepartment(null);
              setOpenDialog(true);
            }}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3
            }}
          >
            Add Department
          </Button>
        </Stack>
      </Stack>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {filteredDepartments.map((department) => {
            const deptEmployees = departmentEmployees[department.id] || [];
            const departmentHead = deptEmployees.find(e => e.position === 'Department Head');
            const hasDepartmentHead = Boolean(departmentHead);

            return (
              <Grid item xs={12} sm={6} md={4} key={department.id}>
                <Droppable droppableId={department.id}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.shadows[8],
                        },
                        borderRadius: 3,
                        overflow: 'visible'
                      }}
                      onClick={() => navigate(`/departments/${department.id}`)}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Stack spacing={2}>
                          {!hasDepartmentHead && (
                            <Alert 
                              severity="warning" 
                              sx={{ 
                                borderRadius: 2,
                                '& .MuiAlert-icon': {
                                  color: 'warning.main'
                                }
                              }}
                            >
                              No department head assigned
                            </Alert>
                          )}

                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar
                              sx={{
                                bgcolor: (theme) => theme.palette.primary.main,
                                width: 40,
                                height: 40
                              }}
                            >
                              {department.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {department.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {department.description || 'No description available'}
                              </Typography>
                            </Box>
                          </Stack>

                          <Divider />

                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PersonIcon fontSize="small" color="primary" />
                              <Typography variant="body2">
                                Head: {departmentHead ? `${departmentHead.firstName} ${departmentHead.lastName}` : 'Not assigned'}
                              </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                              <GroupIcon fontSize="small" color="primary" />
                              <Typography variant="body2">
                                {deptEmployees.length} {deptEmployees.length === 1 ? 'Employee' : 'Employees'}
                              </Typography>
                            </Stack>
                          </Stack>

                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Team Members
                            </Typography>
                            <Stack direction="row" spacing={-0.5}>
                              {deptEmployees.slice(0, 5).map((employee) => (
                                <Tooltip key={employee.id} title={`${employee.firstName} ${employee.lastName}`}>
                                  <Avatar
                                    src={employee.photoURL}
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      border: '2px solid white'
                                    }}
                                  >
                                    {employee.firstName.charAt(0)}
                                  </Avatar>
                                </Tooltip>
                              ))}
                              {deptEmployees.length > 5 && (
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'grey.300',
                                    color: 'text.primary',
                                    border: '2px solid white'
                                  }}
                                >
                                  +{deptEmployees.length - 5}
                                </Avatar>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>

                      {provided.placeholder}
                    </Card>
                  )}
                </Droppable>
              </Grid>
            );
          })}
        </Grid>
      </DragDropContext>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingDepartment ? 'Edit Department' : 'Add Department'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                name="name"
                label="Department Name"
                fullWidth
                required
                defaultValue={editingDepartment?.name}
              />
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                defaultValue={editingDepartment?.description}
              />
              <Autocomplete
                options={employees.filter(e => e.status === 'active')}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                defaultValue={employees.find(e => e.id === editingDepartment?.managerId)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="managerId"
                    label="Department Head"
                  />
                )}
                onChange={(_, value) => {
                  const form = document.querySelector('form');
                  if (form) {
                    const input = form.querySelector('input[name="managerId"]');
                    if (input) {
                      (input as HTMLInputElement).value = value?.id || '';
                    }
                  }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={showSuccessionDialog} onClose={() => {
        const contextStr = window.sessionStorage.getItem('succession-callback');
        if (contextStr) {
          const { resolve } = JSON.parse(contextStr);
          resolve(false);
          window.sessionStorage.removeItem('succession-callback');
        }
        setShowSuccessionDialog(false);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Select New Department Head</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body1">
              Please select a replacement for the department head.
            </Typography>
            <Autocomplete
              options={employees.filter(e => {
                const contextStr = window.sessionStorage.getItem('succession-callback');
                if (!contextStr) return false;
                const { context } = JSON.parse(contextStr);
                return e.status === 'active' && e.departmentId === context.departmentId;
              })}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  name="replacementId"
                  label="Replacement"
                  required
                />
              )}
              onChange={(_, value) => {
                if (!value) return;
                const contextStr = window.sessionStorage.getItem('succession-callback');
                if (contextStr) {
                  const { resolve } = JSON.parse(contextStr);
                  resolve({ replacementId: value.id });
                  window.sessionStorage.removeItem('succession-callback');
                  setShowSuccessionDialog(false);
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            const contextStr = window.sessionStorage.getItem('succession-callback');
            if (contextStr) {
              const { resolve } = JSON.parse(contextStr);
              resolve(false);
              window.sessionStorage.removeItem('succession-callback');
            }
            setShowSuccessionDialog(false);
          }}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
