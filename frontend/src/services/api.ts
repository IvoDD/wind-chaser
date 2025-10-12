import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),
  
  // Test endpoint
  test: () => api.get('/test'),
  
  // Auth endpoints
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  logout: (data: any) => api.post('/auth/logout', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData: any) => api.put('/auth/profile', userData),
  refreshToken: (data: any) => api.post('/auth/refresh', data),
  
  // Spots endpoints (to be implemented in phase 3)
  getSpots: () => api.get('/spots'),
  createSpot: (spotData: any) => api.post('/spots', spotData),
  updateSpot: (id: string, spotData: any) => api.put(`/spots/${id}`, spotData),
  deleteSpot: (id: string) => api.delete(`/spots/${id}`),
  
  // Forecasts endpoints (to be implemented in phase 4)
  getLiveForecast: (spotId: string) => api.get(`/forecasts/live/${spotId}`),
  getDashboardForecasts: () => api.get('/forecasts/dashboard'),
};

export default api;
