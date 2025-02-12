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
  IconButton,
  Chip,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { collection, query, where, getDocs, Timestamp, doc as firestoreDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format } from 'date-fns';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TimesheetManagerCard from './TimesheetManagerCard';
import { useManagerData } from '@/hooks/useManagerData';

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
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

const TimesheetContent = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { departmentEmployees = [] } = useManagerData();

  useEffect(() => {
    fetchTimeEntries();
  }, [departmentEmployees]);

  const fetchTimeEntries = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get employee IDs from department
      const departmentEmployeeIds = departmentEmployees
        .filter(emp => emp?.userId) // Filter out any undefined IDs
        .map(emp => emp.userId);
      
      let entriesQuery;
      
      if (departmentEmployeeIds.length > 0) {
        // If we have department employees, filter by them
        entriesQuery = query(
          collection(db, 'timeEntries'),
          where('date', '>=', Timestamp.fromDate(today)),
          where('employeeId', 'in', departmentEmployeeIds)
        );
      } else {
        // If no department employees yet, just get today's entries
        entriesQuery = query(
          collection(db, 'timeEntries'),
          where('date', '>=', Timestamp.fromDate(today))
        );
      }
      
      const entriesSnapshot = await getDocs(entriesQuery);
      const entries: TimeEntry[] = [];
      
      for (const doc of entriesSnapshot.docs) {
        const data = doc.data() as TimeEntry;
        
        // Fetch employee name
        const employeeDoc = await getDoc(firestoreDoc(db, 'users', data.employeeId));
        const employeeData = employeeDoc.data();
        let employeeName = 'Unknown Employee';
        
        if (employeeData) {
          employeeName = employeeData.displayName || 'Unknown Employee';
        }

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
          employeeName: employeeName,
          clientName: clientName,
          projectName: projectName,
        });
      }
      
      setTimeEntries(entries);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await updateDoc(firestoreDoc(db, 'timeEntries', entryId), {
        status: 'approved',
        updatedAt: Timestamp.now(),
      });
      fetchTimeEntries();
    } catch (error) {
      console.error('Error approving time entry:', error);
    }
  };

  const handleReject = async (entryId: string) => {
    try {
      await updateDoc(firestoreDoc(db, 'timeEntries', entryId), {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      });
      fetchTimeEntries();
    } catch (error) {
      console.error('Error rejecting time entry:', error);
    }
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab value="daily" label="Daily Overview" />
          <Tab value="employee" label="Employee Reports" />
        </Tabs>
      </Box>

      {activeTab === 'daily' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={4}>
            <TimesheetManagerCard />
          </Grid>
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Billed Hours</TableCell>
                    <TableCell>Unbilled Hours</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.employeeName}</TableCell>
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
                      <TableCell>
                        {entry.status === 'pending' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(entry.id)}
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(entry.id)}
                            >
                              <CloseIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {activeTab === 'employee' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Employee Time Reports
              </Typography>
              {/* Employee reports table will be added here */}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TimesheetContent;
