import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Box,
  Avatar
} from '@mui/material';
import { Task } from '@/types/task';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id'>) => Promise<void>;
  departmentId?: string;
}

export const AddTaskDialog: React.FC<AddTaskDialogProps> = ({
  open,
  onClose,
  onAdd,
  departmentId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [departmentEmployees, setDepartmentEmployees] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDepartmentEmployees = async () => {
      if (!departmentId) return;
      
      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('departmentId', '==', departmentId));
        const querySnapshot = await getDocs(q);
        
        const employees = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDepartmentEmployees(employees);
        // Set current user as default assignee if they're in the department
        if (user && employees.some(emp => emp.id === user.uid)) {
          setAssignedTo(user.uid);
        } else if (employees.length > 0) {
          setAssignedTo(employees[0].id);
        }
      } catch (error) {
        console.error('Error fetching department employees:', error);
      }
    };

    if (open) {
      fetchDepartmentEmployees();
    }
  }, [departmentId, open, user]);

  const handleSubmit = async () => {
    if (!user) return;

    const newTask = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'todo',
      progress: 0,
      priority,
      assignedTo: assignedTo || user.uid,
      comments: [],
    };

    await onAdd(newTask);
    handleReset();
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setAssignedTo(user?.uid || '');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Task</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          <TextField
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              fullWidth
            >
              <MenuItem value="low">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      mr: 1
                    }}
                  />
                  Low
                </Box>
              </MenuItem>
              <MenuItem value="medium">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      mr: 1
                    }}
                  />
                  Medium
                </Box>
              </MenuItem>
              <MenuItem value="high">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      mr: 1
                    }}
                  />
                  High
                </Box>
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Assign To"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              fullWidth
            >
              {departmentEmployees.length > 0 ? (
                departmentEmployees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          fontSize: '0.75rem',
                          bgcolor: 'primary.main',
                          mr: 1
                        }}
                      >
                        {employee.firstName?.charAt(0) || 'U'}
                      </Avatar>
                      {employee.firstName} {employee.lastName}
                    </Box>
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No employees found</MenuItem>
              )}
            </TextField>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!title.trim()}
        >
          Add Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTaskDialog;
