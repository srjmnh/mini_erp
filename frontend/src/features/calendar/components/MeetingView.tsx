import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetingLink?: string;
  userId: string;
}

interface Props {
  userId: string;
}

export const MeetingView: React.FC<Props> = ({ userId }) => {
  const { showSnackbar } = useSnackbar();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Partial<Meeting> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewMeeting, setIsNewMeeting] = useState(true);

  const loadMeetings = useCallback(async () => {
    try {
      const meetingsRef = collection(db, 'meetings');
      const meetingsQuery = query(meetingsRef, where('userId', '==', userId));
      const snapshot = await getDocs(meetingsQuery);
      
      const loadedMeetings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate()
      })) as Meeting[];
      
      setMeetings(loadedMeetings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    } catch (error) {
      console.error('Error loading meetings:', error);
      showSnackbar('Failed to load meetings', 'error');
    }
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleAddMeeting = () => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
    
    setSelectedMeeting({
      startTime,
      endTime,
      attendees: []
    });
    setIsNewMeeting(true);
    setIsDialogOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsNewMeeting(false);
    setIsDialogOpen(true);
  };

  const handleSaveMeeting = async () => {
    try {
      if (!selectedMeeting?.title || !selectedMeeting.startTime || !selectedMeeting.endTime) {
        showSnackbar('Please fill in all required fields', 'error');
        return;
      }

      const meetingData = {
        ...selectedMeeting,
        userId,
        updatedAt: new Date()
      };

      if (isNewMeeting) {
        await addDoc(collection(db, 'meetings'), meetingData);
      } else if (selectedMeeting.id) {
        await updateDoc(doc(db, 'meetings', selectedMeeting.id), meetingData);
      }

      await loadMeetings();
      setIsDialogOpen(false);
      showSnackbar('Meeting saved successfully', 'success');
    } catch (error) {
      console.error('Error saving meeting:', error);
      showSnackbar('Failed to save meeting', 'error');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      await loadMeetings();
      showSnackbar('Meeting deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      showSnackbar('Failed to delete meeting', 'error');
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Meetings</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleAddMeeting}
          >
            Schedule Meeting
          </Button>
        </Box>

        <Grid container spacing={2}>
          {meetings.map((meeting) => (
            <Grid item xs={12} md={6} key={meeting.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {meeting.title}
                    </Typography>
                    <Box>
                      <IconButton onClick={() => handleEditMeeting(meeting)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteMeeting(meeting.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    {meeting.startTime.toLocaleString()} - {meeting.endTime.toLocaleString()}
                  </Typography>
                  
                  {meeting.description && (
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      {meeting.description}
                    </Typography>
                  )}

                  {meeting.meetingLink && (
                    <Button
                      startIcon={<VideoCallIcon />}
                      variant="outlined"
                      size="small"
                      href={meeting.meetingLink}
                      target="_blank"
                      sx={{ mb: 1.5 }}
                    >
                      Join Meeting
                    </Button>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {meeting.attendees.map((attendee, index) => (
                      <Chip key={index} label={attendee} size="small" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewMeeting ? 'Schedule Meeting' : 'Edit Meeting'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Title"
              value={selectedMeeting?.title || ''}
              onChange={(e) => setSelectedMeeting(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={selectedMeeting?.description || ''}
              onChange={(e) => setSelectedMeeting(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />

            <DateTimePicker
              label="Start Time"
              value={selectedMeeting?.startTime || null}
              onChange={(date) => setSelectedMeeting(prev => ({ ...prev, startTime: date }))}
            />

            <DateTimePicker
              label="End Time"
              value={selectedMeeting?.endTime || null}
              onChange={(date) => setSelectedMeeting(prev => ({ ...prev, endTime: date }))}
            />

            <TextField
              label="Meeting Link"
              value={selectedMeeting?.meetingLink || ''}
              onChange={(e) => setSelectedMeeting(prev => ({ ...prev, meetingLink: e.target.value }))}
              fullWidth
            />

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={selectedMeeting?.attendees || []}
              onChange={(_, newValue) => setSelectedMeeting(prev => ({ ...prev, attendees: newValue }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Attendees"
                  placeholder="Add attendee email"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveMeeting} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
