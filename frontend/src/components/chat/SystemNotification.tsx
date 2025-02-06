import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, IconButton, Collapse } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { motion, AnimatePresence } from 'framer-motion';

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

interface SystemNotificationProps {
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
}

export const SystemNotification: React.FC<SystemNotificationProps> = ({
  message,
  onClose,
  autoHideDuration = 5000,
}) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <Paper
            elevation={3}
            sx={{
              position: 'relative',
              p: 2,
              mb: 1,
              bgcolor: 'background.paper',
              borderRadius: 2,
              width: '300px',
              animation: `${slideIn} 0.3s ease-out`,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setShow(false)}
              sx={{
                position: 'absolute',
                right: 4,
                top: 4,
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" sx={{ pr: 4 }}>
              {message}
            </Typography>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
