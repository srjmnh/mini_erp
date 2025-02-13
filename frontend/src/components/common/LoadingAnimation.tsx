import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WorkIcon from '@mui/icons-material/Work';

const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const LoadingAnimation = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mb: 2,
        }}
      >
        <PeopleAltIcon
          sx={{
            fontSize: 40,
            color: 'primary.main',
            animation: `${bounce} 1s ease-in-out infinite`,
            animationDelay: '0s',
          }}
        />
        <AssessmentIcon
          sx={{
            fontSize: 40,
            color: 'secondary.main',
            animation: `${bounce} 1s ease-in-out infinite`,
            animationDelay: '0.2s',
          }}
        />
        <WorkIcon
          sx={{
            fontSize: 40,
            color: 'success.main',
            animation: `${bounce} 1s ease-in-out infinite`,
            animationDelay: '0.4s',
          }}
        />
      </Box>
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: '3px solid',
          borderColor: 'grey.200',
          borderTopColor: 'primary.main',
          animation: `${rotate} 1s linear infinite`,
        }}
      />
      <Typography
        variant="h6"
        color="primary"
        sx={{
          mt: 2,
          fontWeight: 500,
          opacity: 0.9,
        }}
      >
        Loading Employee Data...
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          maxWidth: 300,
          textAlign: 'center',
        }}
      >
        Please wait while we fetch comprehensive employee information
      </Typography>
    </Box>
  );
};

export default LoadingAnimation;
