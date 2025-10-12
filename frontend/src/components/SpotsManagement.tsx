import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Fab,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  LocationOn as LocationIcon,
  Air as WindIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from '@mui/icons-material';
import { useSpots } from '../contexts/SpotsContext';
import { Spot } from '../contexts/SpotsContext';
import AddSpotDialog from './AddSpotDialog';
import EditSpotDialog from './EditSpotDialog';

const SpotsManagement: React.FC = () => {
  const {
    spots,
    loading,
    error,
    fetchSpots,
    deleteSpot,
    toggleSpotActive,
    clearError,
  } = useSpots();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const handleEditClick = (spot: Spot) => {
    setSelectedSpot(spot);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (spot: Spot) => {
    setSelectedSpot(spot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedSpot) {
      try {
        await deleteSpot(selectedSpot._id);
        setDeleteDialogOpen(false);
        setSelectedSpot(null);
      } catch (error) {
        console.error('Error deleting spot:', error);
      }
    }
  };

  const handleToggleActive = async (spot: Spot) => {
    try {
      await toggleSpotActive(spot._id);
    } catch (error) {
      console.error('Error toggling spot status:', error);
    }
  };

  const openWindguruUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const formatDirections = (directions: string[]) => {
    if (!directions || directions.length === 0) return 'Any';
    return directions.join(', ');
  };

  const formatDaysOfWeek = (days: number[]) => {
    if (!days || days.length === 0) return 'Any day';
    if (days.length === 7) return 'Every day';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  };

  const formatTimeRange = (timeRange?: { start: string; end: string }) => {
    if (!timeRange) return 'Any time';
    return `${timeRange.start} - ${timeRange.end}`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Wind Spots Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ mb: 2 }}
          >
            Add New Spot
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!loading && spots.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <WindIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No wind spots yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first wind spot to start tracking conditions and receiving notifications.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              Add Your First Spot
            </Button>
          </Box>
        )}

        {/* Spots Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 3 
        }}>
          {spots.map((spot) => (
            <Card key={spot._id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" noWrap>
                      {spot.name}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={spot.isActive}
                          onChange={() => handleToggleActive(spot)}
                          size="small"
                        />
                      }
                      label=""
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {spot.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {spot.location}
                      </Typography>
                    </Box>
                  )}

                  {spot.description && (
                    <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
                      {spot.description}
                    </Typography>
                  )}

                  {/* Notification Criteria */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notification Settings:
                    </Typography>
                    
                    {/* Wind Speed */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WindIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {spot.notificationCriteria.minWindSpeed || 0}
                        {spot.notificationCriteria.maxWindSpeed ? 
                          ` - ${spot.notificationCriteria.maxWindSpeed}` : '+'} knots
                      </Typography>
                    </Box>

                    {/* Directions */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Directions: {formatDirections(spot.notificationCriteria.preferredDirections || [])}
                    </Typography>

                    {/* Days */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDaysOfWeek(spot.notificationCriteria.daysOfWeek || [])}
                      </Typography>
                    </Box>

                    {/* Time Range */}
                    <Typography variant="body2" color="text.secondary">
                      Time: {formatTimeRange(spot.notificationCriteria.timeRange)}
                    </Typography>
                  </Box>

                  {/* Status Chip */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      icon={spot.isActive ? <NotificationsIcon /> : <NotificationsOffIcon />}
                      label={spot.isActive ? 'Active' : 'Inactive'}
                      color={spot.isActive ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Tooltip title="Open Windguru">
                      <IconButton
                        onClick={() => openWindguruUrl(spot.windguruUrl)}
                        size="small"
                        color="primary"
                      >
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit spot">
                      <IconButton
                        onClick={() => handleEditClick(spot)}
                        size="small"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete spot">
                      <IconButton
                        onClick={() => handleDeleteClick(spot)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            ))}
        </Box>

        {/* Floating Action Button */}
        {spots.length > 0 && (
          <Fab
            color="primary"
            aria-label="add spot"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setAddDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Add Spot Dialog */}
        <AddSpotDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
        />

        {/* Edit Spot Dialog */}
        <EditSpotDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          spot={selectedSpot}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Spot</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{selectedSpot?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SpotsManagement;
