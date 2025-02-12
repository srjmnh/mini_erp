import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  Chip,
  OutlinedInput,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, addDoc, getDocs, Timestamp, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Client, Project } from '@/types/client';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  interface FormData {
    name: string;
    email: string;
    phone: string;
    company: string;
    address: string;
    status: 'active' | 'inactive';
    projects: string[];
  }

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    status: 'active',
    projects: [] as string[],
  });

  useEffect(() => {
    fetchClients();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsList: Project[] = [];
      querySnapshot.forEach((doc) => {
        projectsList.push({ id: doc.id, ...doc.data() } as Project);
      });
      setAvailableProjects(projectsList);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchClients = async () => {
    const querySnapshot = await getDocs(collection(db, 'clients'));
    const clientsList: Client[] = [];
    querySnapshot.forEach((doc) => {
      clientsList.push({ id: doc.id, ...doc.data() } as Client);
    });
    setClients(clientsList);
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        address: client.address,
        status: client.status,
        projects: client.projects || [],
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        status: 'active',
        projects: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClient(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string[]>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const clientData = {
        ...formData,
        createdAt: editingClient ? editingClient.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), clientData);
      } else {
        await addDoc(collection(db, 'clients'), clientData);
      }

      handleCloseDialog();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Client Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Client
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contact Person</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Projects</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} hover>
                      <TableCell>{client.company}</TableCell>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.status}</TableCell>
                      <TableCell>
                      {client.projects?.map((projectId) => {
                        const project = availableProjects.find(p => p.id === projectId);
                        return project ? (
                          <Chip
                            key={projectId}
                            label={project.name}
                            size="small"
                            sx={{ m: 0.5 }}
                            onClick={() => navigate(`/clients/projects/${projectId}`)}
                          />
                        ) : null;
                      })}
                    </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenDialog(client)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteClient(client.id)} size="small" color="error">
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
          {editingClient ? 'Edit Client' : 'Add New Client'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="company"
                label="Company Name"
                fullWidth
                value={formData.company}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Contact Person"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone"
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={handleInputChange}
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="address"
                label="Address"
                fullWidth
                multiline
                rows={3}
                value={formData.address}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="projects-label">Assigned Projects</InputLabel>
                <Select
                  labelId="projects-label"
                  multiple
                  value={formData.projects}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'projects',
                      value: e.target.value
                    }
                  } as any)}
                  input={<OutlinedInput label="Assigned Projects" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((projectId) => {
                        const project = availableProjects.find(p => p.id === projectId);
                        return project ? (
                          <Chip key={projectId} label={project.name} />
                        ) : null;
                      })}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {availableProjects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingClient ? 'Update' : 'Add'} Client
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClientsPage;
