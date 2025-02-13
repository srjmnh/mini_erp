import { Routes, Route } from 'react-router-dom';
import RecruitmentPage from './components/RecruitmentPage';
import HRDashboard from './components/HRDashboard';
import HRAttendancePage from './components/HRAttendancePage';
import HRPayrollPage from './components/HRPayrollPage';
import RoleConfigurationPage from '../roles/RoleConfigurationPage';
import EmployeeReportPage from './pages/EmployeeReportPage';

const HRRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HRDashboard />} />
      <Route path="/attendance" element={<HRAttendancePage />} />
      <Route path="/payroll" element={<HRPayrollPage />} />
      <Route path="/roles" element={<RoleConfigurationPage />} />
      <Route path="/reports" element={<EmployeeReportPage />} />
      <Route path="/recruitment" element={<RecruitmentPage />} />
    </Routes>
  );
};

export default HRRoutes;
