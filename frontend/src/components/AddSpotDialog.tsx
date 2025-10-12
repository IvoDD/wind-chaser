import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as TestIcon,
} from '@mui/icons-material';
import { useSpots } from '../contexts/SpotsContext';
import { CreateSpotData } from '../contexts/SpotsContext';

interface AddSpotDialogProps {
  open: boolean;
  onClose: () => void;
}

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const AddSpotDialog: React.FC<AddSpotDialogProps> = ({ open, onClose }) => {
  const { createSpot, testWindguruUrl, loading } = useSpots();
  
  const [formData, setFormData] = useState<CreateSpotData>({
    name: '',
    location: '',
    windguruUrl: '',
    description: '',
    notificationCriteria: {
      minWindSpeed: 10,
      maxWindSpeed: 50,
      preferredDirections: [],
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // All days by default
      timeRange: {
        start: '06:00',
        end: '20:00',
      },
    },
  });

  const [urlTesting, setUrlTesting] = useState(false);
  const [urlTestResult, setUrlTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CreateSpotData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCriteriaChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      notificationCriteria: {
        ...prev.notificationCriteria,
        [field]: value,
      },
    }));
  };

  const handleDirectionChange = (event: any) => {
    const value = event.target.value;
    handleCriteriaChange('preferredDirections', typeof value === 'string' ? value.split(',') : value);
  };

  const handleDayChange = (day: number) => {
    const currentDays = formData.notificationCriteria.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    handleCriteriaChange('daysOfWeek', newDays);
  };

  const handleTimeChange = (timeField: 'start' | 'end') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleCriteriaChange('timeRange', {
      ...formData.notificationCriteria.timeRange,
      [timeField]: event.target.value,
    });
  };

  const testUrl = async () => {
    if (!formData.windguruUrl) {
      setUrlTestResult({ success: false, message: 'Please enter a Windguru URL first' });
      return;
    }

    setUrlTesting(true);
    setUrlTestResult(null);

    try {
      const isAccessible = await testWindguruUrl(formData.windguruUrl);
      setUrlTestResult({
        success: isAccessible,
        message: isAccessible ? 'URL is accessible and valid!' : 'URL is not accessible or invalid',
      });
    } catch (error) {
      setUrlTestResult({
        success: false,
        message: 'Failed to test URL. Please check the URL format.',
      });
    } finally {
      setUrlTesting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      await createSpot(formData);
      
      // Reset form and close dialog
      setFormData({
        name: '',
        location: '',
        windguruUrl: '',
        description: '',
        notificationCriteria: {
          minWindSpeed: 10,
          maxWindSpeed: 50,
          preferredDirections: [],
          daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
          timeRange: {
            start: '06:00',
            end: '20:00',
          },
        },
      });
      setUrlTestResult(null);
      onClose();
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to create spot');
    }
  };

  const handleClose = () => {
    setUrlTestResult(null);
    setSubmitError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Wind Spot</DialogTitle>
      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Box sx={{ pt: 1 }}>
          {/* Basic Information */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Basic Information
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Spot Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              placeholder="e.g., Tarifa - Los Lances"
            />
            
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={handleInputChange('location')}
              placeholder="e.g., Tarifa, Spain"
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Windguru URL"
                value={formData.windguruUrl}
                onChange={handleInputChange('windguruUrl')}
                required
                placeholder="https://www.windguru.cz/12345"
                error={urlTestResult?.success === false}
                helperText={urlTestResult?.message || 'Enter the Windguru forecast URL for this spot'}
              />
              <Button
                variant="outlined"
                onClick={testUrl}
                disabled={urlTesting || !formData.windguruUrl}
                startIcon={urlTesting ? <CircularProgress size={16} /> : <TestIcon />}
                sx={{ minWidth: 120 }}
              >
                {urlTesting ? 'Testing...' : 'Test URL'}
              </Button>
            </Box>
            
            {urlTestResult?.success && (
              <Alert severity="success" sx={{ mt: 1 }}>
                {urlTestResult.message}
              </Alert>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Optional description of the spot..."
            />
          </Box>

          {/* Notification Criteria */}
          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Notification Criteria</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Wind Speed Range */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Min Wind Speed (knots)"
                    value={formData.notificationCriteria.minWindSpeed}
                    onChange={(e) => handleCriteriaChange('minWindSpeed', Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Wind Speed (knots)"
                    value={formData.notificationCriteria.maxWindSpeed}
                    onChange={(e) => handleCriteriaChange('maxWindSpeed', Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Box>

                {/* Wind Directions */}
                <FormControl fullWidth>
                  <InputLabel>Preferred Wind Directions</InputLabel>
                  <Select
                    multiple
                    value={formData.notificationCriteria.preferredDirections || []}
                    onChange={handleDirectionChange}
                    input={<OutlinedInput label="Preferred Wind Directions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {WIND_DIRECTIONS.map((direction) => (
                      <MenuItem key={direction} value={direction}>
                        {direction}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Days of Week */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Days of Week
                  </Typography>
                  <FormGroup row>
                    {DAYS_OF_WEEK.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={(formData.notificationCriteria.daysOfWeek || []).includes(day.value)}
                            onChange={() => handleDayChange(day.value)}
                          />
                        }
                        label={day.label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Time Range */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    type="time"
                    label="Start Time"
                    value={formData.notificationCriteria.timeRange?.start}
                    onChange={handleTimeChange('start')}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    type="time"
                    label="End Time"
                    value={formData.notificationCriteria.timeRange?.end}
                    onChange={handleTimeChange('end')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.name || !formData.windguruUrl}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Creating...' : 'Create Spot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSpotDialog;
