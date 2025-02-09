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
  InputAdornment,
  Box,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
  photoURL?: string;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectEmployee: (employee: Employee) => void;
  currentUserEmail: string;
}

export default function NewChatDialog({
  open,
  onClose,
  onSelectEmployee,
  currentUserEmail,
}: NewChatDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      const employeesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesList);
    };

    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const filteredEmployees = employees.filter(emp => 
    emp.email !== currentUserEmail && 
    (emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     emp.position?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          New Chat
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <List sx={{ pt: 0 }}>
          {filteredEmployees.map((emp) => (
            <ListItem
              key={emp.id}
              button
              onClick={() => {
                onSelectEmployee(emp);
                onClose();
              }}
            >
              <ListItemAvatar>
                <Avatar src={emp.photoURL}>
                  {emp.name?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={emp.name}
                secondary={emp.position || emp.email}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
