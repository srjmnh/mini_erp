import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';

interface Props {
  userId: string;
}

interface Stats {
  totalEvents: number;
  upcomingEvents: number;
  totalMeetings: number;
  upcomingMeetings: number;
  completedTasks: number;
  pendingTasks: number;
  eventsByType: {
    event: number;
    meeting: number;
    deadline: number;
  };
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

export const CalendarStats: React.FC<Props> = ({ userId }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load events
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('userId', '==', userId));
      const eventsSnap = await getDocs(eventsQuery);
      
      const now = new Date();
      const events = eventsSnap.docs.map(doc => ({
        ...doc.data(),
        start: doc.data().start.toDate()
      }));

      // Load tasks
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('userId', '==', userId));
      const tasksSnap = await getDocs(tasksQuery);
      
      const tasks = tasksSnap.docs.map(doc => doc.data());

      // Load meetings
      const meetingsRef = collection(db, 'meetings');
      const meetingsQuery = query(meetingsRef, where('userId', '==', userId));
      const meetingsSnap = await getDocs(meetingsQuery);
      
      const meetings = meetingsSnap.docs.map(doc => ({
        ...doc.data(),
        startTime: doc.data().startTime.toDate()
      }));

      // Calculate stats
      const calculatedStats: Stats = {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => e.start > now).length,
        totalMeetings: meetings.length,
        upcomingMeetings: meetings.filter(m => m.startTime > now).length,
        completedTasks: tasks.filter(t => t.completed).length,
        pendingTasks: tasks.filter(t => !t.completed).length,
        eventsByType: {
          event: events.filter(e => e.type === 'event').length,
          meeting: events.filter(e => e.type === 'meeting').length,
          deadline: events.filter(e => e.type === 'deadline').length
        },
        tasksByPriority: {
          low: tasks.filter(t => t.priority === 'low').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          high: tasks.filter(t => t.priority === 'high').length
        }
      };

      setStats(calculatedStats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Typography color="error">Failed to load statistics</Typography>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Events</Typography>
              <Typography variant="h4">{stats.totalEvents}</Typography>
              <Typography color="text.secondary">
                {stats.upcomingEvents} upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Meetings</Typography>
              <Typography variant="h4">{stats.totalMeetings}</Typography>
              <Typography color="text.secondary">
                {stats.upcomingMeetings} upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Tasks</Typography>
              <Typography variant="h4">{stats.completedTasks + stats.pendingTasks}</Typography>
              <Typography color="text.secondary">
                {stats.completedTasks} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Completion Rate</Typography>
              <Typography variant="h4">
                {Math.round((stats.completedTasks / (stats.completedTasks + stats.pendingTasks || 1)) * 100)}%
              </Typography>
              <Typography color="text.secondary">
                {stats.pendingTasks} tasks pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>Events by Type</Typography>
            <ResponsiveBar
              data={[
                {
                  type: 'Events',
                  value: stats.eventsByType.event,
                },
                {
                  type: 'Meetings',
                  value: stats.eventsByType.meeting,
                },
                {
                  type: 'Deadlines',
                  value: stats.eventsByType.deadline,
                }
              ]}
              keys={['value']}
              indexBy="type"
              margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
              padding={0.3}
              colors={{ scheme: 'nivo' }}
              borderRadius={4}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>Tasks by Priority</Typography>
            <ResponsivePie
              data={[
                {
                  id: 'High',
                  label: 'High',
                  value: stats.tasksByPriority.high,
                },
                {
                  id: 'Medium',
                  label: 'Medium',
                  value: stats.tasksByPriority.medium,
                },
                {
                  id: 'Low',
                  label: 'Low',
                  value: stats.tasksByPriority.low,
                }
              ]}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              colors={{ scheme: 'nivo' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
