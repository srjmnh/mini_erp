import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as DeclinedIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Expense, ExpenseStats } from '@/types/expense';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { startOfMonth, endOfMonth } from 'date-fns';

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
      id={`expense-tabpanel-${index}`}
      aria-labelledby={`expense-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ExpensePage() {
  const { user, userRole } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total: 0,
    pending: 0,
    managerApproved: 0,
    approved: 0,
    rejected: 0,
  });
  const [openExpenseForm, setOpenExpenseForm] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const expensesRef = collection(db, 'expenses');
      let expensesQuery;

      if (userRole === 'employee') {
        // Employees see their own expenses
        expensesQuery = query(expensesRef, where('userId', '==', user?.uid));
      } else if (userRole === 'manager') {
        // Managers see their department's expenses and their own
        expensesQuery = query(expensesRef, 
          where('departmentId', '==', user?.departmentId)
        );
      } else {
        // HR sees all expenses
        expensesQuery = query(expensesRef);
      }

      const querySnapshot = await getDocs(expensesQuery);
      const expenseList: Expense[] = [];
      let totalAmount = 0;
      let pendingCount = 0;
      let managerApprovedCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      querySnapshot.forEach((doc) => {
        const expense = { id: doc.id, ...doc.data() } as Expense;
        expenseList.push(expense);
        
        totalAmount += expense.amount;
        if (expense.status === 'pending') pendingCount++;
        else if (expense.status === 'manager_approved') managerApprovedCount++;
        else if (expense.status === 'approved') approvedCount++;
        else if (expense.status === 'rejected') rejectedCount++;
      });

      setExpenses(expenseList);
      setStats({
        total: totalAmount,
        pending: pendingCount,
        managerApproved: managerApprovedCount,
        approved: approvedCount,
        rejected: rejectedCount,
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showSnackbar('Failed to load expenses', 'error');
    }
  };

  const handleStatusChange = async (expenseId: string, newStatus: string, note?: string) => {
    try {
      const expenseRef = doc(db, 'expenses', expenseId);
      const updateData: any = {
        status: newStatus,
        lastUpdatedAt: new Date(),
      };

      if (userRole === 'manager' && newStatus === 'approved') {
        // Manager approval becomes 'manager_approved' to indicate it needs HR approval
        updateData.status = 'manager_approved';
        updateData.managerApprovedAt = new Date();
        updateData.managerNote = note;
      } else if (userRole === 'hr') {
        // HR can make final approval or rejection
        updateData.hrApprovedAt = new Date();
        updateData.hrNote = note;
      }

      await updateDoc(expenseRef, updateData);
      showSnackbar('Expense status updated successfully', 'success');
      fetchExpenses();
    } catch (error) {
      showSnackbar('Failed to update expense status', 'error');
    }
  };

  const getTabLabel = () => {
    if (userRole === 'hr') {
      return ['Overview', 'All Expenses', 'Pending HR Approval'];
    } else if (userRole === 'manager') {
      return ['Overview', 'Department Expenses', 'Pending Approval'];
    }
    return ['Overview', 'My Expenses'];
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          {getTabLabel().map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Expenses
                </Typography>
                <Typography variant="h4">
                  ${stats.total.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h4">{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
          {(userRole === 'hr' || userRole === 'manager') && (
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Manager Approved
                  </Typography>
                  <Typography variant="h4">{stats.managerApproved}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Approved
                </Typography>
                <Typography variant="h4">{stats.approved}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Rejected
                </Typography>
                <Typography variant="h4">{stats.rejected}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <ExpenseList
            expenses={expenses.slice(0, 5)}
            view={userRole}
            onStatusChange={handleStatusChange}
          />
          {expenses.length > 5 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button onClick={() => setTabValue(1)}>View All Expenses</Button>
            </Box>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ExpenseList
          expenses={expenses}
          view={userRole}
          onStatusChange={handleStatusChange}
        />
      </TabPanel>

      {(userRole === 'hr' || userRole === 'manager') && (
        <TabPanel value={tabValue} index={2}>
          <ExpenseList
            expenses={expenses.filter(e => 
              userRole === 'hr' 
                ? e.status === 'manager_approved'
                : e.status === 'pending'
            )}
            view={userRole}
            onStatusChange={handleStatusChange}
          />
        </TabPanel>
      )}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenExpenseForm(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        New Expense
      </Button>

      <ExpenseForm
        open={openExpenseForm}
        onClose={() => setOpenExpenseForm(false)}
        onSubmit={() => {
          setOpenExpenseForm(false);
          fetchExpenses();
        }}
      />
    </Box>
  );
}
