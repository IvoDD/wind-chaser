import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '../services/api';

export interface NotificationCriteria {
  minWindSpeed?: number;
  maxWindSpeed?: number;
  preferredDirections?: string[];
  daysOfWeek?: number[];
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface Spot {
  _id: string;
  userId: string;
  name: string;
  location?: string;
  windguruUrl: string;
  description?: string;
  notificationCriteria: NotificationCriteria;
  isActive: boolean;
  lastChecked?: string;
  lastNotificationSent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpotData {
  name: string;
  location?: string;
  windguruUrl: string;
  description?: string;
  notificationCriteria: NotificationCriteria;
}

export interface UpdateSpotData extends Partial<CreateSpotData> {
  isActive?: boolean;
}

interface SpotsContextType {
  spots: Spot[];
  loading: boolean;
  error: string | null;
  fetchSpots: () => Promise<void>;
  createSpot: (spotData: CreateSpotData) => Promise<Spot>;
  updateSpot: (id: string, spotData: UpdateSpotData) => Promise<Spot>;
  deleteSpot: (id: string) => Promise<void>;
  toggleSpotActive: (id: string) => Promise<Spot>;
  testWindguruUrl: (url: string) => Promise<boolean>;
  clearError: () => void;
}

const SpotsContext = createContext<SpotsContextType | undefined>(undefined);

export const useSpots = () => {
  const context = useContext(SpotsContext);
  if (context === undefined) {
    throw new Error('useSpots must be used within a SpotsProvider');
  }
  return context;
};

interface SpotsProviderProps {
  children: ReactNode;
}

export const SpotsProvider: React.FC<SpotsProviderProps> = ({ children }) => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchSpots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/spots');
      setSpots(response.data.spots || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch spots');
      console.error('Error fetching spots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSpot = async (spotData: CreateSpotData): Promise<Spot> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/spots', spotData);
      const newSpot = response.data.spot;
      setSpots(prev => [...prev, newSpot]);
      return newSpot;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create spot';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateSpot = async (id: string, spotData: UpdateSpotData): Promise<Spot> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/spots/${id}`, spotData);
      const updatedSpot = response.data.spot;
      setSpots(prev => prev.map(spot => spot._id === id ? updatedSpot : spot));
      return updatedSpot;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update spot';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteSpot = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/spots/${id}`);
      setSpots(prev => prev.filter(spot => spot._id !== id));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete spot';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpotActive = async (id: string): Promise<Spot> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.patch(`/spots/${id}/toggle`);
      const updatedSpot = response.data.spot;
      setSpots(prev => prev.map(spot => spot._id === id ? updatedSpot : spot));
      return updatedSpot;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to toggle spot status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testWindguruUrl = async (url: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await api.post('/spots/test-url', { url });
      return response.data.accessible === true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to test URL';
      setError(errorMessage);
      return false;
    }
  };

  const value: SpotsContextType = {
    spots,
    loading,
    error,
    fetchSpots,
    createSpot,
    updateSpot,
    deleteSpot,
    toggleSpotActive,
    testWindguruUrl,
    clearError,
  };

  return (
    <SpotsContext.Provider value={value}>
      {children}
    </SpotsContext.Provider>
  );
};
