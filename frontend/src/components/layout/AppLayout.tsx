import { useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  AccessTime as TimeOffIcon,
  Assessment as PerformanceIcon,
  Receipt as ExpenseIcon,
} from '@mui/icons-material';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';

const DRAWER_WIDTH = 280;

export default function AppLayout() {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNavigationItems = useCallback(() => {
    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    ];

    if (user?.role === 'hr' || user?.role === 'admin') {
      items.push(
        { text: 'Employees', icon: <PeopleIcon />, path: '/employees' },
        { text: 'Time Off', icon: <TimeOffIcon />, path: '/time-off' },
        { text: 'Performance', icon: <PerformanceIcon />, path: '/performance' },
        { text: 'Expenses', icon: <ExpenseIcon />, path: '/expenses' }
      );
    }

    items.push(
      { text: 'Calendar', icon: <EventIcon />, path: '/calendar' },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
    );

    return items;
  }, [user]);

  const drawer = (
    <Box>
      <List component="nav" sx={{ px: 2, py: 2 }}>
        {getNavigationItems().map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
              onClick={() => setMobileOpen(false)}
              sx={{
                minHeight: 48,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiListItemText-primary': {
                    color: 'primary.main',
                    fontWeight: 500,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header 
        onDrawerToggle={() => setMobileOpen(!mobileOpen)} 
        showDrawerToggle={true}
        user={user}
        handleLogout={handleLogout}
      />

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            mt: '64px', // Height of header
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            mt: '64px', // Height of header
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px', // Height of header
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
