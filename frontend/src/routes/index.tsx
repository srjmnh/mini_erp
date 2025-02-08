import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import DashboardLayout from '@/features/dashboard/DashboardLayout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import EmployeesPage from '@/features/employees/EmployeesPage';
import DepartmentsPage from '@/features/departments/DepartmentsPage';
import DocumentsPage from '@/features/documents/DocumentsPage';
import LeavesPage from '@/features/leaves/LeavesPage';
import SettingsPage from '@/features/settings/SettingsPage';
import LoginPage from '@/features/auth/LoginPage';
import { useAuth } from '@/contexts/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Root redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Dashboard with its own layout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </PrivateRoute>
        }
      />

      {/* Other pages with sidebar layout */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="employees/*" element={<EmployeesPage />} />
        <Route path="departments/*" element={<DepartmentsPage />} />
        <Route path="documents/*" element={<DocumentsPage />} />
        <Route path="leaves/*" element={<LeavesPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
