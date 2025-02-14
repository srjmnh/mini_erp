import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Stack,
  useTheme,
  Divider,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Assignment as ProjectsIcon,
  CalendarMonth as CalendarIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useManagerData } from '@/hooks/useManagerData';
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, updateDoc, orderBy, onSnapshot, limit, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PayrollCard } from './EmployeeDashboard';
import { PerformanceReview } from '../performance/components/PerformanceReview';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { supabase } from '@/config/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import ExpenseApprovals from '../expenses/ExpenseApprovals';
import ManagerExpenseForm from '../expenses/ManagerExpenseForm';
import ManagerLeaveForm from '../leave/ManagerLeaveForm';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import { TaskView } from '@/features/calendar/components/TaskView';
import TimesheetManagerCard from './components/TimesheetManagerCard';
import TimesheetContent from './components/TimesheetContent';

export default function ManagerDashboard() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('leaves');
  const [timesheetTab, setTimesheetTab] = useState('daily');
  const [historicalRequests, setHistoricalRequests] = useState<any[]>([]);
  const [departmentDocs, setDepartmentDocs] = useState<any[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useSupabase();
  const [commentDialog, setCommentDialog] = useState({
    open: false,
    requestId: '',
    action: '',
    comment: ''
  });
  const navigate = useNavigate();
  const { department, departmentEmployees = [], departmentProjects = [], loading, error } = useManagerData();
  const { user, userRole } = useAuth();
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([]);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [historyTab, setHistoryTab] = useState('expenses');
  const [teamHistoryTab, setTeamHistoryTab] = useState('expenses');
  const [myExpenses, setMyExpenses] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [historicalExpenses, setHistoricalExpenses] = useState<any[]>([]);
  const [historicalLeaves, setHistoricalLeaves] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [departmentTasks, setDepartmentTasks] = useState<any[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdfPreview, setIsPdfPreview] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: null as Date | null,
    priority: 'medium',
    assigneeId: '',
  });

  // Listen to leave requests
  // Fetch department documents
  const fetchDocuments = async () => {
    if (!department?.id) return;

    try {
      console.log('Fetching documents for department:', department.id);
      const { data: files, error } = await supabase.storage
        .from('documents')
        .list(`departments/${department.id}`);

      if (error) throw error;

      if (!files) {
        setDepartmentDocs([]);
        return;
      }

      // Get URLs for all files
      const docs = await Promise.all(files.map(async (file) => {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(`departments/${department.id}/${file.name}`);

        return {
          id: file.id,
          name: file.name,
          url: urlData.publicUrl,
          createdAt: file.created_at,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || '',
          path: `departments/${department.id}/${file.name}`
        };
      }));

      console.log('Processed documents:', docs);
      setDepartmentDocs(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  useEffect(() => {
    if (!department?.id) return;
    fetchDocuments();

    // Set up real-time subscription for changes
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'storage',
          table: 'objects',
          filter: `path=like.departments/${department.id}/%`
        },
        () => {
          console.log('Document change detected, refreshing...');
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [department?.id]);

  useEffect(() => {
    if (!user?.uid || !department?.id) {
      console.log('Missing user or department:', { userId: user?.uid, departmentId: department?.id });
      return;
    }

    // Log the current department info
    console.log('Current department:', {
      id: department.id,
      name: department.name,
      managerId: department.managerId
    });

    console.log('Setting up listeners with:', { 
      userId: user.uid, 
      departmentId: department.id 
    });

    const fetchMyExpenses = async () => {
      console.log('Fetching my expenses...');
      const myExpensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('submittedAt', 'desc')
      );

      return onSnapshot(myExpensesQuery, (snapshot) => {
        console.log('Got my expenses snapshot:', { 
          count: snapshot.docs.length,
          empty: snapshot.empty,
          metadata: snapshot.metadata
        });
        console.log('Got my expenses snapshot, count:', snapshot.docs.length);
        const expenses = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || null,
          };
        });
        console.log('Processed my expenses:', expenses);
        setMyExpenses(expenses);
      });
    };

    const fetchMyLeaves = async () => {
      console.log('Fetching my leaves...');
      // Query for both userId and employeeId since we've used both in different places
      const myLeavesQuery = query(
        collection(db, 'leaveRequests'),
        where('userId', '==', user.uid),
        orderBy('submittedAt', 'desc')
      );

      return onSnapshot(myLeavesQuery, (snapshot) => {
        console.log('Got my leaves snapshot:', { 
          count: snapshot.docs.length,
          empty: snapshot.empty,
          metadata: snapshot.metadata
        });
        const leaves = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || null,
            startDate: data.startDate?.toDate() || null,
            endDate: data.endDate?.toDate() || null,
          };
        });
        console.log('Processed my leaves:', leaves);
        setMyLeaves(leaves);
      });
    };

    const fetchHistoricalExpenses = async () => {
      console.log('Fetching historical expenses with:', {
        userDepartment: department.id,
        status: ['approved', 'rejected']
      });

      const historicalExpensesQuery = query(
        collection(db, 'expenses'),
        where('userDepartment', '==', department.id),
        where('status', 'in', ['approved', 'rejected']),
        orderBy('submittedAt', 'desc'),
        limit(50)
      );

      return onSnapshot(historicalExpensesQuery, (snapshot) => {
        console.log('Got historical expenses snapshot:', { 
          count: snapshot.docs.length,
          empty: snapshot.empty,
          metadata: snapshot.metadata,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        });
        const expenses = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || null,
            lastUpdatedAt: data.lastUpdatedAt?.toDate() || null,
            approvedAt: data.approvedAt?.toDate() || null,
          };
        });
        console.log('Processed historical expenses:', expenses);
        setHistoricalExpenses(expenses);
      });
    };

    const fetchHistoricalLeaves = async () => {
      console.log('Fetching historical leaves with:', {
        departmentId: department.id,
        status: ['approved', 'rejected']
      });

      const historicalLeavesQuery = query(
        collection(db, 'leaveRequests'),
        where('departmentId', '==', department.id),
        where('status', 'in', ['approved', 'rejected']),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );

      return onSnapshot(historicalLeavesQuery, (snapshot) => {
        console.log('Got historical leaves snapshot:', { 
          count: snapshot.docs.length,
          empty: snapshot.empty,
          metadata: snapshot.metadata
        });
        const leaves = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastUpdatedAt: data.updatedAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || null,
            approvedAt: data.approvedAt?.toDate() || null,
            startDate: data.startDate?.toDate() || null,
            endDate: data.endDate?.toDate() || null,
          };
        });
        console.log('Processed historical leaves:', leaves);
        setHistoricalLeaves(leaves);
      });
    };

    const fetchMyTasks = async () => {
      if (!user?.uid) return;

      try {
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', user.uid),
          orderBy('dueDate', 'asc')
        );

        return onSnapshot(tasksQuery, (snapshot) => {
          const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate() || null
          }));
          setMyTasks(tasks);
        });
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    const fetchDepartmentTasks = async () => {
      if (!user?.uid) return;

      try {
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', user.uid),
          orderBy('dueDate', 'asc')
        );

        return onSnapshot(tasksQuery, async (snapshot) => {
          const taskDocs = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
            
            // Get assignee details
            let assignedTo = 'Unassigned';
            if (data.assigneeId) {
              const employeeRef = doc(db, 'employees', data.assigneeId);
              const assigneeDoc = await getDoc(employeeRef);
              if (assigneeDoc.exists()) {
                const assigneeData = assigneeDoc.data();
                assignedTo = assigneeData.firstName && assigneeData.lastName ? 
                  `${assigneeData.firstName} ${assigneeData.lastName}` : 
                  assigneeData.name || 'Unknown';
              }
            }

            // Get comments
            const commentsQuery = query(
              collection(db, `tasks/${doc.id}/comments`),
              orderBy('timestamp', 'desc')
            );
            const commentsSnapshot = await getDocs(commentsQuery);
            const comments = commentsSnapshot.docs.map(commentDoc => {
              const commentData = commentDoc.data();
              return {
                text: commentData.text,
                progress: commentData.progress,
                timestamp: commentData.timestamp?.toDate(),
                userId: commentData.userId,
                userName: commentData.userName
              };
            });

            return {
              id: doc.id,
              ...data,
              dueDate,
              assignedTo,
              comments,
              completed: data.completed === true || data.status === 'done',
              latestComment: comments.length > 0 ? comments[0] : null
            };
          });

          setDepartmentTasks(await Promise.all(taskDocs));
        });
      } catch (error) {
        console.error('Error fetching department tasks:', error);
      }
    };

    // Set up all listeners
    let unsubscribers: Array<() => void> = [];

    Promise.all([
      fetchMyExpenses(),
      fetchMyLeaves(),
      fetchHistoricalExpenses(),
      fetchHistoricalLeaves(),
      fetchMyTasks(),
      fetchDepartmentTasks()
    ]).then(unsubs => {
      unsubscribers = unsubs.filter(Boolean) as Array<() => void>;
    });

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [department?.id, user?.uid]);

  useEffect(() => {
    console.log('Department:', department);
    console.log('UserRole:', userRole);
    
    if (!department?.id || department.id === 'all') {
      console.log('Skipping leave requests query - invalid department');
      return;
    }

    // For HR, get all requests
    // For managers, get their department's requests
    const pendingQuery = userRole === 'HR0' || userRole === 'hradmin' ?
      query(
        collection(db, 'leaveRequests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      ) :
      query(
        collection(db, 'leaveRequests'),
        where('departmentId', '==', department.id),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

    const historicalQuery = userRole === 'HR0' || userRole === 'hradmin' ?
      query(
        collection(db, 'leaveRequests'),
        where('status', 'in', ['approved', 'rejected']),
        orderBy('updatedAt', 'desc'),
        limit(50)
      ) :
      query(
        collection(db, 'leaveRequests'),
        where('departmentId', '==', department.id),
        where('status', 'in', ['approved', 'rejected']),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );

    console.log('Setting up leave requests listeners...');
    
    const unsubscribePending = onSnapshot(pendingQuery, async (snapshot) => {
      console.log('Got leave requests snapshot, count:', snapshot.docs.length);
      const requests = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get employee details
        const employeeRef = firestoreDoc(db, 'employees', data.employeeId);
        const employeeDoc = await getDoc(employeeRef);
        const employeeData = employeeDoc.exists() ? employeeDoc.data() : null;
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          employeeName: employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'Unknown',
          role: employeeData?.role || 'Unknown'
        };
      }));
      console.log('Processed leave requests:', requests);
      setPendingLeaveRequests(requests);
    });

    // Set up historical requests listener
    const unsubscribeHistorical = onSnapshot(historicalQuery, async (snapshot) => {
      console.log('Got historical requests snapshot, count:', snapshot.docs.length);
      const requests = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get employee details
        const employeeRef = firestoreDoc(db, 'employees', data.employeeId);
        const employeeDoc = await getDoc(employeeRef);
        const employeeData = employeeDoc.exists() ? employeeDoc.data() : null;
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          employeeName: employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'Unknown',
          role: employeeData?.role || 'Unknown'
        };
      }));
      console.log('Processed historical requests:', requests);
      setHistoricalRequests(requests);
    });

    return () => {
      unsubscribePending();
      unsubscribeHistorical();
    };
  }, [department?.id]);

  // Handle leave request submission for manager
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !department?.id) return;

    try {
      const employeeData = departmentEmployees.find(emp => emp.email === user.email);
      if (!employeeData) {
        console.error('Employee record not found');
        return;
      }

      const leaveData = {
        employeeId: employeeData.id,
        departmentId: department.id,
        type: leaveType,
        startDate: startDate,
        endDate: endDate,
        reason: leaveReason,
        status: 'approved', // Auto-approve for managers
        statusText: 'Auto-approved (Manager\'s leave request)',
        approvedBy: user.uid,
        approverName: `${employeeData.firstName} ${employeeData.lastName}`,
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        notified: false
      };

      await addDoc(collection(db, 'leaveRequests'), leaveData);
      console.log('Leave request submitted and auto-approved');
      
      // Reset form
      setLeaveType('');
      setStartDate(null);
      setEndDate(null);
      setLeaveReason('');
      
    } catch (error) {
      console.error('Error submitting leave request:', error);
    }
  };

  // Update task status
  const handleTaskStatusChange = async (taskId: string, newStatus: string, progress?: number, comment?: string) => {
    try {
      const updates: any = {
        status: newStatus,
        completed: newStatus === 'done',
        updatedAt: new Date()
      };

      if (typeof progress !== 'undefined') {
        updates.progress = progress;
      }

      // Add a comment for the update
      const commentRef = collection(db, `tasks/${taskId}/comments`);
      await addDoc(commentRef, {
        text: comment || `Task marked as ${newStatus}`,
        createdAt: new Date(),
        createdBy: user?.uid,
        type: progress !== undefined ? 'progress_update' : 'status_update',
        progress: progress
      });

      await updateDoc(doc(db, 'tasks', taskId), updates);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Add new task
  const handleAddTask = async () => {
    if (!department?.id || !newTask.title || !newTask.dueDate || !newTask.assigneeId) return;

    try {
      const taskData = {
        ...newTask,
        userId: user?.uid,
        createdAt: new Date(),
        status: 'pending',
        progress: 0
      };

      await addDoc(collection(db, 'tasks'), taskData);
      setShowTaskDialog(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: null,
        priority: 'medium',
        assigneeId: '',
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!department) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Department not found</Typography>
      </Box>
    );
  }

  const stats = [
    {
      title: 'Leave Requests',
      value: pendingLeaveRequests.length,
      icon: <CalendarIcon sx={{ fontSize: 24, color: theme.palette.info.main }} />,
    },
    {
      title: 'Department',
      value: department.name,
      icon: <BusinessIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />,
    },
    {
      title: 'Team Members',
      value: departmentEmployees.length,
      icon: <PeopleIcon sx={{ fontSize: 24, color: theme.palette.success.main }} />,
    },
    {
      title: 'Active Projects',
      value: departmentProjects.length,
      icon: <ProjectsIcon sx={{ fontSize: 24, color: theme.palette.warning.main }} />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {department?.name || 'Department'} Dashboard
      </Typography>

      {/* Department Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {stat.icon}
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5">{stat.value}</Typography>
                  </Box>
                </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Team Members */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Team Members
          </Typography>
          <Grid container spacing={2}>
            {departmentEmployees.map((employee) => (
              <Grid item xs={12} sm={6} md={4} key={employee.id}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => navigate(`/employees/${employee.id}`)}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar>{employee.firstName?.[0] || ''}{employee.lastName?.[0] || ''}</Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
                        {employee.firstName || ''} {employee.lastName || ''}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {employee.role}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
      </Paper>

      {/* Projects and Leave Requests Tab Section */}
      <Grid container spacing={2}>
        <Grid item xs={12} sx={{ height: 'calc(100vh - 250px)' }}>
          <Paper elevation={1} sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.paper'
          }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                pt: 1
              }}
            >
              <Tab label="Leave Requests" value="leaves" />
              <Tab label="Expense Approvals" value="expenses" />
              <Tab label="History" value="history" />
              <Tab label="Projects" value="projects" />
              <Tab label="Timesheet" value="timesheet" />
              <Tab label="Documents" value="documents" />
              <Tab label="Tasks" value="tasks" />
              <Tab label="Payroll" value="payroll" />
              <Tab label="Performance Reviews" value="performance" />
              <Tab label="HR Access" value="hr" />
            </Tabs>
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
              {activeTab === 'expenses' && (
                <Box>
                  {/* Submit Expense Section */}
                  <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Submit New Expense
                    </Typography>
                    <ManagerExpenseForm />
                  </Paper>

                  {/* Expense Approvals Section */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Pending Expense Approvals
                    </Typography>
                    <ExpenseApprovals />
                  </Paper>
                </Box>
              )}
              {activeTab === 'leaves' && (
                <Box>
                  {/* Submit Leave Request Section */}
                  <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Submit Leave Request
                    </Typography>
                    <ManagerLeaveForm />
                  </Paper>

                  {/* Leave Approvals Section */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Pending Leave Requests
                    </Typography>
                    {pendingLeaveRequests.length === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No pending leave requests
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {pendingLeaveRequests.map((request) => (
                          <Card key={request.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">
                                  {request.employeeName}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={request.type}
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: '24px' }}
                                />
                              </Stack>
                              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
                                {request.startDate && format(request.startDate, 'MMM d')} - {request.endDate && format(request.endDate, 'MMM d, yyyy')}
                              </Typography>
                              {request.reason && (
                                <Typography variant="body2" color="textSecondary" sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  fontSize: '0.875rem'
                                }}>
                                  {request.reason}
                                </Typography>
                              )}
                              {request.medicalCertificateUrl && (
                                <Button
                                  variant="text"
                                  size="small"
                                  startIcon={<DescriptionIcon />}
                                  onClick={() => {
                                    setIsPdfPreview(request.medicalCertificateUrl.toLowerCase().endsWith('.pdf'));
                                    setPreviewUrl(request.medicalCertificateUrl);
                                  }}
                                  sx={{ alignSelf: 'flex-start' }}
                                >
                                  View Medical Certificate
                                </Button>
                              )}
                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  sx={{ minWidth: '90px', py: 0.5 }}
                                  onClick={() => setCommentDialog({
                                    open: true,
                                    requestId: request.id,
                                    action: 'approve',
                                    comment: ''
                                  })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  sx={{ minWidth: '90px', py: 0.5 }}
                                  onClick={() => setCommentDialog({
                                    open: true,
                                    requestId: request.id,
                                    action: 'reject',
                                    comment: ''
                                  })}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Box>
              )}
              {activeTab === 'history' && (
                <Box>
                  {/* Manager's Personal History */}
                  <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      My History
                    </Typography>
                    <Tabs value={historyTab} onChange={(e, val) => setHistoryTab(val)} sx={{ mb: 2 }}>
                      <Tab label="My Expenses" value="expenses" />
                      <Tab label="My Leave Requests" value="leaves" />
                    </Tabs>
                    
                    {historyTab === 'expenses' && (
                      <Stack spacing={2}>
                        {myExpenses.map((expense) => (
                          <Card key={expense.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">
                                  ${expense.amount} - {expense.category}
                                </Typography>
                                <Chip
                                  size="small"
                                  label="Auto-approved"
                                  color="success"
                                  sx={{ height: '24px' }}
                                />
                              </Stack>
                              <Typography variant="body2" color="textSecondary">
                                {expense.description}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Submitted on {expense.submittedAt ? format(expense.submittedAt, 'MMM d, yyyy') : 'Unknown date'}
                              </Typography>
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    )}

                    {historyTab === 'leaves' && (
                      <Stack spacing={2}>
                        {myLeaves.map((leave) => (
                          <Card key={leave.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1">
                                  {leave.type}
                                </Typography>
                                <Chip
                                  size="small"
                                  label="Auto-approved"
                                  color="success"
                                  sx={{ height: '24px' }}
                                />
                              </Stack>
                              <Typography variant="body2">
                                {leave.startDate ? format(leave.startDate, 'MMM d') : 'Unknown'} - {leave.endDate ? format(leave.endDate, 'MMM d, yyyy') : 'Unknown'}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {leave.reason}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Submitted on {leave.submittedAt ? format(leave.submittedAt, 'MMM d, yyyy') : 'Unknown date'}
                              </Typography>
                            </Stack>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Paper>

                  {/* Team History */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Team History
                    </Typography>
                    <Tabs value={teamHistoryTab} onChange={(e, val) => setTeamHistoryTab(val)} sx={{ mb: 2 }}>
                      <Tab label="Expense Approvals" value="expenses" />
                      <Tab label="Leave Approvals" value="leaves" />
                    </Tabs>

                    {teamHistoryTab === 'expenses' && (
                      <Stack spacing={2}>
                        {historicalExpenses.length === 0 ? (
                          <Typography color="text.secondary" align="center" py={4}>
                            No processed expense requests found
                          </Typography>
                        ) : (
                          historicalExpenses.map((expense) => (
                            <Card key={expense.id} variant="outlined" sx={{ p: 2 }}>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle1">
                                    {expense.userName} - ${expense.amount}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={expense.status}
                                    color={expense.status === 'approved' ? 'success' : 'error'}
                                    sx={{ height: '24px' }}
                                  />
                                </Stack>
                                <Typography variant="body2" color="textSecondary">
                                  {expense.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {expense.status} on {expense.lastUpdatedAt ? format(expense.lastUpdatedAt, 'MMM d, yyyy') : 'Unknown date'}
                                </Typography>
                              </Stack>
                            </Card>
                          ))
                        )}
                      </Stack>
                    )}

                    {teamHistoryTab === 'leaves' && (
                      <Stack spacing={2}>
                        {historicalLeaves.length === 0 ? (
                          <Typography color="text.secondary" align="center" py={4}>
                            No processed leave requests found
                          </Typography>
                        ) : (
                          historicalLeaves.map((leave) => (
                            <Card key={leave.id} variant="outlined" sx={{ p: 2 }}>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle1">
                                    {leave.employeeName} - {leave.type}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={leave.status}
                                    color={leave.status === 'approved' ? 'success' : 'error'}
                                    sx={{ height: '24px' }}
                                  />
                                </Stack>
                                <Typography variant="body2">
                                  {leave.startDate ? format(leave.startDate, 'MMM d') : 'Unknown'} - {leave.endDate ? format(leave.endDate, 'MMM d, yyyy') : 'Unknown'}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {leave.reason}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {leave.status} on {leave.lastUpdatedAt ? format(leave.lastUpdatedAt, 'MMM d, yyyy') : 'Unknown date'}
                                </Typography>
                              </Stack>
                            </Card>
                          ))
                        )}
                      </Stack>
                    )}
                  </Paper>
                </Box>
              )}
              {activeTab === 'timesheet' && <TimesheetContent />}

              {activeTab === 'documents' && (
                <>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<UploadIcon />}
                      onClick={() => setUploadOpen(true)}
                    >
                      Upload Document
                    </Button>
                  </Box>
                  {departmentDocs.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                      No department documents available
                    </Typography>
                  ) : (
                    <List>
                      {departmentDocs.map((doc) => (
                        <React.Fragment key={doc.id}>
                          <ListItem>
                            <ListItemIcon>
                              <DocumentIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary={doc.name}
                              secondary={
                                <>
                                  {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                                  {doc.size && ` · ${(doc.size / 1024 / 1024).toFixed(2)} MB`}
                                </>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                component="a"
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <DownloadIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </>
              )}
              {activeTab === 'projects' && (
                <Grid container spacing={3}>
                  {departmentProjects.map((project) => (
                    <Grid item xs={12} key={project.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{project.name}</Typography>
                          <Typography variant="body2">{project.description}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              {activeTab === 'hr' && (
                <Box>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <PeopleIcon color="primary" />
                            <Typography variant="h6">Recruitment</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Manage job postings, review applications, and schedule interviews.
                          </Typography>
                        </CardContent>
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate('/hr/recruitment')}
                            startIcon={<OpenInNewIcon />}
                          >
                            Access Recruitment
                          </Button>
                        </Box>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <LoginIcon color="primary" />
                            <Typography variant="h6">Attendance</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            View and manage attendance records, time-off requests, and work schedules.
                          </Typography>
                        </CardContent>
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate('/hr/attendance')}
                            startIcon={<OpenInNewIcon />}
                          >
                            Access Attendance
                          </Button>
                        </Box>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <AssessmentIcon color="primary" />
                            <Typography variant="h6">Employee Reports</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Access detailed reports and analytics about your department's performance.
                          </Typography>
                        </CardContent>
                        <Box sx={{ p: 2, pt: 0 }}>
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate('/hr/reports')}
                            startIcon={<OpenInNewIcon />}
                          >
                            View Reports
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
              {activeTab === 'projects' && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6} lg={4}>
                    <TimesheetManagerCard />
                  </Grid>
                  {departmentProjects.map((project) => (
                    <Grid item xs={12} key={project.id}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          },
                          p: 1,
                          borderRadius: 1
                        }}
                        onClick={() => navigate(`/projects/${project.id}`)}>
                        <ProjectsIcon color="primary" />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">{project.name}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {project.status}
                          </Typography>
                        </Box>
                        <Box>
                          <AvatarGroup max={3} sx={{ justifyContent: 'flex-end' }}>
                            {project.assignedEmployees?.map((empId: string) => {
                              const employee = departmentEmployees.find(emp => emp.id === empId);
                              return employee ? (
                                <Avatar key={employee.id} alt={employee.name}>
                                  {employee.name[0]}
                                </Avatar>
                              ) : null;
                            })}
                          </AvatarGroup>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1, bgcolor: 'background.default', borderRadius: 1, p: 0.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={project.progress || 0}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
              {activeTab === 'tasks' && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Department Tasks</Typography>
                    </Box>
                    {loading ? (
                      <LinearProgress />
                    ) : error ? (
                      <Typography color="error">{error}</Typography>
                    ) : (
                      <TaskView userId={user?.uid || ''} isDepartmentView={true} />
                    )}
                  </Paper>
                </Grid>
              )}
              {activeTab === 'payroll' && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Department Payroll</Typography>
                    </Box>
                    <PayrollCard />
                  </Paper>
                </Grid>
              )}
              {activeTab === 'performance' && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Performance Reviews</Typography>
                    </Box>
                    <PerformanceReview />
                  </Paper>
                </Grid>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Comment Dialog */}
      <Dialog
        open={commentDialog.open}
        onClose={() => setCommentDialog({ ...commentDialog, open: false })}
      >
        <DialogTitle>
          {commentDialog.action === 'approve' ? 'Approve' : 'Reject'} Leave Request
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a comment for your decision:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={commentDialog.comment}
            onChange={(e) => setCommentDialog({ ...commentDialog, comment: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog({ ...commentDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                await updateDoc(firestoreDoc(db, 'leaveRequests', commentDialog.requestId), {
                  status: commentDialog.action === 'approve' ? 'approved' : 'rejected',
                  approverNote: commentDialog.comment || `${commentDialog.action === 'approve' ? 'Approved' : 'Rejected'} by manager`,
                  approvedBy: user?.uid,
                  approvedAt: new Date(),
                  updatedAt: new Date()
                });
                setCommentDialog({ ...commentDialog, open: false });
              } catch (error) {
                console.error('Error updating request:', error);
              }
            }}
            color={commentDialog.action === 'approve' ? 'success' : 'error'}
          >
            {commentDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)}>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <input
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !department?.id) return;

              try {
                setUploading(true);
                const filePath = `departments/${department.id}/${file.name}`;
                
                const { error: uploadError } = await supabase.storage
                  .from('documents')
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                  });

                if (uploadError) throw uploadError;

                await fetchDocuments(); // Refresh the list
                setUploadOpen(false);
              } catch (error) {
                console.error('Error uploading file:', error);
              } finally {
                setUploading(false);
              }
            }}
            style={{ display: 'none' }}
            id="document-upload"
          />
          <label htmlFor="document-upload">
            <Button
              component="span"
              variant="outlined"
              startIcon={<UploadIcon />}
              disabled={uploading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showTaskDialog} onClose={() => setShowTaskDialog(false)}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={newTask.dueDate}
                onChange={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
              />
            </LocalizationProvider>
            <TextField
              select
              label="Priority"
              fullWidth
              value={newTask.priority}
              onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            <TextField
              select
              label="Assign To"
              fullWidth
              value={newTask.assigneeId}
              onChange={(e) => setNewTask(prev => ({ ...prev, assigneeId: e.target.value }))}
            >
              {departmentEmployees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">Add Task</Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Medical Certificate Preview</DialogTitle>
        <DialogContent sx={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {previewUrl && (
            isPdfPreview ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                style={{ width: '100%', height: '60vh', border: 'none' }}
                title="PDF Preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Medical Certificate"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewUrl(null)}>Close</Button>
          <Button onClick={() => window.open(previewUrl, '_blank')} startIcon={<OpenInNewIcon />}>
            Open in New Tab
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const fetchDepartmentTasks = async () => {
  if (!user?.uid || !department?.id) return;

  try {
    // Query for in-progress tasks
    const inProgressQuery = query(
      collection(db, 'tasks'),
      where('departmentId', '==', department.id),
      where('status', '!=', 'done'),
      orderBy('status'),
      orderBy('dueDate', 'asc')
    );

    // Query for completed tasks
    const completedQuery = query(
      collection(db, 'tasks'),
      where('departmentId', '==', department.id),
      where('status', '==', 'done'),
      orderBy('dueDate', 'desc')
    );

    // Set up listeners for both queries
    const unsubscribeInProgress = onSnapshot(inProgressQuery, (snapshot) => {
      Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
          
          // Get assignee details
          let assignedTo = 'Unassigned';
          if (data.assigneeId) {
            const assigneeDoc = await getDoc(doc(db, 'employees', data.assigneeId));
            if (assigneeDoc.exists()) {
              const assigneeData = assigneeDoc.data();
              assignedTo = assigneeData.firstName && assigneeData.lastName ? 
                `${assigneeData.firstName} ${assigneeData.lastName}` : 
                assigneeData.name || 'Unknown';
            }
          }

          // Get comments
          const commentsQuery = query(
            collection(db, `tasks/${doc.id}/comments`),
            orderBy('timestamp', 'desc')
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          const comments = commentsSnapshot.docs.map(commentDoc => {
            const commentData = commentDoc.data();
            return {
              text: commentData.text,
              progress: commentData.progress,
              timestamp: commentData.timestamp?.toDate(),
              userId: commentData.userId,
              userName: commentData.userName
            };
          });

          return {
            id: doc.id,
            ...data,
            dueDate,
            assignedTo,
            comments,
            completed: data.completed === true || data.status === 'done',
            latestComment: comments.length > 0 ? comments[0] : null
          };
        })
      ).then(inProgressTasks => {
        // Get completed tasks
        const unsubscribeCompleted = onSnapshot(completedQuery, (completedSnapshot) => {
          Promise.all(
            completedSnapshot.docs.map(async (doc) => {
              const data = doc.data();
              const dueDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
              
              // Get assignee details
              let assignedTo = 'Unassigned';
              if (data.assigneeId) {
                const employeeRef = doc(db, 'employees', data.assigneeId);
              const assigneeDoc = await getDoc(employeeRef);
                if (assigneeDoc.exists()) {
                  const assigneeData = assigneeDoc.data();
                  assignedTo = assigneeData.firstName && assigneeData.lastName ? 
                    `${assigneeData.firstName} ${assigneeData.lastName}` : 
                    assigneeData.name || 'Unknown';
                }
              }

              // Get comments
              const commentsQuery = query(
                collection(db, `tasks/${doc.id}/comments`),
                orderBy('timestamp', 'desc')
              );
              const commentsSnapshot = await getDocs(commentsQuery);
              const comments = commentsSnapshot.docs.map(commentDoc => {
                const commentData = commentDoc.data();
                return {
                  text: commentData.text,
                  progress: commentData.progress,
                  timestamp: commentData.timestamp?.toDate(),
                  userId: commentData.userId,
                  userName: commentData.userName
                };
              });

              return {
                id: doc.id,
                ...data,
                dueDate,
                assignedTo,
                comments,
                completed: true,
                latestComment: comments.length > 0 ? comments[0] : null
              };
            })
          ).then(completedTasks => {
            setDepartmentTasks([...inProgressTasks, ...completedTasks]);
          });
        });
      });
    });
  } catch (error) {
    console.error('Error fetching department tasks:', error);
  }

  return () => {
    unsubscribeInProgress();
    unsubscribeCompleted && unsubscribeCompleted();
  };
};