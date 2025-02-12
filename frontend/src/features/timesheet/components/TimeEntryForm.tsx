import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { collection, addDoc, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@/types/client';
import { TimeEntry } from '@/types/timeEntry';

interface TimeEntryFormProps {
  onSubmit: () => void;
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({ onSubmit }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<{id: string; name: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  const [formData, setFormData] = useState({
    clientId: '',
    projectId: '',
    billedHours: '',
    unbilledHours: '',
    description: '',
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsList: Client[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          clientsList.push({
            id: doc.id,
            name: data.company || 'Unknown Company',
            ...data
          } as Client);
        });
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, []);



  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const projectsList = projectsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setProjects(projectsList);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedDate) return;

    try {
      const timeEntry = {
        employeeId: user.uid,
        clientId: formData.clientId,
        projectId: formData.projectId,
        date: Timestamp.fromDate(selectedDate),
        billedHours: parseFloat(formData.billedHours) || 0,
        unbilledHours: parseFloat(formData.unbilledHours) || 0,
        description: formData.description,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'timeEntries'), timeEntry);
      
      // Reset form
      setFormData({
        clientId: '',
        projectId: '',
        billedHours: '',
        unbilledHours: '',
        description: '',
      });
      
      onSubmit();
    } catch (error) {
      console.error('Error saving time entry:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Date"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            sx={{ width: '100%' }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Client</InputLabel>
            <Select
              name="clientId"
              value={formData.clientId}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  clientId: value as string
                }));
              }}
              label="Client"
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.company || client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Project</InputLabel>
            <Select
              name="projectId"
              value={formData.projectId}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  projectId: value as string,
                }));
              }}
              label="Project"
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Billed Hours"
            name="billedHours"
            type="number"
            value={formData.billedHours}
            onChange={handleInputChange}
            inputProps={{ min: 0, step: 0.5 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Unbilled Hours"
            name="unbilledHours"
            type="number"
            value={formData.unbilledHours}
            onChange={handleInputChange}
            inputProps={{ min: 0, step: 0.5 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            multiline
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={!formData.clientId || !formData.projectId}
          >
            Submit Time Entry
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TimeEntryForm;
