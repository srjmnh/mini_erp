import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Stack,
  InputAdornment,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { uploadReceipt } from '@/utils/storage';

const categories = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
];

export default function ManagerExpenseForm() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    receipt: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, receipt: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    try {
      setLoading(true);

      let receiptUrl = '';
      if (formData.receipt) {
        try {
          receiptUrl = await uploadReceipt(formData.receipt, user.uid);
        } catch (error) {
          showSnackbar(error instanceof Error ? error.message : 'Failed to upload receipt', 'error');
          return;
        }
      }

      const expenseData = {
        userId: user.uid,
        userEmail: user.email,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        receiptUrl: receiptUrl || null,
        status: 'approved',
        statusText: 'Auto-approved',
        submittedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await addDoc(collection(db, 'expenses'), expenseData);
      showSnackbar('Expense submitted and auto-approved', 'success');
      
      // Reset form
      setFormData({
        amount: '',
        category: '',
        description: '',
        receipt: null,
      });
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

        <TextField
          required
          label="Description"
          multiline
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

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

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Expense'}
        </Button>
      </Stack>
    </Box>
  );
}
