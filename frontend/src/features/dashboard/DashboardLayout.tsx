import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from '@/components/layout/Header';
import ChatBot from '@/components/chat/ChatBot';
import { FloatingChat } from '@/components/chat/FloatingChat';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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
        {children || <Outlet />}
      </Box>
      <ChatBot />
      <FloatingChat />
    </Box>
  );
}
