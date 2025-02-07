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
  Typography,
} from '@mui/material';
import { Role } from '@/types/roles';
import { Employee } from '@/types/models';
import { processPromotion } from '@/services/roleService';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

interface PromotionDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  roles: Role[];
  onSubmit: () => void;
}

export default function PromotionDialog({
  open,
  onClose,
  employee,
  roles,
  onSubmit,
}: PromotionDialogProps) {
  const [newRoleId, setNewRoleId] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const selectedRole = roles.find(role => role.id === newRoleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      await processPromotion({
        employeeId: employee.id,
        newRoleId,
        newSalary: Number(newSalary),
        effectiveFrom: format(effectiveDate, "yyyy-MM-dd'T'HH:mm:ss"),
        promotionNotes: notes,
      });
      onSubmit();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error processing promotion:', error);
    }
  };

  const resetForm = () => {
    setNewRoleId('');
    setNewSalary('');
    setEffectiveDate(new Date());
    setNotes('');
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Manage Promotion - {employee.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Current Role: {employee.currentRole}
              <br />
              Current Salary: ${employee.salary}
            </Typography>

            <FormControl fullWidth required>
              <InputLabel>New Role</InputLabel>
              <Select
                value={newRoleId}
                onChange={(e) => {
                  setNewRoleId(e.target.value);
                  const role = roles.find(r => r.id === e.target.value);
                  if (role) {
                    setNewSalary(role.minSalary.toString());
                  }
                }}
                label="New Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.title} ({role.level})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedRole && (
              <Typography variant="caption" color="text.secondary">
                Salary Range: ${selectedRole.minSalary} - ${selectedRole.maxSalary}
              </Typography>
            )}

            <TextField
              label="New Salary"
              type="number"
              value={newSalary}
              onChange={(e) => setNewSalary(e.target.value)}
              required
              fullWidth
              error={selectedRole && (
                Number(newSalary) < selectedRole.minSalary ||
                Number(newSalary) > selectedRole.maxSalary
              )}
              helperText={selectedRole && (
                Number(newSalary) < selectedRole.minSalary ||
                Number(newSalary) > selectedRole.maxSalary
              ) ? 'Salary must be within the role range' : ''}
            />

            <DatePicker
              label="Effective Date"
              value={effectiveDate}
              onChange={(newDate) => newDate && setEffectiveDate(newDate)}
            />

            <TextField
              label="Promotion Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              !newRoleId ||
              !newSalary ||
              (selectedRole && (
                Number(newSalary) < selectedRole.minSalary ||
                Number(newSalary) > selectedRole.maxSalary
              ))
            }
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}