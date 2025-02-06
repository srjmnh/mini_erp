import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Stack,
  Chip,
  Card,
  CardContent,
  IconButton,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Paper,
  LinearProgress,
  styled,
  CircularProgress,
  Checkbox,
  ListItemText as MuiListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Flag as FlagIcon,
  Schedule as ScheduleIcon,
  AttachMoney as BudgetIcon,
  Group as TeamIcon,
  Business as DepartmentIcon,
  DragIndicator as DragIcon,
  CalendarToday as CalendarTodayIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useProjects, ProjectMember, ProjectTask } from '@/contexts/ProjectContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { format } from 'date-fns';

const TaskColumn = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  minHeight: 500,
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
}));

const TaskCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const taskStatusColumns = [
  { id: 'todo', label: 'To Do', color: 'default' },
  { id: 'in_progress', label: 'In Progress', color: 'primary' },
  { id: 'review', label: 'Review', color: 'warning' },
  { id: 'done', label: 'Done', color: 'success' },
];

// Helper function to generate consistent colors from strings
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

export const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, addProjectMember, removeProjectMember, addTask, updateTask, deleteTask } = useProjects();
  const { departments, employees, loading } = useFirestore();
  
  console.log('ProjectDetailsPage:', { 
    employeesCount: employees?.length,
    employees,
    loading
  });

  const [openAddMember, setOpenAddMember] = useState(false);
  const [openAddTask, setOpenAddTask] = useState(false);
  const [openEditTask, setOpenEditTask] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectMember['role']>('member');
  const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: [],
  });
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<ProjectTask>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: [],
  });

  const project = projects.find((p) => p.id === id);

  if (loading) {
    return (
      <Container>
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Project Not Found
          </Typography>
          <Typography color="text.secondary" mb={3}>
            The project you're looking for doesn't exist or you don't have access to it.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/projects')}
            startIcon={<ArrowBackIcon />}
          >
            Back to Projects
          </Button>
        </Box>
      </Container>
    );
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      return;
    }

    const task = project.tasks.find((t) => t.id === draggableId);
    if (!task) return;

    try {
      console.log('Moving task to new status:', {
        taskId: task.id,
        newStatus: destination.droppableId,
        oldStatus: source.droppableId
      });

      await updateTask(project.id, task.id, {
        status: destination.droppableId as 'todo' | 'in_progress' | 'review' | 'done'
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    return project.tasks.filter(task => task.status === status) || [];
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const handleAddMember = async () => {
    if (selectedEmployee && selectedRole) {
      await addProjectMember(project.id, {
        employeeId: selectedEmployee,
        role: selectedRole,
      });
      setOpenAddMember(false);
      setSelectedEmployee('');
      setSelectedRole('member');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title) {
      return;
    }

    try {
      console.log('Adding task with data:', newTask);
      await addTask(project.id, {
        title: newTask.title,
        description: newTask.description || '',
        status: 'todo',
        priority: newTask.priority || 'medium',
        assignedTo: newTask.assignedTo || [],
      });
      
      setOpenAddTask(false);
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedTo: [],
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask || !editingTask.title) {
      return;
    }

    try {
      console.log('Updating task with data:', editingTask);
      await updateTask(project.id, selectedTask.id, editingTask);
      setOpenEditTask(false);
      setSelectedTask(null);
      setEditingTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedTo: [],
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const openTaskEditDialog = (task: ProjectTask) => {
    setSelectedTask(task);
    setEditingTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
    });
    setOpenEditTask(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate('/projects')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {project.name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={project.status}
              color={getTaskPriorityColor(project.status)}
            />
            <Chip
              size="small"
              label={project.priority}
              color={getTaskPriorityColor(project.priority)}
            />
            {project.departmentId && (
              <Chip
                size="small"
                icon={<DepartmentIcon />}
                label={departments.find(d => d.id === project.departmentId)?.name || 'Unknown Department'}
                color="default"
                onClick={() => navigate(`/departments/${project.departmentId}`)}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Stack>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CalendarTodayIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Start Date
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {new Date(project.startDate).toLocaleDateString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <GroupIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Team Size
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {project.members.length} Members
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssignmentIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Tasks
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {project.tasks.length} Total ({project.tasks.filter(t => t.status === 'done').length} Completed)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssignmentIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
            </Stack>
            <Box sx={{ mt: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={project.progress || 0} 
                sx={{ 
                  height: 8,
                  borderRadius: 1,
                  bgcolor: 'background.default',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    bgcolor: (project.progress || 0) === 100 ? 'success.main' : 'primary.main'
                  }
                }}
              />
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mt: 0.5, textAlign: 'right' }}
              >
                {project.progress || 0}%
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Project Details */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom>
                Project Details
              </Typography>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {project.description || 'No description provided'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1">
                  {project.dueDate ? format(new Date(project.dueDate), 'PPP') : 'No due date set'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Departments Involved
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {project.departments && project.departments.length > 0 ? (
                    project.departments.map(dept => (
                      <Chip
                        key={dept.id}
                        icon={<DepartmentIcon />}
                        label={dept.name}
                        onClick={() => navigate(`/departments/${dept.id}`)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No departments assigned
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Budget & Resources Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BudgetIcon color="primary" />
            <Typography variant="h6">Budget & Resources</Typography>
          </Stack>
          <IconButton size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Budget
            </Typography>
            <Typography variant="h4" color="text.primary" gutterBottom>
              ${project.budget?.toLocaleString() || '0'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Actual Cost
            </Typography>
            <Typography 
              variant="h4" 
              color={project.actualCost > project.budget ? 'error.main' : 'success.main'}
              gutterBottom
            >
              ${project.actualCost?.toLocaleString() || '0'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Departments Involved
            </Typography>
            {project.departments && project.departments.length > 0 ? (
              <Stack direction="row" spacing={1} alignItems="center">
                {project.departments.map(dept => (
                  <Chip
                    key={dept.id}
                    icon={<DepartmentIcon />}
                    label={dept.name}
                    onClick={() => navigate(`/departments/${dept.id}`)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No departments assigned
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Team Members Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">Team Members</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setOpenAddMember(true)}
            variant="outlined"
            size="small"
          >
            Add Member
          </Button>
        </Stack>
        <Grid container spacing={2}>
          {project.members.map((member) => {
            const employee = employees?.find((e) => e.id === member.employeeId);
            return (
              <Grid item xs={12} sm={6} md={4} key={member.employeeId}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: stringToColor(employee?.name || '') }}>
                      {employee?.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">{employee?.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {member.role.replace('_', ' ')}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveMember(member.employeeId)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Tasks Section */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h6">Tasks</Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setOpenAddTask(true)}
            variant="contained"
            size="small"
          >
            Add Task
          </Button>
        </Stack>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={3}>
            {['todo', 'in_progress', 'review', 'done'].map((status) => (
              <Grid item xs={12} sm={6} md={3} key={status}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    height: '100%',
                    bgcolor: status === 'done' ? 'success.light' : 'background.default',
                    p: 2 
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 2,
                      color: status === 'done' ? 'common.white' : 'text.primary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {status.replace('_', ' ')}
                    <Typography 
                      component="span" 
                      sx={{ 
                        ml: 1,
                        color: status === 'done' ? 'common.white' : 'text.secondary',
                        opacity: 0.7
                      }}
                    >
                      ({project.tasks.filter(t => t.status === status).length})
                    </Typography>
                  </Typography>
                  <Droppable droppableId={status}>
                    {(provided) => (
                      <Stack
                        spacing={2}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{ minHeight: 100 }}
                      >
                        {project.tasks
                          .filter((t) => t.status === status)
                          .map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided) => (
                                <Paper
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  elevation={1}
                                  sx={{ 
                                    p: 2,
                                    bgcolor: 'background.paper',
                                    '&:hover': {
                                      boxShadow: 2
                                    }
                                  }}
                                >
                                  <Stack spacing={1}>
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      {...provided.dragHandleProps}
                                    >
                                      <DragIcon color="action" fontSize="small" />
                                      <Typography 
                                        variant="subtitle2"
                                        sx={{ flex: 1 }}
                                      >
                                        {task.title}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openTaskEditDialog(task);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                    {task.description && (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        {task.description}
                                      </Typography>
                                    )}
                                    <Stack 
                                      direction="row" 
                                      spacing={1}
                                      alignItems="center"
                                      sx={{ mt: 1 }}
                                    >
                                      <Chip
                                        label={task.priority}
                                        size="small"
                                        color={
                                          task.priority === 'high' ? 'error' :
                                          task.priority === 'medium' ? 'warning' :
                                          'default'
                                        }
                                      />
                                      <AvatarGroup
                                        max={3}
                                        sx={{
                                          '& .MuiAvatar-root': {
                                            width: 24,
                                            height: 24,
                                            fontSize: '0.75rem'
                                          }
                                        }}
                                      >
                                        {task.assignedTo.map((userId) => {
                                          const employee = employees?.find(
                                            (e) => e.id === userId
                                          );
                                          return (
                                            <Avatar
                                              key={userId}
                                              sx={{
                                                bgcolor: stringToColor(
                                                  employee?.name || ''
                                                )
                                              }}
                                            >
                                              {employee?.name?.charAt(0)}
                                            </Avatar>
                                          );
                                        })}
                                      </AvatarGroup>
                                    </Stack>
                                  </Stack>
                                </Paper>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DragDropContext>
      </Paper>

      {/* Add Member Dialog */}
      <Dialog open={openAddMember} onClose={() => setOpenAddMember(false)}>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                label="Employee"
              >
                {employees
                  .filter(
                    (emp) =>
                      !project.members.find((m) => m.employeeId === emp.id)
                  )
                  .map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as ProjectMember['role'])
                }
                label="Role"
              >
                <MenuItem value="leader">Team Leader</MenuItem>
                <MenuItem value="member">Team Member</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddMember(false)}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained">
            Add Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog
        open={openAddTask}
        onClose={() => setOpenAddTask(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Assigned To</InputLabel>
              <Select
                multiple
                value={newTask.assignedTo || []}
                onChange={(e) => {
                  console.log('Selected assignees:', e.target.value);
                  setNewTask({
                    ...newTask,
                    assignedTo: e.target.value as string[],
                  });
                }}
                label="Assigned To"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const employee = employees?.find((e) => e.id === value);
                      return employee ? (
                        <Chip
                          key={value}
                          label={employee.name}
                          size="small"
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {project.members.map((member) => {
                  const employee = employees?.find(
                    (e) => e.id === member.employeeId
                  );
                  return employee ? (
                    <MenuItem key={member.employeeId} value={member.employeeId}>
                      <Checkbox checked={(newTask.assignedTo || []).includes(member.employeeId)} />
                      <MuiListItemText primary={employee.name} />
                    </MenuItem>
                  ) : null;
                })}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddTask(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">
            Add Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={openEditTask}
        onClose={() => setOpenEditTask(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editingTask.title}
              onChange={(e) =>
                setEditingTask({ ...editingTask, title: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={editingTask.description}
              onChange={(e) =>
                setEditingTask({ ...editingTask, description: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={editingTask.priority}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, priority: e.target.value })
                }
                label="Priority"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editingTask.status}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, status: e.target.value as ProjectTask['status'] })
                }
                label="Status"
              >
                <MenuItem value="todo">To Do</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="review">Review</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Assigned To</InputLabel>
              <Select
                multiple
                value={editingTask.assignedTo || []}
                onChange={(e) => {
                  console.log('Selected assignees:', e.target.value);
                  setEditingTask({
                    ...editingTask,
                    assignedTo: e.target.value as string[],
                  });
                }}
                label="Assigned To"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const employee = employees?.find((e) => e.id === value);
                      return employee ? (
                        <Chip
                          key={value}
                          label={employee.name}
                          size="small"
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {project.members.map((member) => {
                  const employee = employees?.find(
                    (e) => e.id === member.employeeId
                  );
                  return employee ? (
                    <MenuItem key={member.employeeId} value={member.employeeId}>
                      <Checkbox checked={(editingTask.assignedTo || []).includes(member.employeeId)} />
                      <ListItemText primary={employee.name} />
                    </MenuItem>
                  ) : null;
                })}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditTask(false)}>Cancel</Button>
          <Button onClick={handleEditTask} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
