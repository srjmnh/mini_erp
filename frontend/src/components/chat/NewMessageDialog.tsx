import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { Employee } from './ChatPopover';

interface NewMessageDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  currentUser: string;
  onSelectEmployee: (employee: Employee) => void;
}

export default function NewMessageDialog({
  open,
  onClose,
  employees,
  currentUser,
  onSelectEmployee,
}: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.email !== currentUser &&
      (emp.getDisplayName?.().toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectEmployee = (employee: Employee) => {
    onSelectEmployee(employee);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Message</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
          />
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <ListItem key={employee.id} disablePadding>
                  <ListItemButton onClick={() => handleSelectEmployee(employee)}>
                    <ListItemAvatar>
                      <Avatar src={employee.avatar_url}>
                        {employee.getDisplayName?.()[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={employee.getDisplayName?.()}
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {employee.role} • {employee.email}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary="No employees found"
                  secondary="Try a different search term"
                />
              </ListItem>
            )}
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
