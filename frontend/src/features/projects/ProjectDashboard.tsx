import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Flag as PriorityIcon,
  Person as PersonIcon,
  Business as DepartmentIcon,
  AttachMoney as BudgetIcon,
  CalendarToday as CalendarIcon,
  Assignment as TaskIcon,
  Timeline as TimelineIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { useProjects } from '@/contexts/ProjectContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ProjectDocuments from './components/ProjectDocuments';
import { Project } from '@/contexts/ProjectContext';

const TASK_STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#E3F2FD', chipColor: 'default' },
  { id: 'in_progress', label: 'In Progress', color: '#FFF3E0', chipColor: 'warning' },
  { id: 'review', label: 'Review', color: '#E8F5E9', chipColor: 'info' },
  { id: 'done', label: 'Done', color: '#F5F5F5', chipColor: 'success' },
];

const PRIORITY_COLORS = {
  low: { color: '#4CAF50', bg: '#E8F5E9', label: 'Low' },
  medium: { color: '#FF9800', bg: '#FFF3E0', label: 'Medium' },
  high: { color: '#F44336', bg: '#FFEBEE', label: 'High' },
};

export function ProjectDashboard() {
  const { id } = useParams();
  const { projects, updateProject, addProjectMember, removeProjectMember, updateProjectMember, addTask, updateTask, deleteTask } = useProjects();
  const { employees } = useFirestore();
  const { showSnackbar } = useSnackbar();
  const project = projects.find(p => p.id === id);

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    priority: 'medium',
    dueDate: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<typeof project | null>(null);

  useEffect(() => {
    if (project) {
      setEditedProject(project);
    }
  }, [project]);

  if (!project || !editedProject) return null;

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      const tasks = [...project.tasks];
      const [removed] = tasks.splice(source.index, 1);
      tasks.splice(destination.index, 0, removed);
      await updateProject(project.id, { tasks });
    } else {
      const task = project.tasks.find(t => t.id === draggableId);
      if (!task) return;
      await updateTask(project.id, task.id, {
        status: destination.droppableId as any,
      });
    }
  };

  const handleAddMembers = async () => {
    try {
      await Promise.all(
        selectedMembers.map((memberId) =>
          addProjectMember(project.id, {
            employeeId: memberId,
            role: 'Team Member',
            joinedAt: new Date().toISOString(),
          })
        )
      );
      showSnackbar('Team members added successfully', 'success');
      setMemberDialogOpen(false);
      setSelectedMembers([]);
    } catch (error) {
      showSnackbar('Failed to add team members', 'error');
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    try {
      await removeProjectMember(project.id, employeeId);
      showSnackbar('Team member removed successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to remove team member', 'error');
    }
  };

  const handleAddTask = async () => {
    try {
      if (!newTask.title) {
        showSnackbar('Task title is required', 'error');
        return;
      }
      await addTask(project.id, {
        ...newTask,
        status: 'todo',
        assignees: [],
        dependencies: [],
        tags: [],
      });
      showSnackbar('Task added successfully', 'success');
      setTaskDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
      });
    } catch (error) {
      showSnackbar('Failed to add task', 'error');
    }
  };

  const handleUpdateTask = async () => {
    try {
      if (!selectedTask) return;
      await updateTask(project.id, selectedTask.id, selectedTask);
      showSnackbar('Task updated successfully', 'success');
      setEditMode(false);
      setSelectedTask(null);
    } catch (error) {
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleSave = async () => {
    if (!editedProject || !project) {
      showSnackbar('Project data is missing', 'error');
      return;
    }
    
    try {
      // Validate required fields
      if (!editedProject.startDate) {
        showSnackbar('Start date is required', 'error');
        return;
      }

      // Create an update object with only the changed fields
      const updates: Partial<Project> = {};
      
      if (editedProject.startDate !== project.startDate) {
        updates.startDate = editedProject.startDate;
      }
      if (editedProject.endDate !== project.endDate) {
        updates.endDate = editedProject.endDate;
      }
      if (editedProject.budget !== project.budget) {
        updates.budget = editedProject.budget;
      }
      if (editedProject.actualCost !== project.actualCost) {
        updates.actualCost = editedProject.actualCost;
      }

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        showSnackbar('No changes to save', 'info');
        setIsEditing(false);
        return;
      }

      await updateProject(project.id, updates);
      setIsEditing(false);
      showSnackbar('Project details updated successfully', 'success');
    } catch (error) {
      console.error('Error updating project:', error);
      showSnackbar(error instanceof Error ? error.message : 'Failed to update project details', 'error');
    }
  };

  const handleCancel = () => {
    if (!project) return;
    setEditedProject(project);
    setIsEditing(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not set';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return format(dateObj, 'MMMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const calculateDuration = (startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  };

  const isDateOverdue = (date: string | null | undefined) => {
    if (!date) return false;
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj < new Date();
    } catch (error) {
      return false;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
        {/* Project Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>{project.name}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {project.description}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                label={project.status.replace('_', ' ')} 
                color={project.status === 'completed' ? 'success' : project.status === 'active' ? 'primary' : 'default'}
                sx={{ textTransform: 'capitalize' }}
              />
              <Chip 
                icon={<PriorityIcon />}
                label={project.priority}
                color={project.priority === 'high' ? 'error' : project.priority === 'medium' ? 'warning' : 'success'}
                sx={{ textTransform: 'capitalize' }}
              />
              {project.endDate && (
                <Chip
                  icon={<TimeIcon />}
                  label={`Due ${formatDate(project.endDate)}`}
                  color={isDateOverdue(project.endDate) ? 'error' : 'default'}
                />
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setTaskDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Task
            </Button>
            <Button
              variant="outlined"
              startIcon={<PersonIcon />}
              onClick={() => setMemberDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Members
            </Button>
          </Stack>
        </Box>

        {/* Project Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Timeline Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Timeline</Typography>
                  </Box>
                  {!isEditing ? (
                    <IconButton size="small" onClick={() => setIsEditing(true)}>
                      <EditIcon />
                    </IconButton>
                  ) : (
                    <Box>
                      <IconButton size="small" onClick={handleSave} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton size="small" onClick={handleCancel}>
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Start Date</Typography>
                    {isEditing ? (
                      <DatePicker
                        value={editedProject?.startDate ? new Date(editedProject.startDate) : null}
                        onChange={(newValue) => {
                          if (!editedProject) return;
                          setEditedProject({
                            ...editedProject,
                            startDate: newValue?.toISOString() || null
                          });
                        }}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    ) : (
                      <Typography variant="subtitle1">
                        {formatDate(project.startDate)}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">End Date</Typography>
                    {isEditing ? (
                      <DatePicker
                        value={editedProject?.endDate ? new Date(editedProject.endDate) : null}
                        onChange={(newValue) => {
                          if (!editedProject) return;
                          setEditedProject({
                            ...editedProject,
                            endDate: newValue?.toISOString() || null
                          });
                        }}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    ) : (
                      <Typography variant="subtitle1" color={isDateOverdue(project.endDate) ? 'error.main' : 'text.primary'}>
                        {formatDate(project.endDate)}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography variant="subtitle1">
                      {calculateDuration(project.startDate, project.endDate)} days
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Budget Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BudgetIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Budget & Resources</Typography>
                  </Box>
                  {!isEditing ? (
                    <IconButton size="small" onClick={() => setIsEditing(true)}>
                      <EditIcon />
                    </IconButton>
                  ) : (
                    <Box>
                      <IconButton size="small" onClick={handleSave} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton size="small" onClick={handleCancel}>
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Budget</Typography>
                    {isEditing ? (
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={editedProject?.budget || ''}
                        onChange={(e) => {
                          if (!editedProject) return;
                          setEditedProject({
                            ...editedProject,
                            budget: parseFloat(e.target.value) || 0
                          });
                        }}
                        InputProps={{
                          startAdornment: <Typography>$</Typography>
                        }}
                      />
                    ) : (
                      <Typography variant="subtitle1">
                        ${project.budget?.toLocaleString() || '0'}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Actual Cost</Typography>
                    {isEditing ? (
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={editedProject?.actualCost || ''}
                        onChange={(e) => {
                          if (!editedProject) return;
                          setEditedProject({
                            ...editedProject,
                            actualCost: parseFloat(e.target.value) || 0
                          });
                        }}
                        InputProps={{
                          startAdornment: <Typography>$</Typography>
                        }}
                      />
                    ) : (
                      <Typography variant="subtitle1" color={project.actualCost > project.budget ? 'error.main' : 'success.main'}>
                        ${project.actualCost?.toLocaleString() || '0'}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Departments Involved</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                      {project.departments?.map((dept, index) => (
                        <Chip
                          key={index}
                          size="small"
                          icon={<DepartmentIcon />}
                          label={dept}
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Task Statistics Card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TaskIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Task Statistics</Typography>
                </Box>
                <Grid container spacing={2}>
                  {TASK_STATUS_COLUMNS.map(column => {
                    const tasksInStatus = project.tasks.filter(t => t.status === column.id);
                    const completedTasks = tasksInStatus.filter(t => t.status === 'done').length;
                    return (
                      <Grid item xs={6} md={3} key={column.id}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">{column.label}</Typography>
                          <Typography variant="h4" sx={{ mb: 1 }}>
                            {tasksInStatus.length}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(completedTasks / (tasksInStatus.length || 1)) * 100}
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              bgcolor: 'rgba(0, 0, 0, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                              }
                            }}
                          />
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Project Progress */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>Project Progress</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={project.progress || 0}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {project.progress || 0}%
            </Typography>
          </Box>
        </Box>

        {/* Team Members */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>Team Members</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {project.members.map((member) => {
              const employee = employees.find(e => e.id === member.employeeId);
              if (!employee) return null;
              return (
                <Chip
                  key={member.employeeId}
                  avatar={
                    <Avatar 
                      src={employee.photoUrl}
                      sx={{ 
                        bgcolor: !employee.photoUrl ? 'primary.main' : undefined,
                      }}
                    >
                      {employee.name[0]?.toUpperCase()}
                    </Avatar>
                  }
                  label={`${employee.name} (${member.role.replace('_', ' ')})`}
                  onDelete={() => handleRemoveMember(member.employeeId)}
                  sx={{ 
                    borderRadius: 2,
                    py: 0.5,
                    '& .MuiChip-label': { 
                      fontWeight: 500,
                      textTransform: 'capitalize'
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* Task Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {TASK_STATUS_COLUMNS.map((column) => (
            <Grid item xs={12} md={3} key={column.id}>
              <Paper 
                elevation={0} 
                sx={{ 
                  height: '100%',
                  bgcolor: column.color,
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {column.label}
                  </Typography>
                  <Chip 
                    size="small"
                    label={project.tasks.filter(t => t.status === column.id).length}
                    color={column.chipColor as any}
                  />
                </Box>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ minHeight: 200 }}
                    >
                      {project.tasks
                        .filter((task) => task.status === column.id)
                        .map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{ 
                                  mb: 2,
                                  cursor: 'grab',
                                  borderRadius: 2,
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                                  },
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {task.title}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        setSelectedTask(task);
                                        setAnchorEl(e.currentTarget);
                                      }}
                                    >
                                      <MoreVertIcon />
                                    </IconButton>
                                  </Box>
                                  {task.description && (
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary" 
                                      sx={{ 
                                        mb: 2,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {task.description}
                                    </Typography>
                                  )}
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                    <Chip
                                      size="small"
                                      icon={<PriorityIcon sx={{ color: PRIORITY_COLORS[task.priority]?.color }} />}
                                      label={PRIORITY_COLORS[task.priority]?.label}
                                      sx={{
                                        bgcolor: PRIORITY_COLORS[task.priority]?.bg,
                                        color: PRIORITY_COLORS[task.priority]?.color,
                                        '& .MuiChip-label': { fontWeight: 500 },
                                      }}
                                    />
                                    {task.dueDate && !isNaN(new Date(task.dueDate).getTime()) && (
                                      <Chip
                                        size="small"
                                        icon={<TimeIcon fontSize="small" />}
                                        label={formatDate(task.dueDate)}
                                        color={isDateOverdue(task.dueDate) ? 'error' : 'default'}
                                        sx={{
                                          maxWidth: '100%',
                                          '& .MuiChip-label': {
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }
                                        }}
                                      />
                                    )}
                                  </Stack>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <AvatarGroup 
                                      max={3} 
                                      sx={{ 
                                        '& .MuiAvatar-root': {
                                          width: 28,
                                          height: 28,
                                          fontSize: '0.875rem',
                                          border: `2px solid ${'background.paper'}`,
                                        }
                                      }}
                                    >
                                      {task.assignedTo.map((userId) => {
                                        const user = employees.find(e => e.id === userId);
                                        if (!user) return null;
                                        return (
                                          <Avatar 
                                            key={userId}
                                            src={user.photoUrl}
                                            sx={{ 
                                              bgcolor: !user.photoUrl ? 'primary.main' : undefined,
                                            }}
                                          >
                                            {user.name[0]?.toUpperCase()}
                                          </Avatar>
                                        );
                                      })}
                                    </AvatarGroup>
                                    {task.tags && task.tags.length > 0 && (
                                      <Stack direction="row" spacing={0.5}>
                                        {task.tags.map((tag, index) => (
                                          <Chip
                                            key={index}
                                            label={tag}
                                            size="small"
                                            sx={{ 
                                              height: 20,
                                              '& .MuiChip-label': { 
                                                px: 1,
                                                fontSize: '0.75rem'
                                              }
                                            }}
                                          />
                                        ))}
                                      </Stack>
                                    )}
                                  </Box>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      {/* Add Member Dialog */}
      <Dialog 
        open={memberDialogOpen} 
        onClose={() => setMemberDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Add Team Members</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Members</InputLabel>
            <Select
              multiple
              value={selectedMembers}
              label="Select Members"
              onChange={(e) => setSelectedMembers(e.target.value as string[])}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const emp = employees.find(e => e.id === value);
                    if (!emp) return null;
                    return (
                      <Chip
                        key={value}
                        label={emp.name}
                        size="small"
                        onDelete={() => {
                          setSelectedMembers(selectedMembers.filter(id => id !== value));
                        }}
                        sx={{ mr: 0.5 }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {employees
                .filter(emp => !project.members.some(m => m.employeeId === emp.id))
                .map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        src={emp.photoUrl}
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          mr: 1,
                          bgcolor: !emp.photoUrl ? 'primary.main' : undefined,
                        }}
                      >
                        {emp.name[0]?.toUpperCase()}
                      </Avatar>
                      <Typography>{emp.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => {
            setMemberDialogOpen(false);
            setSelectedMembers([]);
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0}
          >
            Add Members
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog 
        open={taskDialogOpen || editMode} 
        onClose={() => {
          setTaskDialogOpen(false);
          setEditMode(false);
          setSelectedTask(null);
        }}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>{editMode ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <TextField
            fullWidth
            label="Title"
            margin="normal"
            value={editMode ? selectedTask?.title : newTask.title}
            onChange={(e) => editMode 
              ? setSelectedTask({ ...selectedTask, title: e.target.value })
              : setNewTask({ ...newTask, title: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={3}
            value={editMode ? selectedTask?.description : newTask.description}
            onChange={(e) => editMode
              ? setSelectedTask({ ...selectedTask, description: e.target.value })
              : setNewTask({ ...newTask, description: e.target.value })
            }
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={editMode ? selectedTask?.priority : newTask.priority}
              label="Priority"
              onChange={(e) => editMode
                ? setSelectedTask({ ...selectedTask, priority: e.target.value })
                : setNewTask({ ...newTask, priority: e.target.value })
              }
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={editMode ? selectedTask?.dueDate : newTask.dueDate}
            onChange={(e) => editMode
              ? setSelectedTask({ ...selectedTask, dueDate: e.target.value })
              : setNewTask({ ...newTask, dueDate: e.target.value })
            }
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assigned To</InputLabel>
            <Select
              multiple
              value={editMode ? selectedTask?.assignedTo : newTask.assignedTo}
              label="Assigned To"
              onChange={(e) => {
                const value = e.target.value as string[];
                editMode
                  ? setSelectedTask({ ...selectedTask, assignedTo: value })
                  : setNewTask({ ...newTask, assignedTo: value });
              }}
              renderValue={(selected: string[]) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const emp = employees.find(e => e.id === value);
                    if (!emp) return null;
                    return (
                      <Chip 
                        key={value} 
                        label={emp.name}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {project.members.map(member => {
                const emp = employees.find(e => e.id === member.employeeId);
                if (!emp) return null;
                return (
                  <MenuItem key={member.employeeId} value={member.employeeId}>
                    {emp.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => {
            setTaskDialogOpen(false);
            setEditMode(false);
            setSelectedTask(null);
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={editMode ? handleUpdateTask : handleAddTask}
            disabled={editMode ? !selectedTask?.title : !newTask.title}
          >
            {editMode ? 'Save Changes' : 'Add Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setEditMode(true);
        }}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedTask) {
            deleteTask(project.id, selectedTask.id);
          }
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Project Documents */}
      <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 2, bgcolor: 'background.default' }}>
        <ProjectDocuments projectId={project.id} />
      </Paper>
    </Box>
  );
}
