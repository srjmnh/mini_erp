import React, { useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Rating,
  LinearProgress,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Stars as StarsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

interface Goal {
  id: string;
  title: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'completed';
  dueDate: Date;
}

interface Review {
  id: string;
  reviewer: string;
  date: Date;
  rating: number;
  feedback: string;
  avatar: string;
}

export default function PerformancePage() {
  const theme = useTheme();

  const [goals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Complete React Certification',
      progress: 75,
      status: 'on_track',
      dueDate: new Date(2025, 3, 1),
    },
    {
      id: '2',
      title: 'Lead Team Project',
      progress: 30,
      status: 'at_risk',
      dueDate: new Date(2025, 4, 15),
    },
    {
      id: '3',
      title: 'Improve Code Quality',
      progress: 100,
      status: 'completed',
      dueDate: new Date(2025, 1, 28),
    },
  ]);

  const [reviews] = useState<Review[]>([
    {
      id: '1',
      reviewer: 'Jane Smith',
      date: new Date(2025, 1, 15),
      rating: 4.5,
      feedback: 'Excellent work on the frontend development. Shows great initiative.',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    },
    {
      id: '2',
      reviewer: 'Mike Johnson',
      date: new Date(2024, 11, 20),
      rating: 4.0,
      feedback: 'Good team player. Could improve on documentation.',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return theme.palette.success;
      case 'at_risk':
        return theme.palette.warning;
      case 'completed':
        return theme.palette.info;
      default:
        return theme.palette.grey;
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs>
          <Typography variant="h4" gutterBottom>
            Performance Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your goals and performance reviews
          </Typography>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<AssessmentIcon />}
          >
            Request Review
          </Button>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <StarsIcon
              sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
            />
            <Typography variant="h4" gutterBottom>
              4.3
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Rating
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.1),
            }}
          >
            <TrendingUpIcon
              sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
            />
            <Typography variant="h4" gutterBottom>
              85%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Goals Completed
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
            }}
          >
            <TimelineIcon
              sx={{ fontSize: 40, color: 'warning.main', mb: 1 }}
            />
            <Typography variant="h4" gutterBottom>
              2
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Goals
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.info.main, 0.1),
            }}
          >
            <AssessmentIcon
              sx={{ fontSize: 40, color: 'info.main', mb: 1 }}
            />
            <Typography variant="h4" gutterBottom>
              5
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reviews This Year
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Goals Section */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Goals
        </Typography>
        <Grid container spacing={2}>
          {goals.map((goal) => (
            <Grid item xs={12} key={goal.id}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">{goal.title}</Typography>
                      <Chip
                        label={goal.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: alpha(getStatusColor(goal.status).main, 0.1),
                          color: getStatusColor(goal.status).main,
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={goal.progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(getStatusColor(goal.status).main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getStatusColor(goal.status).main,
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {goal.progress}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Due: {goal.dueDate.toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Reviews Section */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Reviews
        </Typography>
        <Grid container spacing={2}>
          {reviews.map((review) => (
            <Grid item xs={12} key={review.id}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Grid container spacing={2}>
                  <Grid item>
                    <Avatar src={review.avatar} />
                  </Grid>
                  <Grid item xs>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">{review.reviewer}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {review.date.toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Rating value={review.rating} precision={0.5} readOnly sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {review.feedback}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
