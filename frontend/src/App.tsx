import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SpotsProvider } from './contexts/SpotsContext';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/Dashboard';
import SpotsManagement from './components/SpotsManagement';
import { CircularProgress, Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Navigation component
const Navigation: React.FC<{ currentView: string; onViewChange: (view: string) => void }> = ({ currentView, onViewChange }) => {
  const { logout, user } = useAuth();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Wind Chaser
        </Typography>
        <Button 
          color="inherit" 
          onClick={() => onViewChange('dashboard')}
          sx={{ textDecoration: currentView === 'dashboard' ? 'underline' : 'none' }}
        >
          Dashboard
        </Button>
        <Button 
          color="inherit" 
          onClick={() => onViewChange('spots')}
          sx={{ textDecoration: currentView === 'spots' ? 'underline' : 'none' }}
        >
          My Spots
        </Button>
        <Typography variant="body2" sx={{ mx: 2 }}>
          Welcome, {user?.firstName}
        </Typography>
        <Button color="inherit" onClick={logout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

// Main app content component (inside AuthProvider)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = React.useState('dashboard');

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <SpotsProvider>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'spots' && <SpotsManagement />}
    </SpotsProvider>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <div className="App">
          <AppContent />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
