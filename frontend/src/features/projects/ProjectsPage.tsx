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
    departments: [] as string[],
    members: [],
    tasks: [],
    progress: 0,
  });

  const handleCreateProject = async () => {
    await createProject(newProject);
    setOpenNewProject(false);
    setNewProject({
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      departments: [],
      members: [],
      tasks: [],
      progress: 0,
    });
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

  const uniqueDepartments = Array.from(
    new Set(projects.map(project => project.department))
  ).map(deptName => {
    const dept = departments.find(d => d.name === deptName);
    return {
      id: dept?.id || `dept-${deptName}`, // Ensure unique ID even if department not found
      name: deptName
    };
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
                .filter(project => project.department === dept.name)
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
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleProjectMenu(e, project.id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Stack>

                          {/* Description */}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {project.description}
                          </Typography>

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
                                {project.members.length} members
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
                              {project.members.map((member) => {
                                const employee = employees.find(
                                  (e) => e.id === member.employeeId
                                );
                                return (
                                  <Avatar
                                    key={member.employeeId}
                                    src={employee?.photoUrl}
                                    alt={employee ? `${employee.firstName} ${employee.lastName}` : ''}
                                  >
                                    {employee
                                      ? `${employee.firstName[0]}${employee.lastName[0]}`
                                      : ''}
                                  </Avatar>
                                );
                              })}
                            </AvatarGroup>
                          </Box>
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
              value={newProject.name}
              onChange={(e) =>
                setNewProject((prev) => ({ ...prev, name: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newProject.description}
              onChange={(e) =>
                setNewProject((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              multiline
              rows={3}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={newProject.priority}
                    label="Priority"
                    onChange={(e) =>
                      setNewProject((prev) => ({
                        ...prev,
                        priority: e.target.value as ProjectPriority,
                      }))
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) =>
                    setNewProject((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Autocomplete
              multiple
              options={departments}
              getOptionLabel={(option) => option.name}
              value={departments.filter((d) =>
                newProject.departments.includes(d.id)
              )}
              onChange={(_, newValue) =>
                setNewProject((prev) => ({
                  ...prev,
                  departments: newValue.map((d) => d.id),
                }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Departments"
                  placeholder="Select departments"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProject(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={!newProject.name}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
