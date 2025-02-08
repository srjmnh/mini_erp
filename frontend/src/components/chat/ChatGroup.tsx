import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Autocomplete,
} from '@mui/material';
import { supabaseAdmin } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface CreateGroupProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
  departments: { id: string; name: string }[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department_id: string;
}

export function CreateGroupDialog({ open, onClose, onGroupCreated, departments }: CreateGroupProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<'department' | 'custom'>('custom');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { user } = useAuth();

  // Fetch employees when dialog opens
  React.useEffect(() => {
    const fetchEmployees = async () => {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const employeeList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`,
          email: doc.data().email,
          department_id: doc.data().department || '',
        }))
        .filter(emp => emp.email !== user?.email);
      setEmployees(employeeList);
    };

    if (open) {
      fetchEmployees();
    }
  }, [open, user?.email]);

  const handleCreate = async () => {
    if (!user?.email) return;

    try {
      // Create the group
      const { data: group, error: groupError } = await supabaseAdmin
        .from('chat_groups')
        .insert([
          {
            name: groupName,
            description,
            type: groupType,
            department_id: groupType === 'department' ? departmentId : null,
            created_by: user.email,
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      const members = selectedMembers.map(member => ({
        group_id: group.id,
        user_id: member.email,
        role: 'member',
      }));

      // Add creator as admin
      members.push({
        group_id: group.id,
        user_id: user.email,
        role: 'admin',
      });

      const { error: membersError } = await supabaseAdmin
        .from('chat_group_members')
        .insert(members);

      if (membersError) throw membersError;

      onGroupCreated();
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Chat Group</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            fullWidth
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Group Type</InputLabel>
            <Select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as 'department' | 'custom')}
              label="Group Type"
            >
              <MenuItem value="custom">Custom Group</MenuItem>
              <MenuItem value="department">Department Group</MenuItem>
            </Select>
          </FormControl>

          {groupType === 'department' && (
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                label="Department"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {groupType === 'custom' && (
            <Autocomplete
              multiple
              options={employees}
              getOptionLabel={(option) => option.name}
              value={selectedMembers}
              onChange={(_, newValue) => setSelectedMembers(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Select Members" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleCreate}
          variant="contained" 
          disabled={!groupName || (groupType === 'department' && !departmentId) || (groupType === 'custom' && selectedMembers.length === 0)}
        >
          Create Group
        </Button>
      </DialogActions>
    </Dialog>
  );
}
