import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import LoginPage from './features/auth/LoginPage';
import RequireAuth from './components/auth/RequireAuth';
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
import RequestsPage from './features/requests/RequestsPage';
import PayrollPage from './features/payroll/PayrollPage';
import RoleConfigurationPage from './features/roles/RoleConfigurationPage';
import PerformancePage from './features/hr/PerformancePage';
import { TimeOff } from './features/hr/pages/TimeOff';
import ExpensePage from './features/expenses/ExpensePage';
import HRRoutes from './features/hr/HRRoutes';
import ClientRoutes from './features/clients/ClientRoutes';
import TimesheetRoutes from './features/timesheet/TimesheetRoutes';
import { PayrollGenerator } from './features/payroll/components/PayrollGenerator';
import SettingsPage from './features/settings/SettingsPage';
import CalendarPage from './features/calendar/CalendarPage';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { SnackbarProvider } from 'notistack';
import { ChatProvider } from './contexts/ChatContext';
import NotificationManager from './components/chat/NotificationManager';
import { useAuth } from '@/contexts/AuthContext';

import theme from './theme';
import StreamChatPopover from '@/components/chat/StreamChatPopover';
import ProtectedRoute from './components/auth/ProtectedRoute';

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
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <AuthProvider>
              <SupabaseProvider>
                <FirestoreProvider>
                  <ProjectProvider>
                    <ChatProvider>
                      <Router>
                        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                          <DashboardLayout>
                            <Routes>
                              {/* Public route - always accessible */}
                              <Route path="/login" element={<LoginPage />} />

                              {/* Protected routes */}
                              <Route
                                path="/*"
                                element={
                                  <RequireAuth>
                                    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                                      <Routes>
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="dashboard" element={<DashboardPage />} />
                                        <Route path="projects" element={<ProjectsPage />} />
                                        <Route path="projects/:id" element={<ProjectDashboard />} />
                                        <Route path="employees" element={<EmployeesPage />} />
                                        <Route path="employees/:id" element={<EmployeeProfile />} />
                                        <Route path="departments" element={<DepartmentsPage />} />
                                        <Route path="departments/:id" element={<DepartmentDetailsPage />} />
                                        <Route path="documents" element={<DocumentsPage />} />
                                        <Route path="calendar" element={<CalendarPage />} />
                                        <Route path="requests" element={<RequestsPage />} />
                                        <Route path="hr/*" element={<HRRoutes />} />
                                        <Route path="clients/*" element={<ClientRoutes />} />
                                        <Route path="timesheet/*" element={<TimesheetRoutes />} />
                                        <Route path="settings" element={<SettingsPage />} />
                                        <Route path="expenses" element={<ExpensePage />} />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                      </Routes>

                                      {/* Floating buttons container */}
                                      <Box
                                        sx={{
                                          position: 'fixed',
                                          bottom: 16,
                                          right: 16,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 2,
                                          zIndex: 1300,
                                        }}
                                      >
                                        <StreamChatPopover />
                                        <NotificationManager />
                                      </Box>
                                    </Box>
                                  </RequireAuth>
                                }
                              />
                            </Routes>
                          </DashboardLayout>
                        </Box>
                      </Router>
                    </ChatProvider>
                  </ProjectProvider>
                </FirestoreProvider>
              </SupabaseProvider>
            </AuthProvider>
          </SnackbarProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
