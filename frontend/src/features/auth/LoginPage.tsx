import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseError } from 'firebase/app';

const icons = [BusinessIcon, PeopleIcon, DashboardIcon, AnalyticsIcon, SpeedIcon];

export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle, signInWithEmailAndPassword } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % icons.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirect to the page they came from, or dashboard if they came directly to login
  const { state } = useLocation() as { state: { from: { pathname: string } } | null };
  const from = state?.from?.pathname || '/dashboard';

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showSnackbar('Please enter both email and password', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(email, password);
      showSnackbar('Successfully signed in!', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            showSnackbar('Invalid email address', 'error');
            break;
          case 'auth/user-disabled':
            showSnackbar('This account has been disabled', 'error');
            break;
          case 'auth/user-not-found':
            showSnackbar('No account found with this email', 'error');
            break;
          case 'auth/wrong-password':
            showSnackbar('Incorrect password', 'error');
            break;
          default:
            showSnackbar('Failed to sign in', 'error');
        }
      } else {
        showSnackbar('An unexpected error occurred', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      showSnackbar('Successfully signed in with Google!', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/popup-closed-by-user':
            showSnackbar('Sign in cancelled', 'info');
            break;
          case 'auth/popup-blocked':
            showSnackbar('Please allow popups for this site', 'error');
            break;
          default:
            showSnackbar('Failed to sign in with Google', 'error');
        }
      } else {
        showSnackbar('An unexpected error occurred', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        background: (theme) => `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[100]} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              borderRadius: 2,
              boxShadow: (theme) => `0 8px 32px ${theme.palette.primary.main}15`,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box 
              sx={{ 
                textAlign: 'center', 
                mb: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: '24px',
                  background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  transform: 'rotate(-5deg)',
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIconIndex}
                    initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 15 }}
                    transition={{ 
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    {React.createElement(icons[currentIconIndex], {
                      sx: { fontSize: 44, color: 'white' }
                    })}
                  </motion.div>
                </AnimatePresence>
              </Box>

              <Box>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 800,
                      background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      letterSpacing: '-1px',
                      mb: 1
                    }}
                  >
                    ModernHR
                  </Typography>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '1.1rem',
                      maxWidth: 300,
                      mx: 'auto',
                      lineHeight: 1.5,
                      fontWeight: 500
                    }}
                  >
                    Your complete HR management solution
                  </Typography>
                </motion.div>
              </Box>
            </Box>

            <form onSubmit={handleEmailSignIn}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  Sign In
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 2 }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              Sign in with Google
            </Button>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}
