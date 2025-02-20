import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import { EmployeeReviewView } from '../performance/components/EmployeeReviewView';
import { differenceInDays, format, isAfter } from 'date-fns';
import { supabase } from '@/config/supabase';
import {
  Box,
  Container,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  IconButton,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as ProjectIcon,
  Assignment as TaskIcon,
  MoreVert as MoreIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
  Receipt as ExpenseIcon,
  AccessTime as AccessTimeIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getLeaveBalance } from '@/services/leaveManagement';
import { useAuth } from '@/contexts/AuthContext';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PayrollPDF from '../payroll/components/PayrollPDF';
import { TaskStatus } from '@/config/project-schema';
import { DatePicker } from '@mui/x-date-pickers';
import { useRequests } from '@/hooks/useRequests';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import ExpenseForm from '../expenses/ExpenseForm';
import ExpenseCard from './components/ExpenseCard';
import { useManagerData } from '@/hooks/useManagerData';
import TimesheetCard from './components/TimesheetCard';
import EmployeeTimesheetContent from './components/EmployeeTimesheetContent';

// Helper function to check if a date is overdue
const isOverdue = (date: Date) => {
  return isAfter(new Date(), date);
};

// Safe date conversion helper
const safeConvertToDate = (date: any): Date | null => {
  try {
    if (!date) return null;
    
    // If it's a Firebase Timestamp
    if (date?.toDate) {
      const converted = date.toDate();
      return isNaN(converted.getTime()) ? null : converted;
    }
    
    // If it's already a Date
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's an ISO string
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    // If it's a timestamp number
    if (typeof date === 'number') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
  } catch (error) {
    console.error('Error converting date:', error, { date });
    return null;
  }
};

const formatProjectDate = (date: any) => {
  if (!date) return 'No date';
  
  try {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      return format(date.toDate(), 'MMM d, yyyy');
    }
    // Handle Date object
    if (date instanceof Date) {
      return format(date, 'MMM d, yyyy');
    }
    // Handle string date
    return format(new Date(date), 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Safe date formatting
const formatTaskDate = (date: any): string => {
  if (!date) return '';
  try {
    // If it's a Firebase Timestamp
    if (date?.toDate) {
      return format(date.toDate(), 'MMM d, yyyy HH:mm');
    }
    
    // If it's already a Date
    if (date instanceof Date) {
      return format(date, 'MMM d, yyyy HH:mm');
    }
    
    // If it's an ISO string
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'MMM d, yyyy HH:mm');
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '';
  }
};

// Team Member Card
const TeamMemberCard = ({ member }) => {
  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName[0] || ''}${lastName[0] || ''}`;
  };

  return (
    <Card elevation={0} sx={{ 
      p: 1, 
      '&:hover': { 
        bgcolor: 'action.hover',
        transform: 'translateY(-2px)',
      },
      transition: 'all 0.2s ease-in-out'
    }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar 
            src={member.photoUrl}
            sx={{ 
              width: 48, 
              height: 48,
              bgcolor: 'primary.main' 
            }}
          >
            {getInitials(member.firstName, member.lastName)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Team Member'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.position || member.role || 'Employee'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Project Card
const ProjectCard = ({ project }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="medium">
              {project.name}
            </Typography>
            <IconButton 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'action.hover' 
                } 
              }}
            >
              <MoreIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {project.description}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Chip
              label={project.status}
              color={
                project.status === 'active'
                  ? 'success'
                  : project.status === 'on_hold'
                  ? 'warning'
                  : 'default'
              }
              size="small"
              sx={{ 
                textTransform: 'capitalize',
                fontWeight: 'medium' 
              }}
            />
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5 
              }}
            >
              <TimeIcon fontSize="small" />
              Due: {formatProjectDate(project.endDate)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
      >
        <MenuItem onClick={() => window.location.href = `/projects/${project.id}`}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => window.location.href = `/projects/${project.id}/tasks`}>
          View Tasks
        </MenuItem>
      </Menu>
    </Card>
  );
};

// Task Card
const TaskCard = ({ task, onStatusChange }) => {
  // Filter out completed tasks
  if (task.status === 'done' || task.status === 'completed') {
    return null;
  }

  const [anchorEl, setAnchorEl] = useState(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progress, setProgress] = useState(task.progress || 0);
  const [comment, setComment] = useState('');
  const { user } = useAuth();

  const handleUpdateProgress = async () => {
    try {
      if (!comment.trim()) {
        return;
      }

      const taskRef = task.projectId 
        ? doc(db, `projects/${task.projectId}/tasks/${task.id}`)
        : doc(db, 'tasks', task.id);

      const update = {
        progress,
        lastUpdated: new Date(),
        comments: [...(task.comments || []), {
          text: comment,
          timestamp: new Date(),
          userId: user?.uid,
          userName: user?.displayName || user?.email,
          progress
        }]
      };
      
      await updateDoc(taskRef, update);
      setShowProgressDialog(false);
      setComment('');
      if (onStatusChange) {
        onStatusChange(task.id, task.status || 'todo');
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight="medium">
              {task.title}
            </Typography>
            <IconButton 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'action.hover' 
                } 
              }}
            >
              <MoreIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {task.description}
          </Typography>
          
          {/* Progress Bar */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {task.progress || 0}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={task.progress || 0}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>

          {/* Latest Comment */}
          {task.comments?.length > 0 && (
            <Box bgcolor="action.hover" p={1} borderRadius={1}>
              <Typography variant="caption" color="text.secondary">
                Latest Update
              </Typography>
              <Typography variant="body2">
                {task.comments[task.comments.length - 1].text}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTaskDate(task.comments[task.comments.length - 1].timestamp)}
              </Typography>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Chip
              label={task.status?.toUpperCase().replace('_', ' ') || 'TODO'}
              color={
                (task.status || 'todo') === 'done' ? 'success' :
                (task.status || 'todo') === 'in_progress' ? 'primary' :
                (task.status || 'todo') === 'review' ? 'warning' : 'default'
              }
              size="small"
              sx={{ 
                textTransform: 'capitalize',
                fontWeight: 'medium' 
              }}
            />
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5 
              }}
            >
              <TimeIcon fontSize="small" />
              Due: {formatTaskDate(task.dueDate)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
          },
        }}
      >
        <MenuItem onClick={() => {
          setShowProgressDialog(true);
          setAnchorEl(null);
        }}>
          Update Progress
        </MenuItem>
        {(task.status || 'todo') !== 'done' && (
          <MenuItem
            onClick={() => {
              onStatusChange(task.id, 'done');
              setAnchorEl(null);
            }}
          >
            Mark as Complete
          </MenuItem>
        )}
      </Menu>

      {/* Progress Update Dialog */}
      <Dialog 
        open={showProgressDialog} 
        onClose={() => setShowProgressDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography gutterBottom>Progress: {progress}%</Typography>
              <Slider
                value={progress}
                onChange={(_, value) => setProgress(value as number)}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={100}
              />
            </Box>
            <TextField
              label="Comment"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment about your progress..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProgressDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateProgress}
            variant="contained"
            disabled={!comment.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

// Time Off Card Component
const TimeOffCard = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'casual',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
    medicalCertificate: null as File | null,
  });
  const { user } = useAuth();
  const { userRole } = useAuth();
  const { submitLeaveRequest } = useRequests();
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Listen to leave requests and employee data
  useEffect(() => {
    const fetchEmployeeAndManager = async () => {
      if (!user?.email) return;

      // Get employee data
      const employeeSnapshot = await getDocs(
        query(collection(db, 'employees'), where('email', '==', user.email))
      );
      
      if (!employeeSnapshot.empty) {
        const employee = { id: employeeSnapshot.docs[0].id, ...employeeSnapshot.docs[0].data() };
        setEmployeeData(employee);

        // Get department data to find manager
        // Get leave balance using the getLeaveBalance function
        const balance = await getLeaveBalance(employee.id);
        setLeaveBalance(balance);

        if (employee.departmentId) {
          const departmentDoc = await getDoc(doc(db, 'departments', employee.departmentId));
          if (departmentDoc.exists() && departmentDoc.data().headId) {
            const managerDoc = await getDoc(doc(db, 'employees', departmentDoc.data().headId));
            if (managerDoc.exists()) {
              setManagerData({ id: managerDoc.id, ...managerDoc.data() });
            }
          }
        }
      }
    };

    fetchEmployeeAndManager();

    // Set up real-time listener for leave requests
    if (employeeData?.id) {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'leaveRequests'),
          where('employeeId', '==', employeeData.id),
          orderBy('createdAt', 'desc')
        ),
        (snapshot) => {
          const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLeaveRequests(requests);
        }
      );

      // Set up listener for pending approvals if user is a manager or HR
      if (userRole === 'HR0' || userRole === 'hr' || employeeData?.isManager) {
        const pendingQuery = query(
          collection(db, 'leaveRequests'),
          where('status', '==', 'pending'),
          where('departmentId', '==', employeeData.departmentId),
          orderBy('createdAt', 'desc')
        );

        const pendingUnsubscribe = onSnapshot(pendingQuery, (snapshot) => {
          const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPendingApprovals(requests);
        });

        return () => {
          unsubscribe();
          pendingUnsubscribe();
        };
      }

      return () => unsubscribe();
    }
  }, [user?.email, employeeData?.id, userRole]);

  // Calculate if medical certificate is required
  const requiresMedicalCertificate = useMemo(() => {
    if (leaveForm.type !== 'sick') return false;
    const duration = differenceInDays(new Date(leaveForm.endDate), new Date(leaveForm.startDate)) + 1;
    return duration > 3;
  }, [leaveForm.type, leaveForm.startDate, leaveForm.endDate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setLeaveForm(prev => ({
        ...prev,
        medicalCertificate: event.target.files![0]
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!employeeData) {
        throw new Error('Employee data not found');
      }

      // Check if medical certificate is required but not provided
      if (requiresMedicalCertificate && !leaveForm.medicalCertificate) {
        throw new Error('Medical certificate is required for sick leave longer than 3 days');
      }

      let medicalCertificateUrl = '';
      
      // Upload medical certificate if present
      if (leaveForm.medicalCertificate) {
        try {
          const fileName = `${employeeData.id}/${new Date().getTime()}-${leaveForm.medicalCertificate.name}`;
          
          // Upload file to Supabase Storage using existing client
          const { data, error: uploadError } = await supabase.storage
            .from('medical-certificates')
            .upload(fileName, leaveForm.medicalCertificate, {
              contentType: leaveForm.medicalCertificate.type,
              upsert: true // Allow overwriting if file exists
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(uploadError.message || 'Failed to upload medical certificate');
          }
          
          if (!data?.path) {
            throw new Error('No file path returned from upload');
          }

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from('medical-certificates')
            .getPublicUrl(data.path);
            
          if (!urlData?.publicUrl) {
            throw new Error('Failed to get public URL');
          }

          medicalCertificateUrl = urlData.publicUrl;
        } catch (error) {
          console.error('Error uploading medical certificate:', error);
          throw new Error(error instanceof Error ? error.message : 'Failed to upload medical certificate');
        }
      }

      const { medicalCertificate, ...leaveFormData } = leaveForm;
      await submitLeaveRequest({
        ...leaveFormData,
        employeeId: employeeData.id,
        medicalCertificateUrl,
      });

      setOpenDialog(false);
      // Reset form
      setLeaveForm({
        type: 'casual',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
        medicalCertificate: null,
      });
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit leave request');
    }
  };

  return (
    <Card sx={{ 
      p: 2, 
      '&:hover': { 
        bgcolor: 'action.hover',
        transform: 'translateY(-2px)',
      },
      transition: 'all 0.2s ease-in-out'
    }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
            Time Off
          </Typography>
          <Stack spacing={2} sx={{ mb: 3 }}>
            {managerData && (
              <Typography variant="body2" color="text.secondary">
                Manager: {managerData.firstName} {managerData.lastName}
              </Typography>
            )}
            {leaveBalance && (
              <Box>
                <Stack direction="row" spacing={2}>
                  <Chip
                    label={
                      leaveBalance && typeof leaveBalance.casual === 'number' && leaveBalance.used
                        ? `Casual Leave: ${leaveBalance.casual - (leaveBalance.used.casual || 0)}/25 days`
                        : 'Loading...'
                    }
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={
                      leaveBalance && leaveBalance.used
                        ? `Sick Leave: ${leaveBalance.used.sick || 0} days used`
                        : 'Loading...'
                    }
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>
              </Box>
            )}
          </Stack>

          {/* Recent Leave Requests */}
          {leaveRequests.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Recent Leave Requests
              </Typography>
              <Stack spacing={2}>
                {leaveRequests.slice(0, 5).map((request) => (
                  <Card key={request.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                          {request.type} Leave
                        </Typography>
                        <Chip
                          size="small"
                          label={request.status}
                          color={
                            request.status === 'approved' ? 'success' :
                            request.status === 'rejected' ? 'error' :
                            'warning'
                          }
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {request.startDate ? (
                          request.startDate.toDate ? 
                            format(request.startDate.toDate(), 'MMM d, yyyy') : 
                            format(new Date(request.startDate), 'MMM d, yyyy')
                        ) : ''} - 
                        {request.endDate ? (
                          request.endDate.toDate ? 
                            format(request.endDate.toDate(), 'MMM d, yyyy') : 
                            format(new Date(request.endDate), 'MMM d, yyyy')
                        ) : ''}
                      </Typography>
                      {request.reason && (
                        <Typography variant="body2" color="text.secondary">
                          Reason: {request.reason}
                        </Typography>
                      )}
                      {request.approverNote && (
                        <Typography variant="body2" color={request.status === 'approved' ? 'success.main' : 'error.main'}>
                          {request.status === 'approved' ? '✓' : '✕'} {request.approverNote}
                        </Typography>
                      )}
                      {request.medicalCertificateUrl && (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<DescriptionIcon />}
                          onClick={() => window.open(request.medicalCertificateUrl, '_blank')}
                          sx={{ mt: 1 }}
                        >
                          View Medical Certificate
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <Typography variant="body2" color="info.main">
                          {(userRole === 'HR0' || userRole === 'hr') ?
                            'Pending HR approval' :
                            managerData ? `Pending approval from ${managerData.firstName} ${managerData.lastName}` : 'Pending manager approval'
                          }
                        </Typography>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {/* Pending Approvals Section */}
          {(userRole === 'HR0' || userRole === 'hr' || employeeData?.isManager) && pendingApprovals.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Pending Approvals
              </Typography>
              <Stack spacing={2}>
                {pendingApprovals.map((request) => (
                  <Card key={request.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">
                          {request.employeeName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.department}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {request.type} Leave
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {request.startDate ? (
                          request.startDate.toDate ? 
                            format(request.startDate.toDate(), 'MMM d, yyyy') : 
                            format(new Date(request.startDate), 'MMM d, yyyy')
                        ) : ''} - 
                        {request.endDate ? (
                          request.endDate.toDate ? 
                            format(request.endDate.toDate(), 'MMM d, yyyy') : 
                            format(new Date(request.endDate), 'MMM d, yyyy')
                        ) : ''}
                      </Typography>
                      {request.reason && (
                        <Typography variant="body2" color="text.secondary">
                          Reason: {request.reason}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'leaveRequests', request.id), {
                                status: 'approved',
                                approverNote: 'Approved',
                                approvedBy: user?.uid,
                                approvedAt: new Date(),
                                updatedAt: new Date()
                              });
                            } catch (error) {
                              console.error('Error approving request:', error);
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'leaveRequests', request.id), {
                                status: 'rejected',
                                approverNote: 'Rejected',
                                approvedBy: user?.uid,
                                approvedAt: new Date(),
                                updatedAt: new Date()
                              });
                            } catch (error) {
                              console.error('Error rejecting request:', error);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
            sx={{ mt: 3 }}
          >
            Request Time Off
          </Button>
        </Stack>
      </CardContent>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Leave Type"
              value={leaveForm.type}
              onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
            >
              <MenuItem value="casual">Casual Leave</MenuItem>
              <MenuItem value="sick">Sick Leave</MenuItem>
            </TextField>

            <DatePicker
              label="Start Date"
              value={leaveForm.startDate}
              onChange={(date) => date && setLeaveForm({ ...leaveForm, startDate: date })}
            />

            <DatePicker
              label="End Date"
              value={leaveForm.endDate}
              onChange={(date) => date && setLeaveForm({ ...leaveForm, endDate: date })}
            />

            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={4}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />

            {/* Show file upload for sick leave > 3 days */}
            {requiresMedicalCertificate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  * Medical certificate required for sick leave &gt; 3 days
                </Typography>
                <input
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  id="medical-certificate-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="medical-certificate-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                  >
                    {leaveForm.medicalCertificate
                      ? `Selected: ${leaveForm.medicalCertificate.name}`
                      : 'Upload Medical Certificate'}
                  </Button>
                </label>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export const PayrollCard = () => {
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);


  console.log('PayrollCard rendered. User:', user?.uid);

  useEffect(() => {
    console.log('PayrollCard useEffect triggered');
    if (!user?.uid) {
      console.log('No user ID, returning');
      return;
    }

    const fetchPayrollHistory = async () => {
      console.log('Fetching payroll history for user:', user.email);
      try {
        // Query employee document by email
        const q = query(collection(db, 'employees'), where('email', '==', user.email));
        console.log('Query created for:', user.email);
        
        console.log('Setting up onSnapshot listener...');
        const unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('Snapshot received with', snapshot.docs.length, 'docs');
          
          if (snapshot.empty) {
            console.log('No employee document found');
            setPayrollHistory([]);
            setLoading(false);
            return;
          }

          const employeeDoc = snapshot.docs[0];
          const employeeData = employeeDoc.data();
          console.log('Employee data received:', employeeData);
          console.log('Payroll array:', employeeData.payroll);
          
          const payroll = employeeData.payroll || [];
          console.log('Setting payroll history:', payroll);
          setPayrollHistory(payroll);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error in fetchPayrollHistory:', error);
        setLoading(false);
      }
    };

    console.log('Calling fetchPayrollHistory...');
    fetchPayrollHistory();
  }, [user?.uid]);

  console.log('Rendering PayrollCard. Loading:', loading, 'History:', payrollHistory);

  if (loading) {
    console.log('Showing loading state');
    return (
      <Box>
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography>Loading payroll data...</Typography>
            </Stack>
          </CardContent>
        </Card>

  
      </Box>
    );
  }

  console.log('Rendering main card. Payroll history length:', payrollHistory.length);

  return (
    <Box>
      <Card sx={{ p: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" gutterBottom>
              Payroll History
            </Typography>
          
          {payrollHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No payroll records found
            </Typography>
          ) : (
            <Stack spacing={2}>
              {payrollHistory.map((payroll, index) => {
                console.log('Rendering payroll record:', payroll);
                try {
                  return (
                    <Paper key={payroll.payrollId || index} elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Grid container spacing={2}>
                        {/* Header */}
                        <Grid item xs={12}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="h6">
                                {format(new Date(payroll.date.seconds * 1000), 'MMMM yyyy')}
                              </Typography>
                              <Chip
                                label={payroll.calculationMode}
                                color="info"
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="h6" color="primary.main">
                                ${payroll.totalSalary.toFixed(2)}
                              </Typography>
                              <PDFDownloadLink
                                document={
                                  <PayrollPDF
                                    payroll={payroll}
                                    employeeData={{
                                      name: user?.displayName || '',
                                      email: user?.email || '',
                                      department: 'HR',
                                      currentDepartment: 'Marketing',
                                    }}
                                  />
                                }
                                fileName={`payslip-${format(new Date(payroll.date.seconds * 1000), 'MMM-yyyy')}.pdf`}
                                style={{ textDecoration: 'none' }}
                              >
                                {({ blob, url, loading, error }) => (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    title="Download Payslip"
                                    disabled={loading}
                                  >
                                    {loading ? <CircularProgress size={20} /> : <DescriptionIcon />}
                                  </IconButton>
                                )}
                              </PDFDownloadLink>
                            </Stack>
                          </Stack>
                        </Grid>

                        <Grid item xs={12}>
                          <Divider />
                        </Grid>

                        {/* Work Hours */}
                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                            <Stack spacing={2}>
                              <Typography variant="subtitle1" color="text.secondary">
                                Work Hours
                              </Typography>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2">Regular Hours:</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                    {payroll.regularHours} hrs
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2">Overtime Hours:</Typography>
                                  <Typography variant="body2" fontWeight="medium" color={payroll.overtimeHours > 0 ? 'warning.main' : 'text.secondary'}>
                                    {payroll.overtimeHours} hrs
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2">Total Hours:</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                    {(payroll.regularHours + payroll.overtimeHours).toFixed(2)} hrs
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Grid>

                        {/* Earnings */}
                        <Grid item xs={12} sm={6}>
                          <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                            <Stack spacing={2}>
                              <Typography variant="subtitle1" color="text.secondary">
                                Earnings Breakdown
                              </Typography>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2">Base Salary:</Typography>
                                  <Typography variant="body2" fontWeight="medium">
                                    ${payroll.baseSalary.toFixed(2)}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2">Overtime Pay:</Typography>
                                  <Typography variant="body2" fontWeight="medium" color={payroll.overtimePay > 0 ? 'warning.main' : 'text.secondary'}>
                                    ${payroll.overtimePay.toFixed(2)}
                                  </Typography>
                                </Stack>
                                <Divider />
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" fontWeight="medium">Total Earnings:</Typography>
                                  <Typography variant="body2" fontWeight="medium" color="success.main">
                                    ${payroll.totalSalary.toFixed(2)}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                } catch (error) {
                  console.error('Error rendering payroll record:', error, 'Record:', payroll);
                  return null;
                }
              })}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
    </Box>
  );
};

export const EmployeeDashboard = () => {
  const { user, userRole } = useAuth();
  const { department, departmentProjects = [], loading: projectsLoading } = useManagerData();
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressComment, setProgressComment] = useState('');
  const [newProgress, setNewProgress] = useState(0);

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleUpdateProgress = (task) => {
    setSelectedTask(task);
    setNewProgress(task.progress || 0);
    setProgressComment('');
    setIsProgressDialogOpen(true);
  };

  const handleProgressSubmit = async () => {
    if (!selectedTask || !progressComment.trim()) return;

    try {
      const taskRef = doc(db, 'tasks', selectedTask.id);
      const taskDoc = await getDoc(taskRef);

      if (taskDoc.exists()) {
        const currentTask = taskDoc.data();
        const newComment = {
          text: progressComment,
          timestamp: new Date(),
          userId: user?.uid || '',
          userName: user?.displayName || '',
          progress: newProgress
        };

        const updatedComments = [newComment, ...(currentTask.comments || [])];

        await updateDoc(taskRef, {
          progress: newProgress,
          comments: updatedComments,
          lastUpdated: new Date(),
          latestComment: newComment
        });

        showSnackbar('Progress updated successfully', 'success');
        setIsProgressDialogOpen(false);
        setProgressComment('');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      showSnackbar('Error updating progress', 'error');
    }
  };
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  // Load tasks with real-time updates
  useEffect(() => {
    if (!user) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assigneeId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const updatedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        comments: doc.data().comments || []
      }));
      setTasks(updatedTasks);
    }, (error) => {
      console.error('Error loading tasks:', error);
      showSnackbar('Error loading tasks', 'error');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Get employee details for non-HR users
        const employeeSnapshot = await getDocs(
          query(collection(db, 'employees'), where('email', '==', user.email))
        );
        
        if (employeeSnapshot.empty) {
          console.error('No employee record found for the current user');
          setLoading(false);
          return;
        }

        const employeeData = employeeSnapshot.docs[0].data();
        const departmentId = employeeData.departmentId;

        // Load team members from the same department
        if (departmentId) {
          const teamMembersQuery = query(
            collection(db, 'employees'),
            where('departmentId', '==', departmentId),
            where('email', '!=', user.email) // Exclude current user
          );
          const teamMembersSnapshot = await getDocs(teamMembersQuery);
          const teamMembersData = teamMembersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTeamMembers(teamMembersData);
        }

        // Load recent expenses
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(
          expensesRef, 
          where('employeeId', '==', user.uid), 
          orderBy('createdAt', 'desc')
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentExpenses(expensesData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const loadTasks = useCallback(async () => {
    if (!user) return;

    try {
      let allTasks = [];

      // Load tasks from projects
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);

      for (const projectDoc of projectsSnapshot.docs) {
        const tasksRef = collection(db, `projects/${projectDoc.id}/tasks`);
        const tasksQuery = query(tasksRef, where('assigneeId', '==', user.uid));
        const tasksSnapshot = await getDocs(tasksQuery);

        const projectTasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          projectId: projectDoc.id,
          projectName: projectDoc.data().name,
          ...doc.data(),
          // Set default values for required fields
          status: doc.data().status || 'todo',
          progress: doc.data().progress || 0,
          comments: doc.data().comments || [],
          priority: doc.data().priority || 'medium',
          dueDate: doc.data().dueDate || null
        }));

        allTasks = [...allTasks, ...projectTasks];
      }

      // Load tasks from root collection
      const rootTasksRef = collection(db, 'tasks');
      const rootTasksQuery = query(rootTasksRef, where('assigneeId', '==', user.uid));
      const rootTasksSnapshot = await getDocs(rootTasksQuery);

      const rootTasks = rootTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Set default values for required fields
        status: doc.data().status || 'todo',
        progress: doc.data().progress || 0,
        comments: doc.data().comments || [],
        priority: doc.data().priority || 'medium',
        dueDate: doc.data().dueDate || null
      }));

      allTasks = [...allTasks, ...rootTasks];

      // Sort tasks by due date and completion status
      const sortedTasks = allTasks.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        
        const aDate = safeConvertToDate(a.dueDate);
        const bDate = safeConvertToDate(b.dueDate);
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });

      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for tasks
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('assigneeId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTasks = snapshot.docs.map(doc => {
        const data = doc.data();
        const comments = data.comments || [];
        // Sort comments by timestamp in descending order (newest first)
        comments.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        return {
          id: doc.id,
          ...data,
          comments,
          progress: data.progress || 0,
          dueDate: data.dueDate?.toDate(),
          completed: data.status === 'done',
          latestComment: comments[0] || null
        };
      });

      // Sort tasks by due date
      const sortedTasks = loadedTasks.sort((a, b) => {
        const aDate = a.dueDate;
        const bDate = b.dueDate;
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });

      setTasks(sortedTasks);
    });

    return () => unsubscribe();
  }, [user]);

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Find the task and its project
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const updates = {
        status: newStatus,
        completed: newStatus === 'done',
        updatedAt: new Date()
      };

      // If task has projectId, it's in a project subcollection
      if (task.projectId) {
        await updateDoc(doc(db, `projects/${task.projectId}/tasks`, taskId), updates);
      } else {
        // Otherwise it's in the root tasks collection
        await updateDoc(doc(db, 'tasks', taskId), updates);
      }

      // Update local state
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAddQuickTask = async (title: string) => {
    if (!user) return;

    try {
      // Create a new task in the default project or personal tasks
      const newTask = {
        title,
        description: '',
        status: 'todo',
        assigneeId: user.uid,
        createdAt: new Date(),
        dueDate: new Date(),
        priority: 'medium'
      };

      // Add task logic here
      console.log('Adding quick task:', newTask);
    } catch (error) {
      console.error('Error adding quick task:', error);
    }
  };

  const handleToggleTaskStatus = (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    handleTaskStatusChange(task.id, newStatus);
  };

  const calendarEvents = useMemo(() => {
    return tasks
      .filter(task => {
        const dueDate = safeConvertToDate(task.dueDate);
        return dueDate !== null && !task.completed;
      })
      .map(task => {
        const dueDate = safeConvertToDate(task.dueDate);
        if (!dueDate) return null;

        return {
          id: task.id,
          title: task.title,
          start: dueDate,
          end: dueDate,
          backgroundColor: task.priority === 'high' ? '#ef4444' : 
                          task.priority === 'medium' ? '#f97316' : '#22c55e',
          borderColor: 'transparent',
          textColor: '#fff',
          allDay: true,
          extendedProps: {
            description: task.description,
            projectName: task.projectName,
            priority: task.priority
          }
        };
      })
      .filter(Boolean);
  }, [tasks]);

  const renderEventContent = (eventInfo: any) => {
    const event = eventInfo.event;
    return (
      <Box sx={{ 
        p: 0.5, 
        display: 'flex', 
        alignItems: 'center',
        gap: 0.5,
        fontSize: '0.75rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        <Box sx={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%',
          backgroundColor: event.backgroundColor,
          flexShrink: 0
        }} />
        <Typography variant="caption" noWrap>
          {event.title}
          {event.extendedProps.projectName && 
            ` (${event.extendedProps.projectName})`}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={24} />
      </Box>
    );
  }

  const activeProjects = departmentProjects.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  const tabs = [
    {
      label: 'Overview',
      content: (
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            {/* Summary Cards - Left Column */}
            <Grid item xs={12} md={9}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                    color: '#FFFFFF',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    },
                    transition: 'all 0.3s'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                          <ProjectIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h4" fontWeight="bold">
                            {activeProjects}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                            My Active Projects
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                    color: '#FFFFFF',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    },
                    transition: 'all 0.3s'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                          <TaskIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h4" fontWeight="bold">
                            {completedTasks}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                            Completed Tasks
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    color: '#FFFFFF',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    },
                    transition: 'all 0.3s'
                  }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                          <TimeIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h4" fontWeight="bold">
                            {pendingTasks}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                            Pending Tasks
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Recent Activity */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Latest Tasks
                        </Typography>
                        <List>
                          {tasks
                            .filter(task => !['done', 'completed'].includes(task.status))
                            .slice(0, 3)
                            .map((task) => (
                              <ListItem key={task.id} disablePadding>
                                <ListItemButton>
                                  <ListItemIcon>
                                    <TaskIcon color={task.status === 'done' ? 'success' : 'action'} />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={task.title}
                                    secondary={
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {task.dueDate && (
                                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TimeIcon fontSize="small" />
                                            Due: {
                                              task.dueDate instanceof Date 
                                                ? format(task.dueDate, 'MMM d, yyyy')
                                                : task.dueDate?.toDate 
                                                  ? format(task.dueDate.toDate(), 'MMM d, yyyy')
                                                  : task.dueDate 
                                                    ? format(new Date(task.dueDate), 'MMM d, yyyy')
                                                    : 'No due date'
                                            }
                                          </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Progress: {task.progress || 0}%
                                          </Typography>
                                          <LinearProgress 
                                            variant="determinate" 
                                            value={task.progress || 0}
                                            sx={{ flexGrow: 1, height: 4, borderRadius: 1 }}
                                          />
                                        </Box>
                                        {task.latestComment && (
                                          <Typography variant="caption" color="text.secondary">
                                            Latest: {task.latestComment.text} - {task.latestComment.userName} ({format(task.latestComment.timestamp.toDate(), 'MMM d, HH:mm')})
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                  />
                                </ListItemButton>
                              </ListItem>
                            ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Calendar - Right Column */}
            <Grid item xs={12} md={3}>
              <MiniCalendar
                userId={user?.uid || ''}
                events={calendarEvents}
                selectedDate={new Date()}
                onDateChange={() => {}}
                onAddTask={handleAddQuickTask}
                renderEventContent={renderEventContent}
              />
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Projects & Tasks',
      content: (
        <Box sx={{ py: 3 }}>
          {/* Projects Section */}
          <Box sx={{ mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                My Projects
              </Typography>
              <Button
                variant="contained"
                href="/projects"
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                }}
              >
                View All Projects
              </Button>
            </Box>
            <Grid container spacing={2}>
              {departmentProjects
                .filter(project => project.status !== 'completed' && project.status !== 'done')
                .map((project) => (
                <Grid item xs={12} md={6} key={project.id}>
                  <ProjectCard project={project} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Tasks Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Your Tasks</Typography>
            <Box 
              sx={{ 
                maxHeight: 400,
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#bdbdbd',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#9e9e9e'
                  }
                }
              }}
            >
              {tasks
                .filter(task => !task.completed && task.status !== 'done' && task.status !== 'completed')
                .map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }
                  }}
                >
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Checkbox 
                        checked={task.completed}
                        onChange={() => handleToggleTaskStatus(task)}
                        sx={{ 
                          ml: -1,
                          '&.Mui-checked': {
                            color: 'success.main'
                          }
                        }}
                      />
                      <Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 500,
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'text.secondary' : 'text.primary',
                            fontSize: '0.875rem'
                          }}
                        >
                          {task.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              height: 24,
                              bgcolor: 
                                task.priority === 'high' ? 'error.main' :
                                task.priority === 'medium' ? 'warning.main' : 'success.main',
                              color: '#fff'
                            }}
                          />
                          {task.dueDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                              <AccessTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              {
                                task.dueDate instanceof Date 
                                  ? format(task.dueDate, 'MMM d, yyyy')
                                  : task.dueDate?.toDate 
                                    ? format(task.dueDate.toDate(), 'MMM d, yyyy')
                                    : task.dueDate 
                                      ? format(new Date(task.dueDate), 'MMM d, yyyy')
                                      : 'No due date'
                              }
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditTask(task)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Progress Section */}
                  <Box sx={{ mb: task.comments?.length ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress: {task.progress || 0}%
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleUpdateProgress(task)}
                        sx={{ 
                          ml: 'auto',
                          minWidth: 'auto',
                          color: 'primary.main',
                          '&:hover': { bgcolor: 'primary.50' }
                        }}
                      >
                        Update
                      </Button>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={task.progress || 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.100',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: task.completed ? 'success.main' : 'primary.main',
                          borderRadius: 3
                        }
                      }}
                    />
                  </Box>

                  {/* Latest Comment Section */}
                  {task.comments && task.comments.length > 0 && task.comments[0].timestamp && (
                    <Box 
                      sx={{ 
                        mt: 2,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.100'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.875rem' }}>
                        {task.comments[0].text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24,
                            fontSize: '0.875rem',
                            bgcolor: 'primary.main'
                          }}
                        >
                          {task.comments[0].userName?.charAt(0) || '?'}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {task.comments[0].userName || 'Unknown'} • {task.comments[0].timestamp?.toDate ? 
                            format(task.comments[0].timestamp.toDate(), 'MMM d, HH:mm') : 
                            format(new Date(task.comments[0].timestamp), 'MMM d, HH:mm')}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Expenses Section */}
          <Box sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Expenses
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setShowExpenseDialog(true)}
                size="small"
              >
                New Expense
              </Button>
            </Box>
            <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
              <List dense>
                {recentExpenses.slice(0, 5).map((expense) => (
                  <ListItem
                    key={expense.id}
                    divider
                    sx={{
                      borderLeft: 2,
                      borderColor: 
                        expense.status === 'approved' ? 'success.main' :
                        expense.status === 'declined' ? 'error.main' : 'warning.main',
                      pl: 1
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption">
                            ${expense.amount.toFixed(2)} - {expense.category.replace('_', ' ')}
                          </Typography>
                          <Chip
                            label={expense.status}
                            size="small"
                            color={
                              expense.status === 'approved' ? 'success' :
                              expense.status === 'declined' ? 'error' : 'warning'
                            }
                          />
                        </Box>
                      }
                      secondary={format(expense.submittedAt.toDate(), 'MMM d, yyyy')}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Box>
      )
    },
    {
      label: 'Team',
      content: (
        <Box sx={{ py: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Your Team Members
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : teamMembers.length > 0 ? (
            <Grid container spacing={2}>
              {teamMembers.map((member) => (
                <Grid item xs={12} sm={6} md={4} key={member.id}>
                  <TeamMemberCard member={member} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box py={4} textAlign="center">
              <Typography color="text.secondary">
                No team members found in your department
              </Typography>
            </Box>
          )}
        </Box>
      )
    },
    {
      label: 'Time Off',
      content: (
        <Box sx={{ py: 3 }}>
          <TimeOffCard />
        </Box>
      )
    },
    {
      label: 'Performance Reviews',
      content: (
        <Box sx={{ py: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            My Performance Reviews
          </Typography>
          <EmployeeReviewView userId={user?.uid || ''} />
        </Box>
      )
    },
    {
      label: 'Expenses',
      content: (
        <Box sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="subtitle1">
              My Expenses
            </Typography>
            <Button
              variant="contained"
              startIcon={<ExpenseIcon />}
              onClick={() => setShowExpenseDialog(true)}
            >
              Submit Expense
            </Button>
          </Box>
          <ExpenseCard />
        </Box>
      )
    },
    {
      label: 'Timesheet',
      content: (
        <Box sx={{ py: 3 }}>
          <EmployeeTimesheetContent />
        </Box>
      ),
    },
    {
      label: 'Payroll',
      content: (
        <Box sx={{ py: 3 }}>
          <PayrollCard />
        </Box>
      ),
    },
  ];

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Welcome back! Here's what's happening with your projects.
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="dashboard tabs"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 'medium',
                minWidth: 90,
                minHeight: 40,
                py: 0.5
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                id={`dashboard-tab-${index}`}
                aria-controls={`dashboard-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            hidden={activeTab !== index}
            id={`dashboard-tabpanel-${index}`}
            aria-labelledby={`dashboard-tab-${index}`}
          >
            {activeTab === index && tab.content}
          </div>
        ))}
      </Container>

      <Dialog
        open={showExpenseDialog}
        onClose={() => setShowExpenseDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit New Expense</DialogTitle>
        <DialogContent>
          <ExpenseForm onSubmit={() => {
            setShowExpenseDialog(false);
          }} />
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <Dialog
        open={isProgressDialogOpen}
        onClose={() => setIsProgressDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Current Progress: {selectedTask?.progress || 0}%
            </Typography>
            <Slider
              value={newProgress}
              onChange={(_, value) => setNewProgress(value as number)}
              valueLabelDisplay="auto"
              step={1}
              min={0}
              max={100}
              sx={{
                '& .MuiSlider-markLabel': {
                  fontSize: '0.75rem'
                }
              }}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Progress Update Comment"
            value={progressComment}
            onChange={(e) => setProgressComment(e.target.value)}
            placeholder="Describe the progress made..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProgressDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleProgressSubmit}
            variant="contained"
            disabled={!progressComment.trim()}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          {/* Add edit task form fields here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Add save logic here
              setIsEditDialogOpen(false);
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
