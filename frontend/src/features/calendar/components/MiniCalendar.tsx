import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
          {format(selectedDate || new Date(), 'MMM d, yyyy')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={handlePrevDay} size="small">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleToday} size="small">
            <TodayIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleNextDay} size="small">
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
