import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Paper, Box, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const TimesheetCard = () => {
  return (
    <Paper
      component={RouterLink}
      to="/timesheet"
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
          '& .icon': {
            transform: 'scale(1.1)',
          },
          '& .title': {
            color: 'primary.main',
          },
        },
      }}
    >
      <Box
        className="icon"
        sx={{
          mb: 2,
          transition: 'transform 0.3s ease',
          transform: 'scale(1)',
          '& > svg': {
            fontSize: 48,
            color: 'primary.main',
          },
        }}
      >
        <AccessTimeIcon />
      </Box>
      <Typography
        variant="h6"
        className="title"
        sx={{
          mb: 2,
          transition: 'color 0.3s ease',
          fontWeight: 600,
        }}
      >
        Daily Timesheet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mb: 2,
          flexGrow: 1,
          lineHeight: 1.6,
        }}
      >
        Track your daily work hours, assign time to clients and projects, and manage your time entries.
      </Typography>
    </Paper>
  );
};

export default TimesheetCard;
