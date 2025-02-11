import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Button,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
  Receipt as ExpenseIcon,
  AccessTime as AttendanceIcon,
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function HRDashboard() {
  const navigate = useNavigate();

  const hrCards = [
    {
      title: 'Payroll',
      icon: <TrendingUpIcon sx={{ fontSize: 24 }} />,
      to: '/hr/payroll',
      color: '#E91E63',
      subtitle: 'Salary management',
    },
    {
      title: 'Time Off',
      icon: <AccessTimeIcon sx={{ fontSize: 24 }} />,
      to: '/hr/time-off',
      color: '#673AB7',
      subtitle: 'Leave tracking',
    },
    {
      title: 'Performance',
      icon: <TrendingUpIcon sx={{ fontSize: 24 }} />,
      to: '/hr/performance',
      color: '#009688',
      subtitle: 'Employee reviews',
    },
    {
      title: 'Role Configuration',
      icon: <BusinessIcon sx={{ fontSize: 24 }} />,
      to: '/hr/roles',
      color: '#795548',
      subtitle: 'Manage roles & salaries',
    },
    {
      title: 'Attendance',
      icon: <AttendanceIcon sx={{ fontSize: 24 }} />,
      to: '/hr/attendance',
      color: '#4CAF50',
      subtitle: 'Track employee attendance',
    },
  ];

  interface ExpenseStats {
    pending: number;
    thisMonth: number;
  }

  const [expenseStats, setExpenseStats] = useState<ExpenseStats>({
    pending: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load expense stats
        const expensesRef = collection(db, 'expenses');
        const pendingQuery = query(expensesRef, where('status', '==', 'pending'));
        const pendingSnapshot = await getDocs(pendingQuery);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const thisMonthQuery = query(
          expensesRef,
          where('submittedAt', '>=', startOfMonth),
          where('submittedAt', '<=', endOfMonth)
        );
        const thisMonthSnapshot = await getDocs(thisMonthQuery);
        
        const thisMonthTotal = thisMonthSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        setExpenseStats({
          pending: pendingSnapshot.size,
          thisMonth: thisMonthTotal,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        HR Management
      </Typography>

      {/* HR Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {hrCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Link to={card.to} style={{ textDecoration: 'none' }}>
              <Card sx={{ height: '100%', cursor: 'pointer' }}>
                <CardContent>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${card.color}20`,
                    color: card.color,
                    mb: 2
                  }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>

      {/* Expense Management */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExpenseIcon /> Expense Management
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Pending Approvals
              </Typography>
              <Typography variant="h5">
                {expenseStats.pending}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                This Month's Total
              </Typography>
              <Typography variant="h5">
                ${expenseStats.thisMonth.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => navigate('/hr/expenses')}
          >
            Manage Expenses
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
