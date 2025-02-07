import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Stack,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Role, RoleLevel } from '@/types/roles';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function RoleConfigurationPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { showSnackbar } = useSnackbar();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    level: 'junior' as RoleLevel,
    baseSalary: '',
    overtimeRate: '',
    departmentId: '',
    seniorityLevels: [
      { level: 1, title: 'Junior', salaryMultiplier: 1.0 },
      { level: 2, title: 'Mid-Level', salaryMultiplier: 1.2 },
      { level: 3, title: 'Senior', salaryMultiplier: 1.5 },
      { level: 4, title: 'Lead', salaryMultiplier: 1.8 },
      { level: 5, title: 'Principal', salaryMultiplier: 2.0 },
    ],
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const rolesRef = collection(db, 'roles');
      const snapshot = await getDocs(rolesRef);
      const rolesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      showSnackbar('Failed to load roles', 'error');
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        title: role.title,
        level: role.level,
        baseSalary: role.baseSalary.toString(),
        overtimeRate: role.overtimeRate.toString(),
        departmentId: role.departmentId || '',
        seniorityLevels: role.seniorityLevels,
      });
    } else {
      setEditingRole(null);
      setFormData({
        title: '',
        level: 'junior',
        baseSalary: '',
        overtimeRate: '',
        departmentId: '',
        seniorityLevels: [
          { level: 1, title: 'Junior', salaryMultiplier: 1.0 },
          { level: 2, title: 'Mid-Level', salaryMultiplier: 1.2 },
          { level: 3, title: 'Senior', salaryMultiplier: 1.5 },
          { level: 4, title: 'Lead', salaryMultiplier: 1.8 },
          { level: 5, title: 'Principal', salaryMultiplier: 2.0 },
        ],
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const roleData = {
        title: formData.title,
        level: formData.level,
        baseSalary: Number(formData.baseSalary),
        overtimeRate: Number(formData.overtimeRate),
        departmentId: formData.departmentId || null,
        seniorityLevels: formData.seniorityLevels,
        updatedAt: Timestamp.now(),
      };

      if (editingRole) {
        await updateDoc(doc(db, 'roles', editingRole.id), roleData);
        showSnackbar('Role updated successfully', 'success');
      } else {
        roleData.createdAt = Timestamp.now();
        await addDoc(collection(db, 'roles'), roleData);
        showSnackbar('Role created successfully', 'success');
      }

      setOpenDialog(false);
      loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      showSnackbar('Failed to save role', 'error');
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await deleteDoc(doc(db, 'roles', roleId));
      showSnackbar('Role deleted successfully', 'success');
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      showSnackbar('Failed to delete role', 'error');
    }
  };

  const handleSeniorityLevelChange = (index: number, field: keyof typeof formData.seniorityLevels[0], value: string | number) => {
    const newLevels = [...formData.seniorityLevels];
    newLevels[index] = {
      ...newLevels[index],
      [field]: typeof value === 'string' && field === 'salaryMultiplier' ? parseFloat(value) : value,
    };
    setFormData({ ...formData, seniorityLevels: newLevels });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Role Configuration</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Role
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} key={role.id}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{role.title}</Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" onClick={() => handleOpenDialog(role)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(role.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Base Salary</Typography>
                    <Typography>${role.baseSalary.toLocaleString()}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Overtime Rate</Typography>
                    <Typography>${role.overtimeRate}/hour</Typography>
                  </Box>

                  <Divider />

                  <Typography variant="subtitle1">Seniority Levels</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Level</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell align="right">Multiplier</TableCell>
                          <TableCell align="right">Salary Range</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {role.seniorityLevels.map((level) => (
                          <TableRow key={level.level}>
                            <TableCell>{level.level}</TableCell>
                            <TableCell>{level.title}</TableCell>
                            <TableCell align="right">{level.salaryMultiplier}x</TableCell>
                            <TableCell align="right">
                              ${(role.baseSalary * level.salaryMultiplier).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Role Title"
              fullWidth
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <TextField
              select
              label="Role Level"
              fullWidth
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as RoleLevel })}
            >
              <MenuItem value="junior">Junior</MenuItem>
              <MenuItem value="mid">Mid</MenuItem>
              <MenuItem value="senior">Senior</MenuItem>
              <MenuItem value="lead">Lead</MenuItem>
              <MenuItem value="head">Head</MenuItem>
            </TextField>

            <TextField
              label="Base Salary"
              fullWidth
              type="number"
              value={formData.baseSalary}
              onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
              InputProps={{
                startAdornment: '$',
              }}
            />

            <TextField
              label="Overtime Rate (per hour)"
              fullWidth
              type="number"
              value={formData.overtimeRate}
              onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
              InputProps={{
                startAdornment: '$',
              }}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>Seniority Levels</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Level</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Salary Multiplier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.seniorityLevels.map((level, index) => (
                    <TableRow key={level.level}>
                      <TableCell>{level.level}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={level.title}
                          onChange={(e) => handleSeniorityLevelChange(index, 'title', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={level.salaryMultiplier}
                          onChange={(e) => handleSeniorityLevelChange(index, 'salaryMultiplier', e.target.value)}
                          InputProps={{
                            endAdornment: 'x',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
