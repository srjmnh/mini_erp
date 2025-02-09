import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as ProjectIcon,
  Assignment as TaskIcon,
  MoreVert as MoreIcon,
  AccessTime as TimeIcon,
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
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { TaskStatus } from '@/config/project-schema';
import { DatePicker } from '@mui/x-date-pickers';
import { useRequests } from '@/hooks/useRequests';

// Team Member Card
const TeamMemberCard = ({ member }) => (
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
          {member.firstName[0]}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="medium">
            {member.firstName} {member.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {member.position}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

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
              Due: {format(project.endDate instanceof Date ? project.endDate : new Date(project.endDate), 'MMM d, yyyy')}
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
  const [anchorEl, setAnchorEl] = useState(null);

  const statusColors = {
    todo: 'default',
    in_progress: 'primary',
    review: 'warning',
    done: 'success',
  };

  const nextStatus = {
    todo: 'in_progress',
    in_progress: 'review',
    review: 'done',
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
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Chip
              label={task.status.toUpperCase().replace('_', ' ')}
              color={statusColors[task.status]}
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
              Due: {format(task.dueDate.toDate(), 'MMM d')}
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
        {task.status !== 'done' && (
          <MenuItem
            onClick={() => {
              onStatusChange(task.id, nextStatus[task.status]);
              setAnchorEl(null);
            }}
          >
            Move to {nextStatus[task.status].replace('_', ' ').toUpperCase()}
          </MenuItem>
        )}
        <MenuItem onClick={() => window.location.href = `/tasks/${task.id}`}>
          View Details
        </MenuItem>
      </Menu>
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
  });
  const { user } = useAuth();
  const { userRole } = useAuth();
  const { submitLeaveRequest } = useRequests();
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Listen to leave requests
  useEffect(() => {
    if (!employeeData?.id) return;

    // Get user's own leave requests
    const userRequestsQuery = query(
      collection(db, 'leaveRequests'),
      where('employeeId', '==', employeeData.id),
      orderBy('createdAt', 'desc')
    );

    const userRequestsUnsubscribe = onSnapshot(userRequestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
      }));
      setLeaveRequests(requests);
    });

    // For HR, get all pending requests
    // For managers, get their department's requests
    let approvalsQuery;
    console.log('Debug - User Role:', userRole);
    console.log('Debug - Employee Data:', employeeData);
    console.log('Debug - Is Manager:', employeeData?.isManager);
    console.log('Debug - Department ID:', employeeData?.departmentId);

    if (userRole === 'HR0' || userRole === 'hr') {
      console.log('Debug - Setting HR query');
      approvalsQuery = query(
        collection(db, 'leaveRequests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    } else if (employeeData?.departmentId) {
      console.log('Debug - Setting manager query');
      approvalsQuery = query(
        collection(db, 'leaveRequests'),
        where('departmentId', '==', employeeData.departmentId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    }

    let approvalsUnsubscribe = () => {};
    if (approvalsQuery) {
      console.log('Debug - Setting up snapshot listener');
      approvalsUnsubscribe = onSnapshot(approvalsQuery, async (snapshot) => {
        console.log('Debug - Snapshot received:', snapshot.docs.length, 'documents');
        const requests = await Promise.all(snapshot.docs.map(async (doc) => {
          const data = doc.data();
          // Get employee details
          // Get employee details from Firestore
          const employeeRef = doc(db, 'users', data.employeeId);
          const employeeDoc = await getDoc(employeeRef);
          const employeeData = employeeDoc.exists() ? employeeDoc.data() : null;
          
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            employeeName: employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : 'Unknown',
            department: employeeData?.department || 'Unknown'
          };
        }));
        setPendingApprovals(requests);
      });
    }

    return () => {
      userRequestsUnsubscribe();
      approvalsUnsubscribe();
    };
  }, [employeeData?.id, userRole, employeeData?.isManager, employeeData?.departmentId]);

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
        // Get leave balance
        const balanceDoc = await getDoc(doc(db, 'leaveBalances', employee.id));
        if (balanceDoc.exists()) {
          setLeaveBalance(balanceDoc.data());
        } else {
          // Set default balance if none exists
          setLeaveBalance({
            casualLeaves: 25,
            sickLeaves: 999999, // Unlimited
            updatedAt: new Date()
          });
        }

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
  }, [user?.email]);

  const handleSubmit = async () => {
    try {
      if (!employeeData) {
        throw new Error('Employee data not found');
      }
      await submitLeaveRequest({
        ...leaveForm,
        employeeId: employeeData.id,
        status: 'pending',
      });
      setOpenDialog(false);
      // Reset form
      setLeaveForm({
        type: 'casual',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
      });
    } catch (error) {
      console.error('Failed to submit leave request:', error);
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
                    label={`Casual Leave: ${leaveBalance.casualLeaves} days`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Sick Leave: ${leaveBalance.sickLeaves === 999999 ? 'Unlimited' : `${leaveBalance.sickLeaves} days`}`}
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
                        {request.startDate && format(new Date(request.startDate), 'MMM d, yyyy')} - {request.endDate && format(new Date(request.endDate), 'MMM d, yyyy')}
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
                        {request.startDate && format(new Date(request.startDate), 'MMM d, yyyy')} - {request.endDate && format(new Date(request.endDate), 'MMM d, yyyy')}
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

export const EmployeeDashboard = () => {
  const { user, userRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        let departmentId: string | null = null;
        let employeeId: string | null = null;

        // For HR users, we'll show all departments
        if (userRole === 'HR0') {
          // Get all employees from all departments
          const employeesSnapshot = await getDocs(collection(db, 'employees'));
          setTeamMembers(
            employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          );
        } else {
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
          departmentId = employeeData.departmentId;
          employeeId = employeeSnapshot.docs[0].id;

          if (!departmentId) {
            console.error('Employee has no department assigned');
            setLoading(false);
            return;
          }

          // Get team members for the employee's department
          const teamQuery = query(
            collection(db, 'employees'),
            where('departmentId', '==', departmentId)
          );
          const teamSnapshot = await getDocs(teamQuery);
          setTeamMembers(
            teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          );
        }

        // Get projects
        let projectsSnapshot;
        if (userRole === 'HR0') {
          // HR can see all projects
          projectsSnapshot = await getDocs(collection(db, 'projects'));
        } else {
          // Regular employees see only their department's projects
          const projectsQuery = query(
            collection(db, 'projects'),
            where('departmentId', '==', departmentId)
          );
          projectsSnapshot = await getDocs(projectsQuery);
        }
        setProjects(
          projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );

        // Get assigned tasks
        const tasksPromises = projectsSnapshot.docs.map(async (projectDoc) => {
          const tasksQuery = query(
            collection(db, `projects/${projectDoc.id}/tasks`),
            where('assigneeId', '==', employeeId || user.uid)
          );
          const tasksSnapshot = await getDocs(tasksQuery);
          return tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            projectId: projectDoc.id,
            ...doc.data()
          }));
        });
        const allTasks = await Promise.all(tasksPromises);
        setTasks(allTasks.flat());
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Find the task and its project
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await updateDoc(doc(db, `projects/${task.projectId}/tasks`, taskId), {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  const tabs = [
    {
      label: 'Overview',
      content: (
        <Box sx={{ py: 3 }}>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                height: '100%',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                transition: 'all 0.3s'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <ProjectIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {activeProjects}
                      </Typography>
                      <Typography variant="subtitle2">
                        Active Projects
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                height: '100%',
                bgcolor: 'success.light',
                color: 'success.contrastText',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                transition: 'all 0.3s'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <TaskIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {completedTasks}
                      </Typography>
                      <Typography variant="subtitle2">
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
                bgcolor: 'warning.light',
                color: 'warning.contrastText',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                },
                transition: 'all 0.3s'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <TimeIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {pendingTasks}
                      </Typography>
                      <Typography variant="subtitle2">
                        Pending Tasks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Activity */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Latest Tasks
                    </Typography>
                    <List>
                      {tasks.slice(0, 3).map((task) => (
                        <ListItem key={task.id} disablePadding>
                          <ListItemButton>
                            <ListItemIcon>
                              <TaskIcon color={task.status === 'done' ? 'success' : 'action'} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={task.title}
                              secondary={`Due: ${format(task.dueDate.toDate(), 'MMM d')}`}
                            />
                            <Chip 
                              label={task.status.replace('_', ' ')} 
                              size="small"
                              color={task.status === 'done' ? 'success' : 'default'}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Active Projects
                    </Typography>
                    <List>
                      {projects.filter(p => p.status === 'active').slice(0, 3).map((project) => (
                        <ListItem key={project.id} disablePadding>
                          <ListItemButton>
                            <ListItemIcon>
                              <ProjectIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={project.name}
                              secondary={`Due: ${format(project.endDate instanceof Date ? project.endDate : new Date(project.endDate), 'MMM d, yyyy')}`}
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
                Projects
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
              {projects.map((project) => (
                <Grid item xs={12} md={6} key={project.id}>
                  <ProjectCard project={project} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Tasks Section */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Your Tasks
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                }}
              >
                View All Tasks
              </Button>
            </Box>
            <Grid container spacing={2}>
              {tasks.map((task) => (
                <Grid item xs={12} md={6} key={task.id}>
                  <TaskCard
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      )
    },
    {
      label: 'Team',
      content: (
        <Box sx={{ py: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Team Members
          </Typography>
          <Grid container spacing={2}>
            {teamMembers.map((member) => (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <TeamMemberCard member={member} />
              </Grid>
            ))}
          </Grid>
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
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', py: 3 }}>
        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="medium">
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
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
                fontSize: '1rem',
                fontWeight: 'medium',
                minWidth: 100,
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
      </Box>
    </Container>
  );
};
