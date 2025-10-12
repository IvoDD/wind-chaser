import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert } from '@mui/material';
import { apiService } from '../services/api';

const ApiTestComponent: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.healthCheck();
      setHealthStatus(response.data);
    } catch (err: any) {
      setError(`Health check failed: ${err.message}`);
    }
    setLoading(false);
  };

  const testApiEndpoint = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.test();
      setTestResponse(response.data);
    } catch (err: any) {
      setError(`Test endpoint failed: ${err.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Test health check on component mount
    testHealthCheck();
  }, []);

  return (
    <Box sx={{ maxWidth: 600, margin: '0 auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        🌊 Wind Chaser - API Test
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Health Check
          </Typography>
          <Button 
            variant="contained" 
            onClick={testHealthCheck}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            {loading ? 'Testing...' : 'Test Health'}
          </Button>
          {healthStatus && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status: {healthStatus.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Message: {healthStatus.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Version: {healthStatus.version}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Timestamp: {healthStatus.timestamp}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            API Test Endpoint
          </Typography>
          <Button 
            variant="contained" 
            onClick={testApiEndpoint}
            disabled={loading}
            color="secondary"
          >
            {loading ? 'Testing...' : 'Test API'}
          </Button>
          {testResponse && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Message: {testResponse.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Timestamp: {testResponse.timestamp}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Frontend: React + TypeScript + Material-UI ✓<br/>
          Backend: Node.js + Express ✓<br/>
          API Communication: {healthStatus ? '✓' : '❌'}
        </Typography>
      </Box>
    </Box>
  );
};

export default ApiTestComponent;
