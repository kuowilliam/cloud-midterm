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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { resetSystem } from '../../services/api';

function AppLayout({ children }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset the system? This will delete all data.')) {
      try {
        await resetSystem();
        alert('System reset successful');
        window.location.reload();
      } catch (error) {
        console.error('Error resetting system:', error);
        alert('Failed to reset system');
      }
    }
    handleMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Button
            color="inherit"
            onClick={handleMenuOpen}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Worker Admin
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem 
              onClick={() => {
                navigate('/');
                handleMenuClose();
              }}
              selected={location.pathname === '/'}
            >
              <ListItemIcon>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Dashboard</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => {
                navigate('/search');
                handleMenuClose();
              }}
              selected={location.pathname === '/search'}
            >
              <ListItemIcon>
                <SearchIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Search</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleReset}>
              <ListItemIcon>
                <RefreshIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Reset System</ListItemText>
            </MenuItem>
          </Menu>
          
          <Typography variant="h6" noWrap component="div" sx={{ marginLeft: 'auto' }}>
            RAG Image Search - Worker Administrator
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          display: 'flex',
          width: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default AppLayout;
