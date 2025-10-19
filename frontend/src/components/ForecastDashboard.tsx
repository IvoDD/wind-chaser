import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Add as AddIcon
} from '@mui/icons-material';
import api from '../services/api';
import ForecastTable from './ForecastTable';
import { useSpots } from '../contexts/SpotsContext';
import EditSpotDialog from './EditSpotDialog';

interface WindForecast {
  datetime: string;
  windSpeed: number | null;
  windGusts: number | null;
  windDirection: string | null;
  temperature: number | null;
  cloudCover: any;
  precipitation: number | null;
  timestamp: string;
}

interface SpotForecast {
  id: string;
  name: string;
  location: string;
  windguruUrl: string;
  notificationCriteria: any;
  isActive: boolean;
  lastChecked: string;
  forecast: {
    spotId: string;
    spotName: string;
    url: string;
    forecasts: WindForecast[];
    scrapedAt: string;
    source: string;
  };
  status: 'success' | 'error';
  error?: string;
}

const ForecastDashboard: React.FC<{ onNavigateToSpots?: () => void }> = ({ 
  onNavigateToSpots = () => {} 
}) => {
  const [spots, setSpots] = useState<SpotForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSpots, setRefreshingSpots] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [spotToDelete, setSpotToDelete] = useState<SpotForecast | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [spotToEdit, setSpotToEdit] = useState<SpotForecast | null>(null);
  const [deletingSpot, setDeletingSpot] = useState(false);

  const { deleteSpot, updateSpot, fetchSpots } = useSpots();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/forecasts/dashboard');
      setSpots(response.data.spots || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshSpotForecast = async (spotId: string) => {
    try {
      setRefreshingSpots(prev => new Set(prev).add(spotId));
      
      const response = await api.post(`/forecasts/refresh/${spotId}`);
      
      // Update the specific spot in the list
      setSpots(prevSpots => 
        prevSpots.map(spot => 
          spot.id === spotId 
            ? { ...spot, forecast: response.data.forecast, lastChecked: new Date().toISOString() }
            : spot
        )
      );
    } catch (error: any) {
      console.error('Error refreshing spot forecast:', error);
      // Show error for this specific spot
      setSpots(prevSpots => 
        prevSpots.map(spot => 
          spot.id === spotId 
            ? { ...spot, status: 'error', error: error.response?.data?.message || 'Refresh failed' }
            : spot
        )
      );
    } finally {
      setRefreshingSpots(prev => {
        const newSet = new Set(prev);
        newSet.delete(spotId);
        return newSet;
      });
    }
  };

  const handleEditSpot = (spot: SpotForecast) => {
    setSpotToEdit(spot);
    setEditDialogOpen(true);
  };

  const handleDeleteSpot = (spot: SpotForecast) => {
    setSpotToDelete(spot);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSpot = async () => {
    if (!spotToDelete) return;

    try {
      setDeletingSpot(true);
      await deleteSpot(spotToDelete.id);
      
      // Remove the spot from the dashboard list
      setSpots(prevSpots => prevSpots.filter(spot => spot.id !== spotToDelete.id));
      
      setDeleteDialogOpen(false);
      setSpotToDelete(null);
    } catch (error: any) {
      console.error('Error deleting spot:', error);
      // Could add a toast notification here for error feedback
    } finally {
      setDeletingSpot(false);
    }
  };

  const handleEditSpotSuccess = async () => {
    setEditDialogOpen(false);
    setSpotToEdit(null);
    
    // Refresh the dashboard data to get updated spot information
    await fetchDashboardData();
  };  const getWindConditionColor = (windSpeed: number | null): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!windSpeed) return 'default';
    if (windSpeed < 10) return 'info';
    if (windSpeed < 20) return 'success';
    if (windSpeed < 30) return 'warning';
    return 'error';
  };

  const formatLastChecked = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchDashboardData}>
          Retry
        </Button>
      </Box>
    );
  }

  if (spots.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Wind Spots Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Add your first wind spot to start tracking conditions!
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNavigateToSpots}
          size="large"
        >
          Add Wind Spot
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            Wind Forecast Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {spots.length} wind spot{spots.length !== 1 ? 's' : ''} • 
            {spots.filter(s => s.isActive).length} active • 
            {spots.filter(s => s.status === 'success').length} with forecasts
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
            sx={{ mr: 2 }}
          >
            Refresh All
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNavigateToSpots}
          >
            Manage Spots
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {spots.map((spot) => (
          <Box key={spot.id}>
            <Card>
              <CardContent>
                {/* Spot Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {spot.name}
                    </Typography>
                    {spot.location && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {spot.location}
                      </Typography>
                    )}
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <Chip
                        label={spot.isActive ? 'Active' : 'Inactive'}
                        color={spot.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      {spot.lastChecked && (
                        <Typography variant="caption" color="text.secondary">
                          Updated {formatLastChecked(spot.lastChecked)}
                        </Typography>
                      )}
                      {spot.status === 'error' && (
                        <Chip label="Error" color="error" size="small" />
                      )}
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box display="flex" gap={1}>
                    <Tooltip title="Refresh forecast">
                      <IconButton
                        onClick={() => refreshSpotForecast(spot.id)}
                        disabled={refreshingSpots.has(spot.id)}
                        size="small"
                      >
                        {refreshingSpots.has(spot.id) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RefreshIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open Windguru">
                      <IconButton
                        component={Link}
                        href={spot.windguruUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit spot">
                      <IconButton
                        onClick={() => handleEditSpot(spot)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete spot">
                      <IconButton
                        onClick={() => handleDeleteSpot(spot)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Current Conditions Summary */}
                {spot.status === 'success' && spot.forecast?.forecasts?.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Current Conditions
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      {spot.forecast.forecasts[0].windSpeed && (
                        <Chip
                          label={`${spot.forecast.forecasts[0].windSpeed} kt`}
                          color={getWindConditionColor(spot.forecast.forecasts[0].windSpeed)}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {spot.forecast.forecasts[0].windGusts && (
                        <Chip
                          label={`Gusts ${spot.forecast.forecasts[0].windGusts} kt`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {spot.forecast.forecasts[0].windDirection && (
                        <Chip
                          label={spot.forecast.forecasts[0].windDirection}
                          variant="outlined"
                          size="small"
                        />
                      )}
                      {spot.forecast.forecasts[0].temperature && (
                        <Chip
                          label={`${spot.forecast.forecasts[0].temperature}°C`}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {/* Forecast Table */}
                {spot.status === 'success' && spot.forecast?.forecasts?.length > 0 ? (
                  <ForecastTable 
                    forecasts={spot.forecast.forecasts}
                    spotName={spot.forecast.spotName}
                  />
                ) : spot.status === 'error' ? (
                  <Alert severity="error">
                    {spot.error || 'Failed to load forecast data'}
                  </Alert>
                ) : (
                  <Alert severity="info">
                    No forecast data available
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Wind Spot
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{spotToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deletingSpot}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteSpot}
            color="error"
            variant="contained"
            disabled={deletingSpot}
            startIcon={deletingSpot ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deletingSpot ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Spot Dialog */}
      {spotToEdit && (
        <EditSpotDialog
          open={editDialogOpen}
          onClose={handleEditSpotSuccess}
          spot={{
            _id: spotToEdit.id,
            userId: '', // This will be handled by the backend
            name: spotToEdit.name,
            location: spotToEdit.location,
            windguruUrl: spotToEdit.windguruUrl,
            description: '',
            notificationCriteria: spotToEdit.notificationCriteria,
            isActive: spotToEdit.isActive,
            lastChecked: spotToEdit.lastChecked,
            createdAt: '',
            updatedAt: ''
          }}
        />
      )}
    </Box>
  );
};

export default ForecastDashboard;
