import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TimeOffPage } from '../components/TimeOffPage';
import { LeaveRequestsManager } from '../components/LeaveRequestsManager';
import { HRTimeOffPage } from '../components/HRTimeOffPage';

export const TimeOff: React.FC = () => {
  const { userRole } = useAuth();

  if (userRole === 'HR0' || userRole === 'hr') {
    return <HRTimeOffPage />;
  }

  if (userRole === 'manager') {
    return <LeaveRequestsManager />;
  }

  return <TimeOffPage />;
};
