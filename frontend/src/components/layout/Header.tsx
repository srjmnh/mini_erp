import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { motion } from 'framer-motion';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';

interface HeaderProps {
  onDrawerToggle?: () => void;
  showDrawerToggle?: boolean;
}

export default function Header({ onDrawerToggle, showDrawerToggle = false }: HeaderProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showSnackbar('Successfully signed out', 'success');
      navigate('/login');
    } catch (error) {
      showSnackbar('Failed to sign out', 'error');
    }
  };

  // Generate breadcrumbs based on current path
  const pathnames = location.pathname.split('/').filter((x) => x);
  const breadcrumbNameMap: { [key: string]: string } = {
    dashboard: 'Dashboard',
    employees: 'Employees',
    departments: 'Departments',
    documents: 'Documents',
    settings: 'Settings',
  };

  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        {showDrawerToggle && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(-5deg)',
              }}
            >
              <DashboardIcon sx={{ fontSize: 20, color: 'white' }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              ModernHR
            </Typography>
          </Box>
        </motion.div>

        <Box sx={{ ml: 3, flex: 1 }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            <Button
              component={Link}
              to="/"
              startIcon={<HomeIcon />}
              color="inherit"
              size="small"
            >
              Home
            </Button>
            {pathnames.map((value, index) => {
              const last = index === pathnames.length - 1;
              const to = `/${pathnames.slice(0, index + 1).join('/')}`;

              return last ? (
                <Typography color="text.primary" key={to}>
                  {breadcrumbNameMap[value] || value}
                </Typography>
              ) : (
                <Button
                  component={Link}
                  to={to}
                  key={to}
                  color="inherit"
                  size="small"
                >
                  {breadcrumbNameMap[value] || value}
                </Button>
              );
            })}
          </Breadcrumbs>
        </Box>

        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
          <MiniCalendar />
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: 'primary.main',
              }}
            >
              {user?.email?.[0].toUpperCase()}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              mt: 1.5,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
        >
          <MenuItem onClick={() => navigate('/settings')}>
            <PersonIcon sx={{ mr: 2, fontSize: 20 }} /> Profile
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            <LogoutIcon sx={{ mr: 2, fontSize: 20 }} /> Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
