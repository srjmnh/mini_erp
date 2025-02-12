import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PerformanceReview } from '../types';

interface ReviewHistoryProps {
  reviews: PerformanceReview[];
  onViewReview: (review: PerformanceReview) => void;
  onDownloadReview: (review: PerformanceReview) => void;
}

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
  reviews,
  onViewReview,
  onDownloadReview
}) => {
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: theme.palette.success.main,
          backgroundColor: alpha(theme.palette.success.main, 0.1)
        };
      case 'draft':
        return {
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1)
        };
      case 'acknowledged':
        return {
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1)
        };
      default:
        return {
          color: theme.palette.grey[500],
          backgroundColor: alpha(theme.palette.grey[500], 0.1)
        };
    }
  };

  const getFormattedDate = (date: any) => {
    if (!date) return '-';
    try {
      // Handle Firebase Timestamp
      if (date?.toDate) {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      // Handle regular Date objects or strings
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '-';
    }
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Overall Rating</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviews
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((review) => (
                <TableRow
                  key={review.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Chip
                      label={review.reviewType === 'received' ? 'Received' : 'Given'}
                      size="small"
                      sx={{
                        backgroundColor: review.reviewType === 'received'
                          ? alpha(theme.palette.info.main, 0.1)
                          : alpha(theme.palette.success.main, 0.1),
                        color: review.reviewType === 'received'
                          ? theme.palette.info.main
                          : theme.palette.success.main
                      }}
                    />
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {review.employeeName || review.employeeId}
                    </Typography>
                    {review.employeeEmail && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {review.employeeEmail}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {review.templateName || review.templateId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      size="small"
                      sx={getStatusColor(review.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {review.overallRating ? (
                      <Typography variant="body2">
                        {review.overallRating.toFixed(1)} / 5.0
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getFormattedDate(review.createdAt)}</TableCell>
                  <TableCell>{getFormattedDate(review.completedAt)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="View Review">
                        <IconButton
                          size="small"
                          onClick={() => onViewReview(review)}
                          sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.1)
                            }
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {(review.status === 'completed' || review.status === 'acknowledged') && (
                        <Tooltip title="Download Review">
                          <IconButton
                            size="small"
                            onClick={() => onDownloadReview(review)}
                            sx={{
                              color: theme.palette.secondary.main,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1)
                              }
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={reviews.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};
