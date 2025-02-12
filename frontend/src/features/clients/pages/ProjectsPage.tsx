import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, getDocs, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Project } from '@/types/client';

const ProjectsPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'planned',
    assignedEmployees: [] as string[],
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const querySnapshot = await getDocs(collection(db, 'projects'));
    const projectsList: Project[] = [];
    querySnapshot.forEach((doc) => {
      projectsList.push({ id: doc.id, ...doc.data() } as Project);
    });
    setProjects(projectsList);
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        startDate: project.startDate.toDate().toISOString().split('T')[0],
        endDate: project.endDate?.toDate().toISOString().split('T')[0] || '',
        budget: project.budget.toString(),
        status: project.status,
        assignedEmployees: project.assignedEmployees,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        budget: '',
        status: 'planned',
        assignedEmployees: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const projectData = {
        ...formData,
        budget: parseFloat(formData.budget),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        createdAt: editingProject ? editingProject.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), projectData);
      }

      handleCloseDialog();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, 'projects', projectId));
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Project Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Project
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Project Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Budget</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} hover>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.description}</TableCell>
                      <TableCell>{project.startDate.toDate().toLocaleDateString()}</TableCell>
                      <TableCell>{project.endDate?.toDate().toLocaleDateString()}</TableCell>
                      <TableCell>${project.budget.toLocaleString()}</TableCell>
                      <TableCell>{project.status}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenDialog(project)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteProject(project.id)} size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Project Name"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="budget"
                label="Budget"
                type="number"
                fullWidth
                value={formData.budget}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                value={formData.startDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="endDate"
                label="End Date"
                type="date"
                fullWidth
                value={formData.endDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="status"
                label="Status"
                select
                fullWidth
                value={formData.status}
                onChange={handleInputChange}
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProject ? 'Update' : 'Add'} Project
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectsPage;
