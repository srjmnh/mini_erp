import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Grid } from '@mui/material';
import Header from '@/components/layout/Header';
import ChatBot from '@/components/chat/ChatBot';
import { FloatingChat } from '@/components/chat/FloatingChat';
import AttendanceCard from '@/components/attendance/AttendanceCard';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!user?.uid) return;
      
      const userRef = doc(db, 'employees', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        setUserDepartment(userDoc.data().department);
      }
    };

    fetchUserDepartment();
  }, [user?.uid]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // Height of the header
          bgcolor: 'background.default',
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} lg={3}>
            <AttendanceCard />
          </Grid>
          <Grid item xs={12}>
            {children || <Outlet />}
          </Grid>
        </Grid>
      </Box>
      <ChatBot />
      <FloatingChat />
    </Box>
  );
}
