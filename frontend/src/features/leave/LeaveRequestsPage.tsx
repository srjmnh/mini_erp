import React from 'react';
import { Box, Typography } from '@mui/material';

export default function LeaveRequestsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Leave Requests
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage employee leave requests
      </Typography>
    </Box>
  );
}
