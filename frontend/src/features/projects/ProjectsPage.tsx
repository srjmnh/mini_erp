import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
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
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Flag as FlagIcon,
  Schedule as ScheduleIcon,
  AttachMoney as BudgetIcon,
  Group as TeamIcon,
  Business as DepartmentIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProjects, Project, ProjectPriority, ProjectStatus } from '@/contexts/ProjectContext';
import { useFirestore } from '@/contexts/FirestoreContext';
import { format } from 'date-fns';

const priorityColors: Record<ProjectPriority, string> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

const statusColors: Record<ProjectStatus, string> = {
  planning: 'info',
  in_progress: 'warning',
  on_hold: 'error',
  completed: 'success',
  cancelled: 'error',
};

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, createProject } = useProjects();
  const { departments, employees } = useFirestore();
  const [openNewProject, setOpenNewProject] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null);
  const [newProject, setNewProject] = React.useState({
    name: '',
    description: '',
    status: 'planning' as ProjectStatus,
    priority: 'medium' as ProjectPriority,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    department: '',
    departments: [] as string[],
    members: [],
    tasks: [],
    progress: 0,
  });

  const handleCreateProject = async () => {
    if (!newProject.name) {
      // showSnackbar('Project name is required', 'error');
      return;
    }

    try {
      await createProject({
        name: newProject.name,
        description: newProject.description || '',
        status: 'planning',
        priority: newProject.priority || 'medium',
        startDate: new Date().toISOString(),
        endDate: newProject.endDate || null,
        actualCost: 0,
        departments: [],
        members: [],
        tasks: [],
        progress: 0,
        documents: [],
        milestones: [],
        risks: [],
        meetings: []
      });

      setNewProject({
        name: '',
        description: '',
        priority: 'medium',
        endDate: '',
        department: '',
        departments: [],
        members: [],
        tasks: [],
        progress: 0,
      });
      
      setOpenNewProject(false);
      // showSnackbar('Project created successfully', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      // showSnackbar('Failed to create project', 'error');
    }
  };

  const handleProjectMenu = (event: React.MouseEvent<HTMLElement>, projectId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(projectId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const departmentOptions = departments.map(dept => ({
    id: dept.id, // Use the unique department ID
    name: dept.name,
  }));

  // Get all departments that have projects
  const departmentsWithProjects = new Set();
  projects.forEach(project => {
    project.departments?.forEach(dept => {
      departmentsWithProjects.add(dept.name);
    });
  });

  // Create unique departments array including all departments with projects
  const uniqueDepartments = Array.from(departmentsWithProjects).map(deptName => {
    const dept = departments.find(d => d.name === deptName);
    return {
      id: dept?.id || `dept-${deptName}`,
      name: deptName || 'Uncategorized'
    };
  });

  // Always add an 'All Projects' section at the beginning
  uniqueDepartments.unshift({
    id: 'all',
    name: 'All Projects'
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenNewProject(true)}
        >
          New Project
        </Button>
      </Stack>

      {/* Project Grid */}
      <Grid container spacing={3}>
        {uniqueDepartments.map((dept) => (
          <Grid item xs={12} key={`dept-section-${dept.id}`}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {dept.name}
            </Typography>
            <Grid container spacing={2}>
              {projects
                .filter(project => {
                  if (dept.name === 'All Projects') {
                    return true; // Show all projects
                  }
                  return project.departments?.some(d => d.name === dept.name);
                })
                .map(project => (
                  <Grid item xs={12} sm={6} md={4} key={`project-${project.id}`}>
                    <Card
                      sx={{
                        height: '100%',
                        transition: 'transform 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.shadows[4],
                        },
                      }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <CardContent>
                        <Stack spacing={2}>
                          {/* Header */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                          >
                            <Box>
                              <Typography variant="h6" gutterBottom>
                                {project.name}
                              </Typography>
                              <Stack direction="row" spacing={1}>
                                <Chip
                                  size="small"
                                  label={project.status}
                                  color={statusColors[project.status] as any}
                                />
                                <Chip
                                  size="small"
                                  label={project.priority}
                                  color={priorityColors[project.priority] as any}
                                />
                              </Stack>
                              
                              {project.departments?.length > 0 && (
                                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                  {project.departments.map((dept) => (
                                    <Chip
                                      key={dept.id}
                                      size="small"
                                      icon={<DepartmentIcon />}
                                      label={dept.name}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/departments/${dept.id}`);
                                      }}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  ))}
                                </Stack>
                              )}

                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {project.description || 'No description provided'}
                              </Typography>

                              <Stack direction="row" spacing={2} alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <TeamIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    {project.members?.length || 0} members
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <CalendarIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    {project.endDate ? format(new Date(project.endDate), 'PP') : 'No end date'}
                                  </Typography>
                                </Stack>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body2" align="right">
                                    Progress: {project.progress || 0}%
                                  </Typography>
                                </Box>
                              </Stack>

                              {/* Progress */}
                              <Box>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  sx={{ mb: 1 }}
                                >
                                  <Typography variant="body2" color="text.secondary">
                                    Progress
                                  </Typography>
                                  <Typography variant="body2" color="text.primary">
                                    {project.progress}%
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={project.progress}
                                  sx={{ height: 6, borderRadius: 1 }}
                                />
                              </Box>

                              {/* Stats */}
                              <Stack direction="row" spacing={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <TeamIcon color="action" sx={{ fontSize: 20 }} />
                                  <Typography variant="body2">
                                    {project.members?.length || 0} members
                                  </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <ScheduleIcon color="action" sx={{ fontSize: 20 }} />
                                  <Typography variant="body2">
                                    {format(new Date(project.startDate), 'MMM d, yyyy')}
                                  </Typography>
                                </Stack>
                              </Stack>

                              {/* Team */}
                              <Box>
                                <AvatarGroup max={5} sx={{ justifyContent: 'flex-end' }}>
                                  {project.members?.map((member) => {
                                    const employee = employees.find(
                                      (e) => e.id === member.employeeId
                                    );
                                    return (
                                      <Avatar
                                        key={member.employeeId}
                                        src={employee?.photoUrl}
                                        alt={employee?.firstName ? `${employee.firstName} ${employee.lastName}` : 'User'}
                                      >
                                        {employee?.firstName ? `${employee.firstName[0]}${employee.lastName[0]}` : 'U'}
                                      </Avatar>
                                    );
                                  })}
                                </AvatarGroup>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleProjectMenu(e, project.id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          ))}
      </Grid>

      {/* Project Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          handleCloseMenu();
          selectedProject && navigate(`/projects/${selectedProject}`);
        }}>
          View Details
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>Edit Project</MenuItem>
        <MenuItem onClick={handleCloseMenu} sx={{ color: 'error.main' }}>
          Delete Project
        </MenuItem>
      </Menu>

      {/* New Project Dialog */}
      <Dialog
        open={openNewProject}
        onClose={() => setOpenNewProject(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Project Name"
              fullWidth
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={newProject.department}
                label="Department"
                onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newProject.status}
                label="Status"
                onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
              >
                <MenuItem value="planning">Planning</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newProject.priority}
                label="Priority"
                onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as ProjectPriority })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={newProject.startDate}
              onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={newProject.endDate}
              onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <Autocomplete
              multiple
              options={employees}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              value={employees.filter(emp => newProject.members.includes(emp.id))}
              onChange={(_, newValue) => {
                setNewProject({
                  ...newProject,
                  members: newValue.map(emp => emp.id)
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Team Members"
                  placeholder="Add team members"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={`${option.firstName} ${option.lastName}`}
                    {...getTagProps({ index })}
                    avatar={<Avatar src={option.photoUrl}>{option.firstName[0]}</Avatar>}
                  />
                ))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProject(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={!newProject.name || !newProject.department}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
