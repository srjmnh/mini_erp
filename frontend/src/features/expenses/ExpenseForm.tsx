import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Avatar,
  Stack,
  InputAdornment,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadReceipt } from '@/utils/storage';
import { useFirestore } from '@/contexts/FirestoreContext';
import RecentExpenses from './RecentExpenses';
import { getEmployeeManager } from '@/services/employeeManagement';

interface ExpenseFormProps {
  onSubmit?: (expenseData: any) => void;
  onClose?: () => void;
}

interface Category {
  value: string;
  label: string;
}

const categories: Category[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseForm({ onSubmit, onClose }: ExpenseFormProps) {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { employees, departments } = useFirestore();
  const [loading, setLoading] = useState(false);
  const [manager, setManager] = useState<{
    id: string;
    name: string;
    position: string;
    email: string;
    photoUrl?: string;
  } | null>(null);
  const [loadingManager, setLoadingManager] = useState(true);

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    receipt: null as File | null,
  });

  useEffect(() => {
    const loadManagerInfo = async () => {
      if (!user?.email) return;

      try {
        setLoadingManager(true);
        
        // Get employee data using email
        const employeeData = employees.find(emp => emp.email === user.email);
        console.log('Current user email:', user.email);
        console.log('Found employee data:', employeeData);

        if (!employeeData) {
          showSnackbar('Employee record not found. Please contact HR.', 'error');
          return;
        }

        // Get manager info
        const managerData = await getEmployeeManager(employeeData.id);
        console.log('Found manager:', managerData);

        if (managerData) {
          setManager({
            id: managerData.id,
            name: `${managerData.firstName} ${managerData.lastName}`,
            position: managerData.position,
            email: managerData.email,
            photoUrl: managerData.photoUrl
          });
        } else {
          setManager(null);
          showSnackbar('No manager assigned. Please contact HR.', 'error');
        }
      } catch (error) {
        console.error('Error loading manager:', error);
        showSnackbar('Failed to load manager info', 'error');
      } finally {
        setLoadingManager(false);
      }
    };

    loadManagerInfo();
  }, [user, employees]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('File size must be less than 5MB', 'error');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        showSnackbar('Only images and PDF files are allowed', 'error');
        return;
      }

      setFormData(prev => ({ ...prev, receipt: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    try {
      setLoading(true);

      // Get employee data using email
      const employeeData = employees.find(emp => emp.email === user.email);
      console.log('Current user email:', user.email);
      console.log('Found employee data:', employeeData);

      if (!employeeData) {
        showSnackbar('Employee record not found. Please contact HR.', 'error');
        return;
      }

      let receiptUrl = '';
      if (formData.receipt) {
        try {
          receiptUrl = await uploadReceipt(formData.receipt, user.uid);
        } catch (error) {
          showSnackbar(error instanceof Error ? error.message : 'Failed to upload receipt', 'error');
          return;
        }
      }

      // Check if user is a manager
      const isManager = employeeData.role === 'manager';

      const expenseData = {
        userId: user.uid,
        userEmail: user.email,
        userName: `${employeeData.firstName} ${employeeData.lastName}`,
        userPhotoUrl: employeeData.photoUrl || null,
        userDepartment: employeeData.departmentId,
        departmentName: departments.find(d => d.id === employeeData.departmentId)?.name || 'Unknown Department',
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        receiptUrl: receiptUrl || null,
        status: isManager ? 'approved' : 'pending',  // Auto-approve for managers
        statusText: isManager 
          ? `Auto-approved`
          : `Pending approval from ${manager?.name} (${manager?.position})`,
        submittedAt: new Date(),
        lastUpdatedAt: new Date(),
        ...(isManager 
          ? {} 
          : {
              managerId: employeeData.managerId,
              managerName: manager?.name,
              managerEmail: manager?.email,
              managerPosition: manager?.position,
              managerPhotoUrl: manager?.photoUrl || null,
            }
        )
      };

      const expenseRef = await addDoc(collection(db, 'expenses'), expenseData);
      
      // Only send notification if not a manager
      if (!isManager && manager) {
        const notificationData = {
          userId: manager.id,
          type: 'expense_approval',
          title: 'New Expense Approval Request',
          message: `${employeeData.firstName} ${employeeData.lastName} has submitted an expense of $${formData.amount} for approval`,
          status: 'unread',
          data: {
            expenseId: expenseRef.id,
            amount: formData.amount,
            category: formData.category
          },
          createdAt: new Date()
        };
        
        await addDoc(collection(db, 'notifications'), notificationData);
      }

      showSnackbar('Expense submitted successfully', 'success');
      if (onSubmit) onSubmit(expenseData);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error submitting expense:', error);
      showSnackbar('Failed to submit expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Amount Field */}
        <TextField
          required
          label="Amount"
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />

        {/* Category Field */}
        <TextField
          required
          select
          label="Category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          {categories.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Description Field */}
        <TextField
          required
          label="Description"
          multiline
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        {/* Receipt Upload */}
        <Box>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="receipt-upload"
          />
          <label htmlFor="receipt-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              sx={{ mr: 2 }}
            >
              Upload Receipt
            </Button>
          </label>
          {formData.receipt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Selected file: {formData.receipt.name}
            </Typography>
          )}
        </Box>

        {/* Approver Section - Only show for non-managers */}
        {employees.find(emp => emp.email === user.email)?.role !== 'manager' && manager && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Expense Approver
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={manager.photoUrl} alt={manager.name}>
                {manager.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">{manager.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.position}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {manager.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Expense'}
        </Button>
      </Stack>
    </Box>
  );
}
