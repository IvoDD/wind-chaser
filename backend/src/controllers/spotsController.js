const Spot = require('../models/Spot');
const axios = require('axios');

// Get all spots for the authenticated user
const getSpots = async (req, res) => {
  try {
    const userId = req.user._id;
    const spots = await Spot.findActiveByUser(userId);
    
    res.status(200).json({
      message: 'Spots retrieved successfully',
      count: spots.length,
      spots: spots
    });
    
  } catch (error) {
    console.error('Get spots error:', error);
    res.status(500).json({
      error: 'Failed to retrieve spots',
      message: 'Internal server error while fetching spots'
    });
  }
};

// Get a single spot by ID
const getSpotById = async (req, res) => {
  try {
    const userId = req.user._id;
    const spotId = req.params.id;
    
    const spot = await Spot.findOne({ _id: spotId, userId });
    
    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have permission to access it'
      });
    }
    
    res.status(200).json({
      message: 'Spot retrieved successfully',
      spot: spot
    });
    
  } catch (error) {
    console.error('Get spot by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid spot ID',
        message: 'The provided spot ID is not valid'
      });
    }
    
    res.status(500).json({
      error: 'Failed to retrieve spot',
      message: 'Internal server error while fetching spot'
    });
  }
};

// Create a new spot
const createSpot = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, windguruUrl, description, notificationCriteria } = req.body;
    
    // Validate required fields
    if (!name || !windguruUrl) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and Windguru URL are required'
      });
    }
    
    // Check if user already has a spot with this URL
    const existingSpot = await Spot.findOne({ userId, windguruUrl });
    if (existingSpot) {
      return res.status(409).json({
        error: 'Spot already exists',
        message: 'You already have a spot with this Windguru URL'
      });
    }
    
    // Validate Windguru URL by trying to access it
    try {
      await axios.head(windguruUrl, { timeout: 5000 });
    } catch (urlError) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'The provided Windguru URL is not accessible'
      });
    }
    
    // Create new spot
    const spotData = {
      userId,
      name,
      windguruUrl,
      description: description || '',
      notificationCriteria: {
        minWindSpeed: notificationCriteria?.minWindSpeed || 10,
        maxWindSpeed: notificationCriteria?.maxWindSpeed || 50,
        preferredDirections: notificationCriteria?.preferredDirections || [],
        daysOfWeek: notificationCriteria?.daysOfWeek || [],
        timeRange: {
          start: notificationCriteria?.timeRange?.start || '06:00',
          end: notificationCriteria?.timeRange?.end || '20:00'
        }
      }
    };
    
    const spot = new Spot(spotData);
    await spot.save();
    
    res.status(201).json({
      message: 'Spot created successfully',
      spot: spot
    });
    
  } catch (error) {
    console.error('Create spot error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation error',
        message: errors.join(', ')
      });
    }
    
    res.status(500).json({
      error: 'Failed to create spot',
      message: 'Internal server error while creating spot'
    });
  }
};

// Update an existing spot
const updateSpot = async (req, res) => {
  try {
    const userId = req.user._id;
    const spotId = req.params.id;
    const updates = req.body;
    
    // Find the spot
    const spot = await Spot.findOne({ _id: spotId, userId });
    
    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have permission to update it'
      });
    }
    
    // Validate Windguru URL if it's being updated
    if (updates.windguruUrl && updates.windguruUrl !== spot.windguruUrl) {
      // Check if another spot with this URL exists
      const existingSpot = await Spot.findOne({ 
        userId, 
        windguruUrl: updates.windguruUrl,
        _id: { $ne: spotId }
      });
      
      if (existingSpot) {
        return res.status(409).json({
          error: 'URL already in use',
          message: 'You already have another spot with this Windguru URL'
        });
      }
      
      // Validate URL accessibility
      try {
        await axios.head(updates.windguruUrl, { timeout: 5000 });
      } catch (urlError) {
        return res.status(400).json({
          error: 'Invalid URL',
          message: 'The provided Windguru URL is not accessible'
        });
      }
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'windguruUrl', 'description', 'notificationCriteria', 'isActive'];
    const actualUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        actualUpdates[field] = updates[field];
      }
    });
    
    // Apply updates
    Object.assign(spot, actualUpdates);
    await spot.save();
    
    res.status(200).json({
      message: 'Spot updated successfully',
      spot: spot
    });
    
  } catch (error) {
    console.error('Update spot error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid spot ID',
        message: 'The provided spot ID is not valid'
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation error',
        message: errors.join(', ')
      });
    }
    
    res.status(500).json({
      error: 'Failed to update spot',
      message: 'Internal server error while updating spot'
    });
  }
};

// Delete a spot (soft delete by setting isActive to false)
const deleteSpot = async (req, res) => {
  try {
    const userId = req.user._id;
    const spotId = req.params.id;
    
    const spot = await Spot.findOne({ _id: spotId, userId });
    
    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have permission to delete it'
      });
    }
    
    // Soft delete by setting isActive to false
    spot.isActive = false;
    await spot.save();
    
    res.status(200).json({
      message: 'Spot deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete spot error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid spot ID',
        message: 'The provided spot ID is not valid'
      });
    }
    
    res.status(500).json({
      error: 'Failed to delete spot',
      message: 'Internal server error while deleting spot'
    });
  }
};

// Toggle spot active status
const toggleSpotActive = async (req, res) => {
  try {
    const userId = req.user._id;
    const spotId = req.params.id;
    
    const spot = await Spot.findOne({ _id: spotId, userId });
    
    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have permission to modify it'
      });
    }
    
    spot.isActive = !spot.isActive;
    await spot.save();
    
    res.status(200).json({
      message: `Spot ${spot.isActive ? 'activated' : 'deactivated'} successfully`,
      spot: spot
    });
    
  } catch (error) {
    console.error('Toggle spot active error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid spot ID',
        message: 'The provided spot ID is not valid'
      });
    }
    
    res.status(500).json({
      error: 'Failed to toggle spot status',
      message: 'Internal server error while updating spot status'
    });
  }
};

// Test Windguru URL accessibility
const testWindguruUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL required',
        message: 'Windguru URL is required'
      });
    }
    
    // Validate URL format
    const windguruRegex = /^https?:\/\/(www\.)?windguru\.cz\/\d+\/?$/;
    if (!windguruRegex.test(url)) {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid Windguru URL (e.g., https://www.windguru.cz/81565)'
      });
    }
    
    // Test URL accessibility
    try {
      const response = await axios.head(url, { timeout: 5000 });
      
      res.status(200).json({
        message: 'URL is accessible',
        url: url,
        accessible: true,
        statusCode: response.status
      });
      
    } catch (urlError) {
      res.status(400).json({
        error: 'URL not accessible',
        message: 'The provided Windguru URL could not be accessed',
        url: url,
        accessible: false
      });
    }
    
  } catch (error) {
    console.error('Test URL error:', error);
    res.status(500).json({
      error: 'Failed to test URL',
      message: 'Internal server error while testing URL'
    });
  }
};

module.exports = {
  getSpots,
  getSpotById,
  createSpot,
  updateSpot,
  deleteSpot,
  toggleSpotActive,
  testWindguruUrl
};
