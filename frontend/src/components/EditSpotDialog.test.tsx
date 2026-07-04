import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditSpotDialog from './EditSpotDialog';
import { useSpots } from '../contexts/SpotsContext';
import { Spot } from '../contexts/SpotsContext';

jest.mock('../contexts/SpotsContext');

const mockUseSpots = useSpots as jest.MockedFunction<typeof useSpots>;

const SAMPLE_SPOT: Spot = {
  _id: 'spot-1',
  userId: 'user-1',
  name: 'Burgas Kite',
  location: 'Burgas, Bulgaria',
  url: 'https://www.windguru.cz/81565',
  source: 'windguru',
  description: 'A great kite spot',
  notificationCriteria: {
    minWindSpeed: 12,
    maxWindSpeed: 40,
    preferredDirections: ['N', 'NE'],
    daysOfWeek: [6, 0],
    timeRange: { start: '08:00', end: '18:00' },
  },
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

function renderDialog(spot: Spot | null = SAMPLE_SPOT) {
  mockUseSpots.mockReturnValue({
    spots: [],
    loading: false,
    error: null,
    fetchSpots: jest.fn(),
    createSpot: jest.fn(),
    updateSpot: jest.fn().mockResolvedValue({}),
    deleteSpot: jest.fn(),
    toggleSpotActive: jest.fn(),
    testWindguruUrl: jest.fn().mockResolvedValue(true),
  } as any);

  return render(<EditSpotDialog open={true} onClose={jest.fn()} spot={spot} />);
}

describe('EditSpotDialog', () => {
  it('pre-populates the "url" field from the existing spot', () => {
    renderDialog();
    const urlInput = screen.getByLabelText(/Forecast URL/i) as HTMLInputElement;
    expect(urlInput.value).toBe(SAMPLE_SPOT.url);
  });

  it('does not render a "windguruUrl" input', () => {
    renderDialog();
    expect(screen.queryByLabelText(/windguruUrl/i)).toBeNull();
    expect(screen.queryByLabelText(/windguru url/i)).toBeNull();
  });

  it('calls updateSpot with updated url value', async () => {
    const updateSpot = jest.fn().mockResolvedValue({});
    mockUseSpots.mockReturnValue({
      spots: [],
      loading: false,
      error: null,
      fetchSpots: jest.fn(),
      createSpot: jest.fn(),
      updateSpot,
      deleteSpot: jest.fn(),
      toggleSpotActive: jest.fn(),
      testWindguruUrl: jest.fn().mockResolvedValue(true),
    } as any);

    render(<EditSpotDialog open={true} onClose={jest.fn()} spot={SAMPLE_SPOT} />);

    const urlInput = screen.getByLabelText(/Forecast URL/i);
    fireEvent.change(urlInput, {
      target: { value: 'https://www.windguru.cz/2346' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Update Spot/i }));

    expect(updateSpot).toHaveBeenCalledWith(
      SAMPLE_SPOT._id,
      expect.objectContaining({ url: 'https://www.windguru.cz/2346' })
    );
  });
});
