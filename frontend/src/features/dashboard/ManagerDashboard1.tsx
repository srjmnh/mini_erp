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
} from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Assignment as ProjectsIcon,
  CalendarMonth as CalendarIcon,
  Description as DocumentIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useManagerData } from '@/hooks/useManagerData';
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc, updateDoc, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { useSupabase } from '@/contexts/SupabaseContext';
import { supabase } from '@/config/supabase';
import ManagerExpensePanel from '../expenses/ManagerExpensePanel';
import ManagerExpenseCard from './components/ManagerExpenseCard';
import { LeaveRequestsManager } from '../hr/components/LeaveRequestsManager';
import ExpenseApprovals from '../expenses/ExpenseApprovals';

export default function ManagerDashboard() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('leave');
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

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
                      <Typography variant="body2" color="text.secondary">
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
        <Grid item xs={12} md={6}>
          <ManagerExpenseCard />
        </Grid>
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
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                pt: 1
              }}
            >
              <Tab label="Leave Requests" value="leave" />
              <Tab label="Expense Approvals" value="expenses" />
              <Tab label="History" value="history" />
              <Tab label="Projects" value="projects" />
              <Tab label="Documents" value="documents" />
            </Tabs>
            <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
              {activeTab === 'leave' && (
                <LeaveRequestsManager />
              )}
              {activeTab === 'expenses' && (
                <ExpenseApprovals />
              )}
              {activeTab === 'history' && (
                <Box sx={{ py: 3 }}>
                  {/* History tab content */}
                  <Typography>History content coming soon</Typography>
                </Box>
              )}
              {activeTab === 'projects' && (
                <Box sx={{ py: 3 }}>
                  {/* Projects tab content */}
                  <Typography>Projects content coming soon</Typography>
                </Box>
              )}
              {activeTab === 'documents' && (
                <Box sx={{ py: 3 }}>
                  {/* Documents tab content */}
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
                </Box>
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
    </Box>
  );
}
