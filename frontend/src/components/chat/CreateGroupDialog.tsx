import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Chip,
  Avatar,
  Typography,
} from '@mui/material';
import { Employee } from './ChatPopover';
import { supabaseAdmin } from '@/config/supabase';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  currentUser: string;
  onGroupCreated: (group: any) => void;
}

export default function CreateGroupDialog({
  open,
  onClose,
  employees,
  currentUser,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;

    setLoading(true);
    try {
      // Create the group
      const { data: group, error: groupError } = await supabaseAdmin
        .from('chat_groups')
        .insert([
          {
            name: groupName.trim(),
            description: description.trim(),
            type: 'custom',
            created_by: currentUser,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members including the creator
      const members = [
        // Add creator as admin
        {
          group_id: group.id,
          user_id: currentUser,
          role: 'admin',
        },
        // Add selected members
        ...selectedMembers.map((member) => ({
          group_id: group.id,
          user_id: member.email,
          role: 'member',
        })),
      ];

      const { error: membersError } = await supabaseAdmin
        .from('chat_group_members')
        .insert(members);

      if (membersError) throw membersError;

      onGroupCreated(group);
      handleClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Group</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Group Name"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter group description (optional)"
          />
          <Autocomplete
            multiple
            options={employees.filter((emp) => emp.email !== currentUser)}
            getOptionLabel={(option) => option.name}
            value={selectedMembers}
            onChange={(_, newValue) => setSelectedMembers(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add Members"
                placeholder="Search employees"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  avatar={
                    <Avatar src={option.avatar_url}>{option.name[0]}</Avatar>
                  }
                />
              ))
            }
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Avatar
                  src={option.avatar_url}
                  sx={{ width: 32, height: 32 }}
                >
                  {option.name[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.role}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          disabled={!groupName.trim() || loading}
        >
          Create Group
        </Button>
      </DialogActions>
    </Dialog>
  );
}
