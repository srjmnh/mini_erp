import { Routes, Route } from 'react-router-dom';
import EmployeeTimesheetPage from './pages/EmployeeTimesheetPage';
import ManagerTimesheetPage from './pages/ManagerTimesheetPage';
import { useAuth } from '@/contexts/AuthContext';

const TimesheetRoutes = () => {
  const { userRole } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={userRole === 'manager' ? <ManagerTimesheetPage /> : <EmployeeTimesheetPage />} 
      />
    </Routes>
  );
};

export default TimesheetRoutes;
