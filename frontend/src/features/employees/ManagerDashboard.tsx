import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  IconButton,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  Assessment as AssessmentIcon,
  Work as WorkIcon,
  AccessTime as AccessTimeIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manager-tabpanel-${index}`}
      aria-labelledby={`manager-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `manager-tab-${index}`,
    'aria-controls': `manager-tabpanel-${index}`,
  };
}

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const DashboardCard = ({ title, description, icon, onClick }: { 
    title: string; 
    description: string; 
    icon: React.ReactNode;
    onClick: () => void;
  }) => (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={onClick}>Access</Button>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="manager dashboard tabs">
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Team Management" {...a11yProps(1)} />
          <Tab label="HR Access" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Typography variant="h5" gutterBottom>
          Welcome back, {user?.email}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Team Overview"
              description="View and manage your team members"
              icon={<PeopleIcon color="primary" />}
              onClick={() => navigate('/team')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Tasks"
              description="Manage team tasks and assignments"
              icon={<AssignmentIcon color="primary" />}
              onClick={() => navigate('/tasks')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Calendar"
              description="View team schedule and events"
              icon={<EventNoteIcon color="primary" />}
              onClick={() => navigate('/calendar')}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h5" gutterBottom>
          Team Management
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Performance Reviews"
              description="Conduct and view team performance reviews"
              icon={<AssessmentIcon color="primary" />}
              onClick={() => navigate('/performance')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Leave Management"
              description="Manage team leave requests"
              icon={<EventNoteIcon color="primary" />}
              onClick={() => navigate('/leave')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Work Assignments"
              description="Assign and track team work"
              icon={<AssignmentIcon color="primary" />}
              onClick={() => navigate('/assignments')}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography variant="h5" gutterBottom>
          HR Access
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Recruitment"
              description="Manage job postings, candidates, and interviews for your department"
              icon={<WorkIcon color="primary" />}
              onClick={() => navigate('/recruitment')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Attendance"
              description="View and manage team attendance records"
              icon={<AccessTimeIcon color="primary" />}
              onClick={() => navigate('/attendance')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Employee Reports"
              description="Access detailed reports about your team"
              icon={<DescriptionIcon color="primary" />}
              onClick={() => navigate('/reports')}
            />
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ManagerDashboard;
