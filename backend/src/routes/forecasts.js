const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getLiveForecast,
  getDashboardForecasts,
  refreshSpotForecast,
  testForecastUrl,
  clearForecastCache
} = require('../controllers/forecastsController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/forecasts/dashboard - Get dashboard with all user spots and live forecasts
router.get('/dashboard', getDashboardForecasts);

// GET /api/forecasts/live/:spotId - Get live forecast for specific spot
router.get('/live/:spotId', getLiveForecast);

// POST /api/forecasts/refresh/:spotId - Manually refresh forecast for spot
router.post('/refresh/:spotId', refreshSpotForecast);

// POST /api/forecasts/test - Test forecast scraping for a URL
router.post('/test', testForecastUrl);

// DELETE /api/forecasts/cache - Clear forecast cache
router.delete('/cache', clearForecastCache);

module.exports = router;
