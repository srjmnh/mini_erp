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
  Stack,
  Chip,
  IconButton,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowUpward as PromoteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useFirestore } from '@/contexts/FirestoreContext';

import { Role, EmployeeRoleHistory } from '@/types/roles';

interface RoleManagementProps {
  employeeId: string;
  currentRole?: string;
  currentSalary: number;
}



export default function RoleManagement({ employeeId, currentRole, currentSalary }: RoleManagementProps) {
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState(currentRole || '');
  const [newSalary, setNewSalary] = useState(currentSalary);
  const [newLevel, setNewLevel] = useState(1);
  const [salaryHistory, setSalaryHistory] = useState<EmployeeRoleHistory[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [currentRoleData, setCurrentRoleData] = useState<Role | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const { showSnackbar } = useSnackbar();
  const { getEmployee } = useFirestore();

  // Load employee data
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        const employeeRef = doc(db, 'employees', employeeId);
        const employeeSnap = await getDoc(employeeRef);
        if (employeeSnap.exists()) {
          setEmployeeData(employeeSnap.data());
        }
      } catch (error) {
        console.error('Error loading employee data:', error);
      }
    };
    loadEmployeeData();
  }, [employeeId]);

  useEffect(() => {
    loadSalaryHistory();
    loadRoles();
  }, [employeeId]);

  useEffect(() => {
    if (roles.length > 0 && currentRole) {
      const role = roles.find(r => r.title === currentRole);
      if (role) {
        setCurrentRoleData(role);
      }
    }
  }, [roles, currentRole]);

  // Initialize role and level when dialog opens
  useEffect(() => {
    if (isPromoteDialogOpen && currentRole) {
      // Set initial role to current role
      setNewRole(currentRole);
      const role = roles.find(r => r.title === currentRole);
      setSelectedRole(role || null);
      
      if (role) {
        // Get current level
        const currentLevel = employeeData?.currentLevel || 1;
        // Set next level (increment if possible)
        const nextLevel = Math.min(currentLevel + 1, role.seniorityLevels.length);
        setNewLevel(nextLevel);
        
        // Calculate new salary
        const seniorityLevel = role.seniorityLevels.find(l => l.level === nextLevel);
        if (seniorityLevel) {
          setNewSalary(role.baseSalary * seniorityLevel.salaryMultiplier);
        }
      }
    }
  }, [isPromoteDialogOpen, currentRole, roles, employeeData]);

  const loadRoles = async () => {
    try {
      const rolesRef = collection(db, 'roles');
      const rolesSnap = await getDocs(rolesRef);
      const rolesData = rolesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Role[];
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      showSnackbar('Failed to load roles', 'error');
    }
  };

  const loadSalaryHistory = async () => {
    try {
      const historyRef = collection(db, 'employees', employeeId, 'salaryHistory');
      const historySnap = await getDocs(query(historyRef, where('employeeId', '==', employeeId)));
      const history = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSalaryHistory(history);
    } catch (error) {
      console.error('Error loading salary history:', error);
    }
  };

  const handlePromote = async () => {
    try {
      // Update employee record
      const employeeRef = doc(db, 'employees', employeeId);
      await updateDoc(employeeRef, {
        role: newRole,
        position: newRole, // Also update the position to match the role
        salary: newSalary,
        seniorityLevel: newLevel,
        lastPromotionDate: Timestamp.now(),
        currentLevel: newLevel, // Add current level
      });

      // Add salary history record
      const historyRef = collection(db, 'employees', employeeId, 'salaryHistory');
      const oldLevel = employeeData?.currentLevel || 1;
      await addDoc(historyRef, {
        employeeId,
        oldSalary: currentSalary,
        newSalary,
        oldLevel,
        newLevel,
        reason: 'promotion',
        effectiveDate: Timestamp.now(),
        notes: `Promoted to ${newRole} (Level ${oldLevel} → ${newLevel})`,
        createdAt: Timestamp.now(),
      });

      showSnackbar('Employee promoted successfully', 'success');
      setIsPromoteDialogOpen(false);
      loadSalaryHistory();
    } catch (error) {
      console.error('Error promoting employee:', error);
      showSnackbar('Failed to promote employee', 'error');
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Role & Seniority</Typography>
            <Button
              startIcon={<PromoteIcon />}
              variant="contained"
              onClick={() => setIsPromoteDialogOpen(true)}
            >
              Promote
            </Button>
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Current Role</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>{currentRole || 'Not assigned'}</Typography>
                {currentRoleData && (
                  <Chip
                    size="small"
                    label={currentRoleData.level.toUpperCase()}
                    color={{
                      junior: 'default',
                      mid: 'primary',
                      senior: 'secondary',
                      head: 'error',
                    }[currentRoleData.level] || 'default'}
                  />
                )}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Current Salary</Typography>
              <Typography>${currentSalary.toLocaleString()}</Typography>
              {currentRoleData && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Base: ${currentRoleData.baseSalary.toLocaleString()}
                  {currentRoleData.overtimeRate > 0 && ` • Overtime Rate: $${currentRoleData.overtimeRate}/hr`}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {salaryHistory.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Salary History</Typography>
            <Stack spacing={2}>
              {salaryHistory.map((record) => (
                <Box key={record.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0.5}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2">
                            ${record.newSalary.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            from ${record.oldSalary?.toLocaleString() || 0}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">
                            {record.notes}
                          </Typography>
                          {record.oldLevel && record.newLevel && (
                            <Chip 
                              size="small" 
                              label={`Level ${record.oldLevel} → ${record.newLevel}`}
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 'auto' }}
                            />
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                    <Chip
                      label={record.reason}
                      size="small"
                      color={record.reason === 'promotion' ? 'success' : 'default'}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(record.effectiveDate.seconds * 1000).toLocaleDateString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={isPromoteDialogOpen} onClose={() => setIsPromoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Promote Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Role Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>New Role</Typography>
              <TextField
                select
                fullWidth
                value={newRole}
                onChange={(e) => {
                  const role = roles.find(r => r.title === e.target.value);
                  setNewRole(e.target.value);
                  setSelectedRole(role || null);
                  
                  if (role) {
                    const currentLevel = employeeData?.currentLevel || 1;
                    // If same role, increment level. If new role, start at 1
                    const nextLevel = role.title === currentRole
                      ? Math.min(currentLevel + 1, role.seniorityLevels.length)
                      : 1;
                    
                    setNewLevel(nextLevel);
                    const seniorityLevel = role.seniorityLevels.find(l => l.level === nextLevel);
                    if (seniorityLevel) {
                      const calculatedSalary = role.baseSalary * seniorityLevel.salaryMultiplier;
                      setNewSalary(calculatedSalary);
                    }
                  }
                }}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.title}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{role.title}</span>
                      <Chip
                        size="small"
                        label={role.level.toUpperCase()}
                        color={{
                          junior: 'default',
                          mid: 'primary',
                          senior: 'secondary',
                          head: 'error',
                        }[role.level] || 'default'}
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {selectedRole && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Seniority Level
                  {currentRole === selectedRole.title && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (Current: Level {employeeData?.currentLevel || 1})
                    </Typography>
                  )}
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={newLevel}
                  onChange={(e) => {
                    const level = Number(e.target.value);
                    setNewLevel(level);
                    const seniorityLevel = selectedRole.seniorityLevels.find(l => l.level === level);
                    if (seniorityLevel) {
                      setNewSalary(selectedRole.baseSalary * seniorityLevel.salaryMultiplier);
                    }
                  }}
                >
                  {selectedRole.seniorityLevels.map((level) => (
                    <MenuItem key={level.level} value={level.level}>
                      Level {level.level} ({(level.salaryMultiplier * 100).toFixed(0)}% of base salary)
                      {level.level === (employeeData?.currentLevel || 1) && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          (Current)
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Base salary: ${selectedRole.baseSalary.toLocaleString()}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                New Salary
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (You can override the calculated amount)
                </Typography>
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={newSalary}
                onChange={(e) => setNewSalary(Number(e.target.value))}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Box>

            {selectedRole && selectedRole.overtimeRate > 0 && (
              <Alert severity="info">
                This role includes an overtime rate of ${selectedRole.overtimeRate}/hr
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPromoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePromote} variant="contained" color="primary">
            Promote
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
