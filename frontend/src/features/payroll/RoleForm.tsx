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
  const [baseSalary, setBaseSalary] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [seniorityLevels, setSeniorityLevels] = useState([
    { level: 1, title: 'Junior', salaryMultiplier: 1.0 },
    { level: 2, title: 'Intermediate', salaryMultiplier: 1.2 },
    { level: 3, title: 'Senior', salaryMultiplier: 1.5 },
    { level: 4, title: 'Lead', salaryMultiplier: 1.8 },
    { level: 5, title: 'Principal', salaryMultiplier: 2.0 }
  ]);
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
        baseSalary: Number(baseSalary),
        overtimeRate: Number(overtimeRate),
        departmentId,
        seniorityLevels,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
    setBaseSalary('');
    setOvertimeRate('');
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
              label="Base Salary"
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              required
              fullWidth
              helperText="Base salary for the role"
            />

            <TextField
              label="Overtime Rate"
              type="number"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              required
              fullWidth
              helperText="Hourly rate for overtime"
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