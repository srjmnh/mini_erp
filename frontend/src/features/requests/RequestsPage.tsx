import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useRequests } from '@/hooks/useRequests';
import { LeaveType, ExpenseCategory } from '@/config/firestore-schema';
import RequestList from './RequestList';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RequestsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const { showSnackbar } = useSnackbar();
  const {
    leaveRequests,
    expenseRequests,
    loading,
    submitLeaveRequest,
    submitExpenseRequest,
  } = useRequests();

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation' as LeaveType,
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });

  // Expense request form state
  const [expenseForm, setExpenseForm] = useState({
    category: 'travel' as ExpenseCategory,
    amount: '',
    currency: 'USD',
    description: '',
    receiptUrl: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLeaveSubmit = async () => {
    try {
      await submitLeaveRequest(leaveForm);
      setOpenLeaveDialog(false);
      showSnackbar('Leave request submitted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to submit leave request', 'error');
    }
  };

  const handleExpenseSubmit = async () => {
    try {
      await submitExpenseRequest({
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      });
      setOpenExpenseDialog(false);
      showSnackbar('Expense request submitted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to submit expense request', 'error');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Leave Requests" />
          <Tab label="Expense Requests" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Leave Requests</Typography>
          <Button variant="contained" onClick={() => setOpenLeaveDialog(true)}>
            New Leave Request
          </Button>
        </Box>
        <RequestList
          type="leave"
          requests={leaveRequests}
          loading={loading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Expense Requests</Typography>
          <Button variant="contained" onClick={() => setOpenExpenseDialog(true)}>
            New Expense Request
          </Button>
        </Box>
        <RequestList
          type="expense"
          requests={expenseRequests}
          loading={loading}
        />
      </TabPanel>

      {/* Leave Request Dialog */}
      <Dialog open={openLeaveDialog} onClose={() => setOpenLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Leave Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Leave Type"
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as LeaveType })}
              >
                <MenuItem value="vacation">Vacation</MenuItem>
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="personal">Personal Leave</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Start Date"
                value={leaveForm.startDate}
                onChange={(date) => date && setLeaveForm({ ...leaveForm, startDate: date })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="End Date"
                value={leaveForm.endDate}
                onChange={(date) => date && setLeaveForm({ ...leaveForm, endDate: date })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>Cancel</Button>
          <Button onClick={handleLeaveSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      {/* Expense Request Dialog */}
      <Dialog open={openExpenseDialog} onClose={() => setOpenExpenseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Expense Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Expense Category"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
              >
                <MenuItem value="travel">Travel</MenuItem>
                <MenuItem value="office">Office Supplies</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Currency"
                value={expenseForm.currency}
                onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Receipt URL"
                value={expenseForm.receiptUrl}
                onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                placeholder="https://"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExpenseDialog(false)}>Cancel</Button>
          <Button onClick={handleExpenseSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
