import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { format, startOfDay } from 'date-fns';
import { useManagerData } from '@/hooks/useManagerData';

const TimesheetManagerCard = () => {
  const [summary, setSummary] = useState({
    pendingEntries: 0,
    totalHoursToday: 0,
    employeesSubmitted: 0,
    totalEmployees: 0,
  });
  const [loading, setLoading] = useState(true);
  const { departmentEmployees = [] } = useManagerData();

  useEffect(() => {
    fetchSummary();
  }, [departmentEmployees]);

  const fetchSummary = async () => {
    try {
      const today = startOfDay(new Date());
      const todayTimestamp = Timestamp.fromDate(today);

      // Get department employee IDs
      const departmentEmployeeIds = departmentEmployees
        .filter(emp => emp?.userId)
        .map(emp => emp.userId);

      // Get time entries for today from department employees
      const entriesQuery = query(
        collection(db, 'timeEntries'),
        where('date', '>=', todayTimestamp),
        ...(departmentEmployeeIds.length > 0 ? [where('employeeId', 'in', departmentEmployeeIds)] : [])
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      
      const uniqueEmployees = new Set();
      let pendingEntries = 0;
      let totalHours = 0;

      entriesSnapshot.forEach((doc) => {
        const entry = doc.data();
        uniqueEmployees.add(entry.employeeId);
        if (entry.status === 'pending') pendingEntries++;
        totalHours += (entry.billedHours || 0) + (entry.unbilledHours || 0);
      });

      setSummary({
        pendingEntries,
        totalHoursToday: totalHours,
        employeesSubmitted: uniqueEmployees.size,
        totalEmployees: departmentEmployees.length,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching timesheet summary:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper
      component={RouterLink}
      to="/timesheet"
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AccessTimeIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h6">Timesheet Overview</Typography>
      </Box>

      <List sx={{ width: '100%' }}>
        <ListItem>
          <ListItemText
            primary="Pending Reviews"
            secondary={
              <Chip
                label={summary.pendingEntries}
                color={summary.pendingEntries > 0 ? 'warning' : 'success'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            }
          />
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemText
            primary="Total Hours Today"
            secondary={`${summary.totalHoursToday.toFixed(1)} hours`}
          />
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemText
            primary="Employee Submissions"
            secondary={`${summary.employeesSubmitted} / ${summary.totalEmployees} employees`}
          />
        </ListItem>
      </List>

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {format(new Date(), 'MMMM d, yyyy')}
        </Typography>
      </Box>
    </Paper>
  );
};

export default TimesheetManagerCard;
