import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import { collection, query, where, getDocs, Timestamp, getDoc, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format } from 'date-fns';
import TimeEntryForm from '../../timesheet/components/TimeEntryForm';
import { useAuth } from '@/contexts/AuthContext';

interface TimeEntry {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  date: Timestamp;
  billedHours: number;
  unbilledHours: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

const EmployeeTimesheetContent = () => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
    }
  }, [user, refreshTrigger]);

  const fetchTimeEntries = async () => {
    if (!user) return;
    console.log('Current user:', user);

    try {
      const entriesQuery = query(
        collection(db, 'timeEntries'),
        where('employeeId', '==', user.uid)
      );
      
      const entriesSnapshot = await getDocs(entriesQuery);
      const entries: TimeEntry[] = [];
      
      for (const doc of entriesSnapshot.docs) {
        const data = doc.data() as TimeEntry;
        
        // Fetch client name
        const clientDoc = await getDoc(firestoreDoc(db, 'clients', data.clientId));
        const clientData = clientDoc.data();
        const clientName = clientData?.company || clientData?.name || 'Unknown Client';
        
        // Fetch project name
        const projectDoc = await getDoc(firestoreDoc(db, 'projects', data.projectId));
        const projectData = projectDoc.data();
        const projectName = projectData?.name || 'Unknown Project';
        
        entries.push({
          ...data,
          id: doc.id,
          clientName: clientName,
          projectName: projectName,
        });
      }
      
      // Sort entries by date, most recent first
      entries.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      
      setTimeEntries(entries);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setLoading(false);
    }
  };

  const handleTimeEntrySubmit = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Submit Time Entry
            </Typography>
            <TimeEntryForm onSubmit={handleTimeEntrySubmit} />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Time Entries
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Billed Hours</TableCell>
                    <TableCell>Unbilled Hours</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(entry.date.toDate(), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{entry.clientName}</TableCell>
                      <TableCell>{entry.projectName}</TableCell>
                      <TableCell>{entry.billedHours}</TableCell>
                      <TableCell>{entry.unbilledHours}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography noWrap>{entry.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.status}
                          color={
                            entry.status === 'approved'
                              ? 'success'
                              : entry.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeTimesheetContent;
