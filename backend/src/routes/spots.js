const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getSpots,
  getSpotById,
  createSpot,
  updateSpot,
  deleteSpot,
  toggleSpotActive,
  testForecastUrl
} = require('../controllers/spotsController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/spots - Get all user's spots
router.get('/', getSpots);

// GET /api/spots/:id - Get specific spot
router.get('/:id', getSpotById);

// POST /api/spots - Create new spot
router.post('/', createSpot);

// PUT /api/spots/:id - Update spot
router.put('/:id', updateSpot);

// DELETE /api/spots/:id - Delete spot (soft delete)
router.delete('/:id', deleteSpot);

// PATCH /api/spots/:id/toggle - Toggle spot active status
router.patch('/:id/toggle', toggleSpotActive);

// POST /api/spots/test-url - Test forecast URL accessibility (Windguru/WindyWeek)
router.post('/test-url', testForecastUrl);

module.exports = router;
