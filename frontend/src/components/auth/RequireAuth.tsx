import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('RequireAuth check:', { 
    path: location.pathname,
    loading,
    hasUser: !!user,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  // Immediately redirect to login if we know there's no user
  if (!user && !loading) {
    console.log('No authenticated user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only show loading state if we're still checking auth and there might be a user
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
