import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TimeEntry } from '@/types/timeEntry';
import { format } from 'date-fns';

interface TimeEntriesListProps {
  employeeId: string;
  refreshTrigger?: number;
}

const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ employeeId, refreshTrigger }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTimeEntries();
  }, [employeeId, refreshTrigger]);

  const fetchTimeEntries = async () => {
    try {
      const q = query(
        collection(db, 'timeEntries'),
        where('employeeId', '==', employeeId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const entriesList: TimeEntry[] = [];
      const clientIds = new Set<string>();
      const projectIds = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const entry = { id: doc.id, ...doc.data() } as TimeEntry;
        entriesList.push(entry);
        clientIds.add(entry.clientId);
        projectIds.add(entry.projectId);
      });
      
      setEntries(entriesList);
      
      // Fetch client and project names
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientNamesMap: Record<string, string> = {};
      clientsSnapshot.forEach((doc) => {
        if (clientIds.has(doc.id)) {
          clientNamesMap[doc.id] = doc.data().name;
        }
      });
      setClientNames(clientNamesMap);

      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const projectNamesMap: Record<string, string> = {};
      projectsSnapshot.forEach((doc) => {
        if (projectIds.has(doc.id)) {
          projectNamesMap[doc.id] = doc.data().name;
        }
      });
      setProjectNames(projectNamesMap);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
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
            {entries.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell>
                  {format(entry.date.toDate(), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>{clientNames[entry.clientId] || 'Loading...'}</TableCell>
                <TableCell>{projectNames[entry.projectId] || 'Loading...'}</TableCell>
                <TableCell>{entry.billedHours}</TableCell>
                <TableCell>{entry.unbilledHours}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Box sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.description}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={entry.status}
                    color={getStatusColor(entry.status)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TimeEntriesList;
