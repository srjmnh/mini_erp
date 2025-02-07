import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('RequireAuth:', { user: user?.email, loading, pathname: location.pathname });

  // Wait for auth state to be determined
  if (loading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
