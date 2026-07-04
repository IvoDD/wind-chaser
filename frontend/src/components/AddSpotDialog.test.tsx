import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddSpotDialog from './AddSpotDialog';
import { useSpots } from '../contexts/SpotsContext';

jest.mock('../contexts/SpotsContext');

const mockUseSpots = useSpots as jest.MockedFunction<typeof useSpots>;

function renderDialog(open = true) {
  mockUseSpots.mockReturnValue({
    spots: [],
    loading: false,
    error: null,
    fetchSpots: jest.fn(),
    createSpot: jest.fn().mockResolvedValue({}),
    updateSpot: jest.fn(),
    deleteSpot: jest.fn(),
    toggleSpotActive: jest.fn(),
    testWindguruUrl: jest.fn().mockResolvedValue(true),
  } as any);

  return render(<AddSpotDialog open={open} onClose={jest.fn()} />);
}

describe('AddSpotDialog', () => {
  it('renders "Forecast URL" label', () => {
    renderDialog();
    expect(screen.getByLabelText(/Forecast URL/i)).toBeInTheDocument();
  });

  it('placeholder includes both windguru.cz and windyweek.com examples', () => {
    renderDialog();
    const input = screen.getByLabelText(/Forecast URL/i);
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('windguru.cz'));
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('windyweek.com'));
  });

  it('helper text says "Supports Windguru and WindyWeek URLs"', () => {
    renderDialog();
    expect(screen.getByText(/Supports Windguru and WindyWeek URLs/i)).toBeInTheDocument();
  });

  it('Save button is disabled when URL field is empty', () => {
    renderDialog();
    const nameInput = screen.getByLabelText(/Spot Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Spot' } });
    const saveButton = screen.getByRole('button', { name: /Create Spot/i });
    expect(saveButton).toBeDisabled();
  });

  it('Save button is disabled when name field is empty', () => {
    renderDialog();
    const urlInput = screen.getByLabelText(/Forecast URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://www.windguru.cz/2346' } });
    const saveButton = screen.getByRole('button', { name: /Create Spot/i });
    expect(saveButton).toBeDisabled();
  });

  it('Save button is enabled when both name and URL are filled', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/Spot Name/i), {
      target: { value: 'My Spot' },
    });
    fireEvent.change(screen.getByLabelText(/Forecast URL/i), {
      target: { value: 'https://www.windguru.cz/2346' },
    });
    const saveButton = screen.getByRole('button', { name: /Create Spot/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('calls createSpot with { url, name } when Save is clicked', async () => {
    const createSpot = jest.fn().mockResolvedValue({});
    mockUseSpots.mockReturnValue({
      spots: [],
      loading: false,
      error: null,
      fetchSpots: jest.fn(),
      createSpot,
      updateSpot: jest.fn(),
      deleteSpot: jest.fn(),
      toggleSpotActive: jest.fn(),
      testWindguruUrl: jest.fn().mockResolvedValue(true),
    } as any);

    render(<AddSpotDialog open={true} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/Spot Name/i), {
      target: { value: 'My Spot' },
    });
    fireEvent.change(screen.getByLabelText(/Forecast URL/i), {
      target: { value: 'https://www.windguru.cz/2346' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Spot/i }));

    expect(createSpot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Spot',
        url: 'https://www.windguru.cz/2346',
      })
    );
  });
});
