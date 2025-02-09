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
        // Existing data loading code...

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
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
        HR Management
      </Typography>

      <Grid container spacing={3}>
        {hrCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
              onClick={() => navigate(card.to)}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${card.color}15`,
                      color: card.color,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {/* Add Expense Management Module */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ExpenseIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Expense Management</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approvals
                  </Typography>
                  <Typography variant="h4">
                    {expenseStats.pending}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    This Month's Total
                  </Typography>
                  <Typography variant="h4">
                    ${expenseStats.thisMonth.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<ExpenseIcon />}
                component={Link}
                to="/expenses"
                fullWidth
              >
                Manage Expenses
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
