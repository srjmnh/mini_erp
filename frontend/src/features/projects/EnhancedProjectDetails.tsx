import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AttachFile as AttachFileIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useProject } from '../../contexts/ProjectContext';
import { useProjectManagement } from '../../contexts/ProjectManagementContext';
import { useAuth } from '../../contexts/AuthContext';

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

export default function EnhancedProjectDetails() {
  const { project } = useProject();
  const { user } = useAuth();
  const {
    addComment,
    startTimeTracking,
    stopTimeTracking,
    uploadAttachment,
    addMilestone,
    addRisk,
    scheduleMeeting,
  } = useProjectManagement();

  const [activeTab, setActiveTab] = useState(0);
  const [isTimeTracking, setIsTimeTracking] = useState(false);
  const [currentTimeLogId, setCurrentTimeLogId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'comment' | 'milestone' | 'risk' | 'meeting'>('comment');
  const [dialogData, setDialogData] = useState({});

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTimeTrackingToggle = async (taskId: string) => {
    if (!isTimeTracking) {
      const timeLogId = await startTimeTracking(taskId);
      setCurrentTimeLogId(timeLogId);
      setIsTimeTracking(true);
    } else if (currentTimeLogId) {
      await stopTimeTracking(currentTimeLogId);
      setCurrentTimeLogId(null);
      setIsTimeTracking(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, taskId?: string) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAttachment(file, taskId, taskId ? undefined : project.id);
    }
  };

  const handleDialogOpen = (type: 'comment' | 'milestone' | 'risk' | 'meeting') => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setDialogData({});
  };

  const handleDialogSubmit = async () => {
    try {
      switch (dialogType) {
        case 'comment':
          await addComment(project.id, dialogData.content);
          break;
        case 'milestone':
          await addMilestone(project.id, dialogData.title, dialogData.dueDate, dialogData.description);
          break;
        case 'risk':
          await addRisk(project.id, dialogData);
          break;
        case 'meeting':
          await scheduleMeeting(project.id, dialogData);
          break;
      }
      handleDialogClose();
    } catch (error) {
      console.error('Error submitting dialog:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          {project.name}
        </Typography>
        <Typography color="text.secondary" paragraph>
          {project.description}
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Tasks" />
          <Tab label="Timeline" />
          <Tab label="Files" />
          <Tab label="Meetings" />
          <Tab label="Risks" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Progress
              </Typography>
              {/* Add progress visualization */}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Budget
              </Typography>
              {/* Add budget visualization */}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <List>
          {project.tasks.map((task) => (
            <ListItem key={task.id}>
              <ListItemText
                primary={task.title}
                secondary={task.description}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleTimeTrackingToggle(task.id)}
                >
                  {isTimeTracking && currentTimeLogId ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton edge="end">
                  <AttachFileIcon />
                  <input
                    type="file"
                    hidden
                    onChange={(e) => handleFileUpload(e, task.id)}
                  />
                </IconButton>
                <IconButton edge="end" onClick={() => handleDialogOpen('comment')}>
                  <CommentIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Timeline>
          {project.milestones.map((milestone) => (
            <TimelineItem key={milestone.id}>
              <TimelineSeparator>
                <TimelineDot />
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="h6">{milestone.title}</Typography>
                <Typography>{milestone.description}</Typography>
                <Typography variant="caption">Due: {new Date(milestone.dueDate).toLocaleDateString()}</Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleDialogOpen('milestone')}
        >
          Add Milestone
        </Button>
      </TabPanel>

      {/* Add other tab panels */}

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>
          {dialogType === 'comment' && 'Add Comment'}
          {dialogType === 'milestone' && 'Add Milestone'}
          {dialogType === 'risk' && 'Add Risk'}
          {dialogType === 'meeting' && 'Schedule Meeting'}
        </DialogTitle>
        <DialogContent>
          {/* Add appropriate form fields based on dialogType */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleDialogSubmit} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
