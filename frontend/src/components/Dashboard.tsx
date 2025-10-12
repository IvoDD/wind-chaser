import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ApiTestComponent from './ApiTestComponent';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🌊 Wind Chaser - Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.firstName}!
          </Typography>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleLogout}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to Wind Chaser! 🏄‍♂️
          </Typography>
          <Typography variant="body1" paragraph>
            Your wind forecast notification system is ready. Here you'll be able to:
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', mt: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📍 Manage Spots
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add your favorite wind spots and set notification criteria
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🌬️ Live Forecasts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View real-time wind conditions for all your spots
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📧 Notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get email alerts when conditions match your preferences
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>

        {/* User Profile Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Your Profile
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography><strong>Name:</strong> {user?.fullName}</Typography>
            <Typography><strong>Email:</strong> {user?.email}</Typography>
            <Typography><strong>Member since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</Typography>
            <Typography><strong>Email verified:</strong> {user?.isEmailVerified ? '✅' : '❌'}</Typography>
            {user?.lastLogin && (
              <Typography><strong>Last login:</strong> {new Date(user.lastLogin).toLocaleString()}</Typography>
            )}
          </Box>
          <Button variant="outlined" sx={{ mt: 2 }}>
            Edit Profile
          </Button>
        </Paper>

        {/* API Test Component for development */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Development: API Testing
          </Typography>
          <ApiTestComponent />
        </Paper>
      </Container>
    </>
  );
};

export default Dashboard;
