// src/components/AppLayout.js

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import apiService from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AuthService from '../../services/AuthService';

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      fontSize: '2.125rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
  },
});

export default function AppLayout({ children }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleReset = async () => {
    handleMenuClose();
    if (!window.confirm('Are you sure you want to reset the system? This will delete all data.')) return;
    try {
      await apiService.resetSystem();
      alert('System reset successful');
      window.location.reload();
    } catch (err) {
      console.error('Error resetting system:', err);
      alert('Reset failed');
    }
  };

  const handleLoginLogout = () => {
    if (isAuthenticated) {
      AuthService.logout();
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
        <AppBar position="fixed" elevation={1}>
          <Toolbar sx={{ minHeight: 64 }}>
          <Button
            color="inherit"
            onClick={handleMenuOpen}
            endIcon={<KeyboardArrowDownIcon />}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: '1.1rem',
                mr: 2
              }}
          >
              Management Center
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                elevation: 8,
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  minWidth: 200,
                }
              }}
          >
            <MenuItem
              onClick={() => { navigate('/'); handleMenuClose(); }}
              selected={location.pathname === '/'}
                sx={{ py: 1.5, fontSize: '0.95rem' }}
            >
              <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => { navigate('/search'); handleMenuClose(); }}
              selected={location.pathname === '/search'}
                sx={{ py: 1.5, fontSize: '0.95rem' }}
            >
              <ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Image Search</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => { navigate('/pdf-search'); handleMenuClose(); }}
              selected={location.pathname === '/pdf-search'}
                sx={{ py: 1.5, fontSize: '0.95rem' }}
            >
              <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
                <ListItemText>PDF Search</ListItemText>
            </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleReset} sx={{ py: 1.5 }}>
              <ListItemIcon><RefreshIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Reset System</ListItemText>
            </MenuItem>
          </Menu>

            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '1.3rem'
              }}
            >
              RAG Image Search System
          </Typography>

          <Button
            color="inherit"
            onClick={handleLoginLogout}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: '1rem',
                px: 2
              }}
            startIcon={isAuthenticated ? <LogoutIcon /> : <LoginIcon />}
          >
              {isAuthenticated ? 'Logout' : 'Login'}
          </Button>
        </Toolbar>
      </AppBar>

        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            mt: '64px', 
            display: 'flex',
            minHeight: 'calc(100vh - 64px)',
            bgcolor: 'background.default'
          }}
        >
        {children}
      </Box>
    </Box>
    </ThemeProvider>
  );
}
