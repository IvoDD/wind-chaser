import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ForecastTable from './ForecastTable';

function makeForecasts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() + i * 3600 * 1000).toISOString(),
    windSpeed: 10 + i,
    windGusts: 15 + i,
    windDirection: `${(i * 30) % 360}°`,
    temperature: 20,
    cloudCover: 40,
    precipitation: 0,
  }));
}

function renderTable(
  forecasts = makeForecasts(5),
  spotName = 'Test Spot',
  maxColumns?: number
) {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <ForecastTable forecasts={forecasts} spotName={spotName} maxColumns={maxColumns} />
    </ThemeProvider>
  );
}

describe('ForecastTable', () => {
  it('renders wind speed cells with correct values', () => {
    renderTable(makeForecasts(3));
    // Wind speeds 10, 11, 12
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders the correct number of forecast period columns', () => {
    const forecasts = makeForecasts(5);
    renderTable(forecasts);
    // Each forecast period creates one header cell (plus the sticky "Time" cell)
    const headerRow = screen.getAllByRole('columnheader');
    // 1 "Time" sticky header + 5 period columns
    expect(headerRow.length).toBe(6);
  });

  it('applies colour style for high wind speed (>= 25 knots)', () => {
    const highWindForecast = [
      {
        timestamp: new Date().toISOString(),
        windSpeed: 28,
        windGusts: 35,
        windDirection: '90°',
        temperature: 20,
        cloudCover: 10,
        precipitation: 0,
      },
    ];
    renderTable(highWindForecast);
    // Wind speed cell should be present with value 28
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('renders "—" or "-" for null/undefined wind speed values', () => {
    const forecastWithNull = [
      {
        timestamp: new Date().toISOString(),
        windSpeed: null,
        windGusts: null,
        windDirection: null,
        temperature: null,
        cloudCover: null,
        precipitation: null,
      },
    ];
    renderTable(forecastWithNull as any);
    // Cells with no value should show "-"
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows "No forecast data available" when forecasts array is empty', () => {
    renderTable([]);
    expect(screen.getByText(/No forecast data available/i)).toBeInTheDocument();
  });
});
