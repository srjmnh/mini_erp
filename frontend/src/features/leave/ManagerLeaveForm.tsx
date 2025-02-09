import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useFirestore } from '@/contexts/FirestoreContext';

const leaveTypes = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
];

export default function ManagerLeaveForm() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { employees, departments } = useFirestore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !formData.startDate || !formData.endDate) return;

    try {
      setLoading(true);

      // Get employee data
      const employeeData = employees.find(emp => emp.email === user.email);
      if (!employeeData) {
        showSnackbar('Employee record not found', 'error');
        return;
      }

      const leaveData = {
        userId: user.uid,
        userEmail: user.email,
        employeeId: user.uid,
        employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
        departmentId: employeeData.departmentId,
        departmentName: departments.find(d => d.id === employeeData.departmentId)?.name || 'Unknown Department',
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: 'approved',
        statusText: 'Auto-approved (Manager)',
        submittedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await addDoc(collection(db, 'leaveRequests'), leaveData);
      showSnackbar('Leave request submitted and auto-approved', 'success');
      
      // Reset form
      setFormData({
        type: '',
        startDate: null,
        endDate: null,
        reason: '',
      });
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showSnackbar('Failed to submit leave request', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Stack spacing={3}>
          <TextField
            required
            select
            label="Leave Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            {leaveTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <DatePicker
            label="Start Date"
            value={formData.startDate}
            onChange={(date) => setFormData({ ...formData, startDate: date })}
          />

          <DatePicker
            label="End Date"
            value={formData.endDate}
            onChange={(date) => setFormData({ ...formData, endDate: date })}
          />

          <TextField
            required
            label="Reason"
            multiline
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Leave Request'}
          </Button>
        </Stack>
      </Box>
    </LocalizationProvider>
  );
}
