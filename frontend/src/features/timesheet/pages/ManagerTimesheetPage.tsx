import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TimeEntry, TimeReport } from '@/types/timeEntry';
import { format } from 'date-fns';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '@/contexts/AuthContext';

const ManagerTimesheetPage = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const [timeReports, setTimeReports] = useState<TimeReport[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDepartmentEmployees();
      fetchTimeReports();
    }
  }, [user]);

  const fetchDepartmentEmployees = async () => {
    try {
      // First get the manager's department
      const managerDoc = await getDocs(query(
        collection(db, 'employees'),
        where('userId', '==', user?.uid)
      ));
      
      if (!managerDoc.empty) {
        const managerData = managerDoc.docs[0].data();
        
        // Then get all employees in that department
        const employeesSnapshot = await getDocs(query(
          collection(db, 'employees'),
          where('departmentId', '==', managerData.departmentId)
        ));
        
        const employees: any[] = [];
        employeesSnapshot.forEach((doc) => {
          employees.push({ id: doc.id, ...doc.data() });
        });
        
        setDepartmentEmployees(employees);
      }
    } catch (error) {
      console.error('Error fetching department employees:', error);
    }
  };

  const fetchTimeReports = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const entriesSnapshot = await getDocs(query(
        collection(db, 'timeEntries'),
        where('date', '>=', today)
      ));
      
      const entries: TimeEntry[] = [];
      entriesSnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as TimeEntry);
      });
      
      // Group entries by employee
      const reportsByEmployee = new Map<string, TimeReport>();
      
      for (const entry of entries) {
        const employee = departmentEmployees.find(e => e.userId === entry.employeeId);
        if (employee) {
          if (!reportsByEmployee.has(entry.employeeId)) {
            reportsByEmployee.set(entry.employeeId, {
              employeeId: entry.employeeId,
              employeeName: employee.name,
              department: employee.department,
              entries: [],
              totalBilledHours: 0,
              totalUnbilledHours: 0,
              date: entry.date,
            });
          }
          
          const report = reportsByEmployee.get(entry.employeeId)!;
          report.entries.push(entry);
          report.totalBilledHours += entry.billedHours;
          report.totalUnbilledHours += entry.unbilledHours;
        }
      }
      
      setTimeReports(Array.from(reportsByEmployee.values()));
    } catch (error) {
      console.error('Error fetching time reports:', error);
    }
  };

  const handleApproveEntry = async (entryId: string) => {
    try {
      await updateDoc(doc(db, 'timeEntries', entryId), {
        status: 'approved',
        updatedAt: new Date(),
      });
      fetchTimeReports();
    } catch (error) {
      console.error('Error approving entry:', error);
    }
  };

  const handleRejectEntry = async (entryId: string) => {
    try {
      await updateDoc(doc(db, 'timeEntries', entryId), {
        status: 'rejected',
        updatedAt: new Date(),
      });
      fetchTimeReports();
    } catch (error) {
      console.error('Error rejecting entry:', error);
    }
  };

  const handleViewDetails = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setOpenDialog(true);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Department Timesheet Management
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Daily Report" />
            <Tab label="Employee Report" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Today's Time Entries
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Total Billed Hours</TableCell>
                    <TableCell>Total Unbilled Hours</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timeReports.map((report) => (
                    <TableRow key={report.employeeId}>
                      <TableCell>{report.employeeName}</TableCell>
                      <TableCell>{report.department}</TableCell>
                      <TableCell>{report.totalBilledHours}</TableCell>
                      <TableCell>{report.totalUnbilledHours}</TableCell>
                      <TableCell>
                        {report.entries.some(e => e.status === 'pending') ? (
                          <Chip label="Pending" color="warning" size="small" />
                        ) : (
                          <Chip label="Reviewed" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {report.entries.map((entry) => (
                          <Box key={entry.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(entry)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            {entry.status === 'pending' && (
                              <>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApproveEntry(entry.id)}
                                >
                                  <CheckIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRejectEntry(entry.id)}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tabValue === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Employee Time Reports
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Total Entries</TableCell>
                    <TableCell>Pending Reviews</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departmentEmployees.map((employee) => {
                    const report = timeReports.find(r => r.employeeId === employee.userId);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{report?.entries.length || 0}</TableCell>
                        <TableCell>
                          {report?.entries.filter(e => e.status === 'pending').length || 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Time Entry Details</DialogTitle>
          <DialogContent>
            {selectedEntry && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Date: {format(selectedEntry.date.toDate(), 'MMMM dd, yyyy')}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Billed Hours: {selectedEntry.billedHours}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Unbilled Hours: {selectedEntry.unbilledHours}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Description:
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedEntry.description}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ManagerTimesheetPage;
