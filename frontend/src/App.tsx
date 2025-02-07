import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DashboardLayout from './features/dashboard/DashboardLayout';
import DashboardPage from './features/dashboard/DashboardPage';
import { ProjectsPage, ProjectDashboard } from './features/projects';
import EmployeesPage from './features/employees/EmployeesPage';
import EmployeeProfile from './features/employees/EmployeeProfile';
import DepartmentsPage from './features/departments/DepartmentsPage';
import DepartmentDetailsPage from './features/departments/DepartmentDetailsPage';
import DocumentsPage from './features/documents/DocumentsPage';
import LeaveRequestsPage from './features/leave/LeaveRequestsPage';
import PayrollPage from './features/payroll/PayrollPage';
import RoleConfigurationPage from './features/roles/RoleConfigurationPage';
import PerformancePage from './features/hr/PerformancePage';
import TimeOffPage from './features/hr/TimeOffPage';
import HRDashboard from './features/hr/HRDashboard';
import SettingsPage from './features/settings/SettingsPage';
import CalendarPage from './features/calendar/CalendarPage';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ChatProvider } from './contexts/ChatContext';
import theme from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <QueryClientProvider client={queryClient}>
          <SnackbarProvider>
            <AuthProvider>
              <SupabaseProvider>
                <FirestoreProvider>
                  <ProjectProvider>
                    <ChatProvider>
                      <CssBaseline />
                      <Router>
                        <Routes>
                          <Route path="/" element={<DashboardLayout />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="projects" element={<ProjectsPage />} />
                            <Route path="projects/:id" element={<ProjectDashboard />} />
                            <Route path="employees" element={<EmployeesPage />} />
                            <Route path="employees/:id" element={<EmployeeProfile />} />
                            <Route path="departments" element={<DepartmentsPage />} />
                            <Route path="departments/:id" element={<DepartmentDetailsPage />} />
                            <Route path="documents" element={<DocumentsPage />} />
                            <Route path="calendar" element={<CalendarPage />} />
                            <Route path="hr" element={<Outlet />}>
                              <Route index element={<HRDashboard />} />
                              <Route path="time-off" element={<TimeOffPage />} />
                              <Route path="leave-requests" element={<LeaveRequestsPage />} />
                              <Route path="payroll" element={<PayrollPage />} />
                              <Route path="performance" element={<PerformancePage />} />
                              <Route path="roles" element={<RoleConfigurationPage />} />
                            </Route>
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Route>
                        </Routes>
                      </Router>
                    </ChatProvider>
                  </ProjectProvider>
                </FirestoreProvider>
              </SupabaseProvider>
            </AuthProvider>
          </SnackbarProvider>
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
