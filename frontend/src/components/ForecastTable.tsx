import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
  styled,
  useTheme
} from '@mui/material';
import {
  Air as WindIcon,
  Thermostat as TempIcon,
  Cloud as CloudIcon,
  WaterDrop as RainIcon
} from '@mui/icons-material';

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

interface ForecastTableProps {
  forecasts: WindForecast[];
  spotName: string;
  maxColumns?: number;
}

// Styled components for Windguru-like appearance
const StyledTable = styled(Table)(({ theme }) => ({
  minWidth: 650,
  '& .MuiTableCell-root': {
    padding: '4px 8px',
    textAlign: 'center',
    fontSize: '0.75rem',
    border: `1px solid ${theme.palette.divider}`,
    minWidth: '60px',
    whiteSpace: 'nowrap'
  }
}));

const StyledTableContainer = styled(Box)(({ theme }) => ({
  overflowX: 'auto',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  '&::-webkit-scrollbar': {
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: theme.palette.grey[100],
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.grey[400],
    borderRadius: '4px',
  }
}));

const TimeCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 'bold',
  position: 'sticky',
  left: 0,
  zIndex: 1,
  minWidth: '80px !important'
}));

const RowHeaderCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[50],
  fontWeight: 'bold',
  position: 'sticky',
  left: 0,
  zIndex: 1,
  textAlign: 'left',
  padding: '8px 12px',
  minWidth: '120px',
  '& > div': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
}));

// Wind speed color scale function
const getWindSpeedColor = (windSpeed: number | null): string => {
  if (windSpeed === null || windSpeed === 0) return '#ffffff'; // White for no wind
  
  if (windSpeed <= 10) {
    // 0-10 knots: White to light green
    const ratio = windSpeed / 10;
    return `rgb(${255 - Math.round(40 * ratio)}, 255, ${255 - Math.round(40 * ratio)})`;
  } else if (windSpeed <= 18) {
    // 10-18 knots: Light green to yellow
    const ratio = (windSpeed - 10) / 8;
    return `rgb(${215 + Math.round(40 * ratio)}, 255, ${215 - Math.round(215 * ratio)})`;
  } else if (windSpeed <= 25) {
    // 18-25 knots: Yellow to orange
    const ratio = (windSpeed - 18) / 7;
    return `rgb(255, ${255 - Math.round(100 * ratio)}, 0)`;
  } else if (windSpeed <= 30) {
    // 25-30 knots: Orange to red
    const ratio = (windSpeed - 25) / 5;
    return `rgb(255, ${155 - Math.round(155 * ratio)}, 0)`;
  } else if (windSpeed <= 50) {
    // 30-50 knots: Red to purple
    const ratio = (windSpeed - 30) / 20;
    return `rgb(${255 - Math.round(127 * ratio)}, 0, ${Math.round(128 * ratio)})`;
  } else {
    // 50+ knots: Deep purple
    return '#800080';
  }
};

const WindCell = styled(TableCell)<{ windspeed?: number }>(({ theme, windspeed }) => {
  const backgroundColor = getWindSpeedColor(windspeed || null);
  const color = windspeed && windspeed > 15 ? '#000000' : '#333333';
  const fontWeight = windspeed && windspeed > 20 ? 'bold' : 'normal';

  return {
    backgroundColor,
    color,
    fontWeight,
    transition: 'background-color 0.2s ease',
    '&:hover': {
      opacity: 0.8
    }
  };
});

const ForecastTable: React.FC<ForecastTableProps> = ({ 
  forecasts, 
  spotName, 
  maxColumns = 24 
}) => {
  const theme = useTheme();
  
  // Limit the number of columns to display initially
  const displayForecasts = forecasts.slice(0, maxColumns);

  const formatDateTime = (datetime: string): string => {
    // Handle Windguru format like "Su12.10h"
    if (datetime.includes('.') && datetime.includes('h')) {
      return datetime;
    }
    
    // Fallback for other formats
    try {
      const date = new Date(datetime);
      const day = date.toLocaleDateString('en', { weekday: 'short' });
      const dayNum = date.getDate();
      const hour = date.getHours();
      return `${day}${dayNum}.${hour}h`;
    } catch {
      return datetime;
    }
  };

  const formatWindDirection = (direction: string | null): string => {
    if (!direction) return '-';
    
    // If it's already in degrees format (e.g., "249°"), return as is
    if (direction.includes('°')) {
      const degrees = parseInt(direction);
      if (!isNaN(degrees)) {
        // Convert degrees to compass direction for display
        const compassDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return compassDirections[index];
      }
    }
    
    return direction;
  };

  const getCloudCoverDisplay = (cloudCover: any): string => {
    if (!cloudCover) return '-';
    
    if (typeof cloudCover === 'object') {
      // Extract individual cloud levels, ensuring they are reasonable percentages (0-100)
      const low = cloudCover.low && cloudCover.low <= 100 ? cloudCover.low : 0;
      const mid = cloudCover.mid && cloudCover.mid <= 100 ? cloudCover.mid : 0;
      const high = cloudCover.high && cloudCover.high <= 100 ? cloudCover.high : 0;
      
      // Calculate average of the three levels
      const validLevels = [low, mid, high].filter(level => level > 0);
      if (validLevels.length === 0) return '-';
      
      const average = validLevels.reduce((sum, level) => sum + level, 0) / validLevels.length;
      return `${Math.round(average)}%`;
    }
    
    return typeof cloudCover === 'number' ? `${cloudCover}%` : '-';
  };

  if (!forecasts || forecasts.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No forecast data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        Forecast Data ({forecasts.length} periods available)
      </Typography>
      
      <StyledTableContainer>
        <StyledTable size="small">
          <TableHead>
            <TableRow>
              <TimeCell>Time</TimeCell>
              {displayForecasts.map((forecast, index) => (
                <TableCell key={index} sx={{ 
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}>
                  {formatDateTime(forecast.datetime)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Wind Speed Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <WindIcon fontSize="small" />
                  Wind (kt)
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <WindCell 
                  key={index} 
                  windspeed={forecast.windSpeed || undefined}
                >
                  {forecast.windSpeed || '-'}
                </WindCell>
              ))}
            </TableRow>

            {/* Wind Gusts Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <WindIcon fontSize="small" sx={{ transform: 'scale(1.2)' }} />
                  Gusts (kt)
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <WindCell 
                  key={index}
                  windspeed={forecast.windGusts || undefined}
                >
                  {forecast.windGusts || '-'}
                </WindCell>
              ))}
            </TableRow>

            {/* Wind Direction Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    border: '1px solid currentColor',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem'
                  }}>
                    ↑
                  </Box>
                  Direction
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <TableCell key={index} sx={{ fontSize: '0.7rem' }}>
                  {formatWindDirection(forecast.windDirection)}
                </TableCell>
              ))}
            </TableRow>

            {/* Temperature Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <TempIcon fontSize="small" />
                  Temp (°C)
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <TableCell 
                  key={index}
                  sx={{ 
                    backgroundColor: forecast.temperature && forecast.temperature > 20 
                      ? theme.palette.warning.light 
                      : forecast.temperature && forecast.temperature < 10
                      ? theme.palette.info.light
                      : theme.palette.background.paper
                  }}
                >
                  {forecast.temperature || '-'}
                </TableCell>
              ))}
            </TableRow>

            {/* Cloud Cover Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <CloudIcon fontSize="small" />
                  Clouds (%)
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <TableCell key={index} sx={{ fontSize: '0.7rem' }}>
                  {getCloudCoverDisplay(forecast.cloudCover)}
                </TableCell>
              ))}
            </TableRow>

            {/* Precipitation Row */}
            <TableRow>
              <RowHeaderCell>
                <div>
                  <RainIcon fontSize="small" />
                  Rain (mm)
                </div>
              </RowHeaderCell>
              {displayForecasts.map((forecast, index) => (
                <TableCell 
                  key={index}
                  sx={{
                    backgroundColor: forecast.precipitation && forecast.precipitation > 0
                      ? theme.palette.info.light
                      : theme.palette.background.paper,
                    fontSize: '0.7rem'
                  }}
                >
                  {forecast.precipitation || '-'}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
      
      {forecasts.length > maxColumns && (
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
          Showing {maxColumns} of {forecasts.length} forecast periods. Scroll horizontally to see more.
        </Typography>
      )}
    </Box>
  );
};

export default ForecastTable;
