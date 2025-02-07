import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { Role, RoleLevel } from '@/types/roles';
import { createRole } from '@/services/roleService';
import { getDepartments } from '@/config/firebase';

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

const ROLE_LEVELS: RoleLevel[] = ['junior', 'mid', 'senior', 'lead', 'head'];

export default function RoleForm({ open, onClose, onSubmit }: RoleFormProps) {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<RoleLevel>('junior');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);

  React.useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const deps = await getDepartments();
    setDepartments(deps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRole({
        title,
        level,
        minSalary: Number(minSalary),
        maxSalary: Number(maxSalary),
        departmentId,
      });
      onSubmit();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setLevel('junior');
    setMinSalary('');
    setMaxSalary('');
    setDepartmentId('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Role Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            
            <FormControl fullWidth required>
              <InputLabel>Level</InputLabel>
              <Select
                value={level}
                onChange={(e) => setLevel(e.target.value as RoleLevel)}
                label="Level"
              >
                {ROLE_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Minimum Salary"
              type="number"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Maximum Salary"
              type="number"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
              required
              fullWidth
            />

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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}