import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Autocomplete,
  TextField
} from '@mui/material';
import { useFirestore } from '@/contexts/FirestoreContext';
import type { Employee } from '@/contexts/FirestoreContext';

interface ManagerSuccessionDialogProps {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
}

export const ManagerSuccessionDialog: React.FC<ManagerSuccessionDialogProps> = ({
  open,
  onClose,
  departmentId,
  departmentName
}) => {
  const { employees } = useFirestore();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filter employees to only show those in the same department
  const eligibleEmployees = employees.filter(
    e => e.departmentId === departmentId && e.status === 'active'
  );

  const handleConfirm = () => {
    if (!selectedEmployee) return;

    const contextStr = window.sessionStorage.getItem('succession-callback');
    if (contextStr) {
      const { resolve } = JSON.parse(contextStr);
      resolve({ replacementId: selectedEmployee.id });
      window.sessionStorage.removeItem('succession-callback');
    }
    setSelectedEmployee(null);
    onClose();
  };

  const handleCancel = () => {
    const contextStr = window.sessionStorage.getItem('succession-callback');
    if (contextStr) {
      const { resolve } = JSON.parse(contextStr);
      resolve(false);
      window.sessionStorage.removeItem('succession-callback');
    }
    setSelectedEmployee(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Select New Department Head</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Typography variant="body1">
            Please select a new department head for {departmentName}
          </Typography>
          <Autocomplete
            options={eligibleEmployees}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="New Department Head"
                required
              />
            )}
            value={selectedEmployee}
            onChange={(_, newValue) => setSelectedEmployee(newValue)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedEmployee}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};
