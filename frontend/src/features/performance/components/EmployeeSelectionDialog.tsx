import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface EmployeeSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectEmployee: (employee: any) => void;
  departmentId: string;
}

export const EmployeeSelectionDialog: React.FC<EmployeeSelectionDialogProps> = ({
  open,
  onClose,
  onSelectEmployee,
  departmentId
}) => {
  const theme = useTheme();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesQuery = query(collection(db, 'employees'));
        const snapshot = await getDocs(employeesQuery);
        const employeeData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Employee data:', data);
          return {
            id: doc.id,
            firstName: data.name?.split(' ')[0] || '',
            lastName: data.name?.split(' ')[1] || '',
            email: data.email || '',
            position: data.position || '',
            departmentId: data.departmentId,
            photoURL: data.photoURL
          };
        });
        setEmployees(employeeData);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const filteredEmployees = employees.filter(employee => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = (
      employee.firstName?.toLowerCase().includes(searchString) ||
      employee.lastName?.toLowerCase().includes(searchString) ||
      employee.email?.toLowerCase().includes(searchString) ||
      employee.position?.toLowerCase().includes(searchString)
    );
    // Show all employees if departmentId is 'all' or if employee matches the department
    return matchesSearch && (departmentId === 'all' || !departmentId || employee.departmentId === departmentId);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Select Employee for Review</Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {filteredEmployees.map((employee) => (
              <ListItem
                button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08)
                  }
                }}
              >
                <ListItemAvatar>
                  {employee.photoURL ? (
                    <Avatar src={employee.photoURL} />
                  ) : (
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {employee.firstName} {employee.lastName}
                      </Typography>
                      <Chip
                        label={employee.position}
                        size="small"
                        sx={{
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main
                        }}
                      />
                    </Box>
                  }
                  secondary={employee.email}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
