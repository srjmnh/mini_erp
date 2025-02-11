import { useState, useEffect } from 'react';
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
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  timeIn: Date;
  timeOut?: Date;
}

export default function AttendanceManagementTable() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const employeesRef = collection(db, 'employees');
        const snapshot = await getDocs(employeesRef);
        const deps = new Set<string>();
        snapshot.docs.forEach(doc => {
          const dept = doc.data().department;
          if (dept) deps.add(dept);
        });
        setDepartments(['all', ...Array.from(deps)]);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch attendance records
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedDate) return;

      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const attendanceRef = collection(db, 'attendance');
      let q = query(
        attendanceRef,
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date'),
        orderBy('timeIn')
      );

      if (selectedDepartment !== 'all') {
        q = query(q, where('department', '==', selectedDepartment));
      }

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        timeIn: doc.data().timeIn.toDate(),
        timeOut: doc.data().timeOut?.toDate(),
      })) as AttendanceRecord[];

      setAttendanceRecords(records);
    };

    fetchAttendance();
  }, [selectedDate, selectedDepartment]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Attendance Management</Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue || new Date())}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Time In</TableCell>
              <TableCell>Time Out</TableCell>
              <TableCell>Total Hours</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendanceRecords.map((record) => {
              const totalHours = record.timeOut 
                ? ((record.timeOut.getTime() - record.timeIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
                : '-';
              return (
                <TableRow key={record.id}>
                  <TableCell>{record.employeeName}</TableCell>
                  <TableCell>{record.department}</TableCell>
                  <TableCell>{record.timeIn.toLocaleTimeString()}</TableCell>
                  <TableCell>{record.timeOut?.toLocaleTimeString() || '-'}</TableCell>
                  <TableCell>{totalHours}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
