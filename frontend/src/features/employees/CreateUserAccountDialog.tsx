import React, { useState } from 'react';
import { useFirestore } from '@/contexts/FirestoreContext';
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
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { AuthService } from '@/services/auth.service';
import { UserRole } from '@/types/auth';
import { Employee } from '@/config/firestore-schema';

interface CreateUserAccountDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  onSuccess: () => void;
}

export default function CreateUserAccountDialog({
  open,
  onClose,
  employee,
  onSuccess,
}: CreateUserAccountDialogProps) {
  const [role, setRole] = useState<UserRole>('employee');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(employee.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateEmployee } = useFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      // Update employee record with email if it's different
      if (email !== employee.email) {
        await updateEmployee(employee.id, { email });        
      }

      // Create user account
      await AuthService.createUserAccount({
        email,
        password,
        role,
        employeeId: employee.id,
        displayName: employee.name,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create User Account</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a user account for {employee.name}. A password reset email will be sent to their email address.
            </Typography>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
              error={!email}
              helperText={!email ? 'Email is required' : ''}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
              >
                <MenuItem value="HR0">HR Admin (HR0)</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Temporary Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="The user will be prompted to change this password on first login"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
