import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

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
      </Grid>
    </Box>
  );
}
