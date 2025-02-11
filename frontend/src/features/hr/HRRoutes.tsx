import React from 'react';
import { Route, Routes } from 'react-router-dom';
import HRDashboard from './components/HRDashboard';
import HRAttendancePage from './components/HRAttendancePage';
import HRPayrollPage from './components/HRPayrollPage';

const HRRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HRDashboard />} />
      <Route path="/attendance" element={<HRAttendancePage />} />
      <Route path="/payroll" element={<HRPayrollPage />} />
    </Routes>
  );
};

export default HRRoutes;
