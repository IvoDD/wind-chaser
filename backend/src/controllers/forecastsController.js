const WindguruScraper = require('../services/WindguruScraper');
const Spot = require('../models/Spot');
const User = require('../models/User');

// Initialize scraper instance
const scraper = new WindguruScraper();

/**
 * Get live forecast for a specific spot
 * GET /api/forecasts/live/:spotId
 */
const getLiveForecast = async (req, res) => {
  try {
    const { spotId } = req.params;
    const userId = req.user.userId;

    // Find the spot and verify ownership
    const spot = await Spot.findOne({ 
      _id: spotId, 
      userId: userId
    });

    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have access to it'
      });
    }

    if (!spot.isActive) {
      return res.status(400).json({
        error: 'Spot inactive',
        message: 'Cannot fetch forecast for inactive spot'
      });
    }

    // Scrape forecast data
    const forecastData = await scraper.scrapeSpot(spot.windguruUrl);

    // Update spot's last checked time
    await Spot.findByIdAndUpdate(spotId, {
      lastChecked: new Date()
    });

    res.json({
      message: 'Live forecast retrieved successfully',
      spot: {
        id: spot._id,
        name: spot.name,
        location: spot.location,
        windguruUrl: spot.windguruUrl
      },
      forecast: forecastData
    });

  } catch (error) {
    console.error('Error fetching live forecast:', error);
    
    if (error.message.includes('Invalid Windguru URL')) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: error.message
      });
    }

    if (error.message.includes('timeout') || error.message.includes('network')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to fetch forecast data. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Forecast error',
      message: 'Failed to retrieve forecast data'
    });
  }
};

/**
 * Get dashboard with all user spots and their live forecasts
 * GET /api/forecasts/dashboard
 */
const getDashboardForecasts = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all active user spots
    const spots = await Spot.find({ 
      userId: userId,
      isActive: true
    }).sort({ createdAt: -1 });

    if (spots.length === 0) {
      return res.json({
        message: 'Dashboard data retrieved successfully',
        spots: [],
        count: 0
      });
    }

    // Fetch forecasts for all spots (with error handling per spot)
    const spotsWithForecasts = await Promise.allSettled(
      spots.map(async (spot) => {
        try {
          const forecastData = await scraper.scrapeSpot(spot.windguruUrl);
          
          // Update last checked time
          await Spot.findByIdAndUpdate(spot._id, {
            lastChecked: new Date()
          });

          return {
            id: spot._id,
            name: spot.name,
            location: spot.location,
            windguruUrl: spot.windguruUrl,
            notificationCriteria: spot.notificationCriteria,
            isActive: spot.isActive,
            lastChecked: new Date(),
            forecast: forecastData,
            status: 'success'
          };
        } catch (error) {
          console.error(`Error fetching forecast for spot ${spot._id}:`, error.message);
          return {
            id: spot._id,
            name: spot.name,
            location: spot.location,
            windguruUrl: spot.windguruUrl,
            notificationCriteria: spot.notificationCriteria,
            isActive: spot.isActive,
            lastChecked: spot.lastChecked,
            forecast: null,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    // Process results
    const results = spotsWithForecasts.map(result => result.value || result.reason);
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.json({
      message: 'Dashboard data retrieved successfully',
      spots: results,
      count: results.length,
      stats: {
        successful: successCount,
        failed: errorCount,
        total: results.length
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard forecasts:', error);
    res.status(500).json({
      error: 'Dashboard error',
      message: 'Failed to retrieve dashboard data'
    });
  }
};

/**
 * Manually trigger forecast update for a spot
 * POST /api/forecasts/refresh/:spotId
 */
const refreshSpotForecast = async (req, res) => {
  try {
    const { spotId } = req.params;
    const userId = req.user.userId;

    // Find the spot and verify ownership
    const spot = await Spot.findOne({ 
      _id: spotId, 
      userId: userId,
      isDeleted: { $ne: true }
    });

    if (!spot) {
      return res.status(404).json({
        error: 'Spot not found',
        message: 'Spot not found or you do not have access to it'
      });
    }

    // Clear cache for this spot to force fresh data
    scraper.clearCache(scraper.extractSpotId(spot.windguruUrl));

    // Scrape fresh forecast data
    const forecastData = await scraper.scrapeSpot(spot.windguruUrl);

    // Update spot's last checked time
    await Spot.findByIdAndUpdate(spotId, {
      lastChecked: new Date()
    });

    res.json({
      message: 'Forecast refreshed successfully',
      spot: {
        id: spot._id,
        name: spot.name,
        location: spot.location
      },
      forecast: forecastData
    });

  } catch (error) {
    console.error('Error refreshing forecast:', error);
    res.status(500).json({
      error: 'Refresh error',
      message: 'Failed to refresh forecast data'
    });
  }
};

/**
 * Test forecast scraping for a Windguru URL
 * POST /api/forecasts/test
 */
const testForecastUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL required',
        message: 'Windguru URL is required'
      });
    }

    // Test the URL
    const forecastData = await scraper.scrapeSpot(url);

    res.json({
      message: 'URL test successful',
      url,
      accessible: true,
      forecast: {
        spotName: forecastData.spotName,
        forecastCount: forecastData.forecasts.length,
        sampleForecast: forecastData.forecasts[0] || null,
        scrapedAt: forecastData.scrapedAt
      }
    });

  } catch (error) {
    console.error('Error testing forecast URL:', error);
    res.status(400).json({
      error: 'URL test failed',
      message: error.message,
      url: req.body.url,
      accessible: false
    });
  }
};

/**
 * Clear forecast cache
 * DELETE /api/forecasts/cache
 */
const clearForecastCache = async (req, res) => {
  try {
    const { spotId } = req.query;

    if (spotId) {
      // Clear cache for specific spot
      const spot = await Spot.findOne({ 
        _id: spotId, 
        userId: req.user.userId,
        isDeleted: { $ne: true }
      });

      if (!spot) {
        return res.status(404).json({
          error: 'Spot not found',
          message: 'Spot not found or you do not have access to it'
        });
      }

      scraper.clearCache(scraper.extractSpotId(spot.windguruUrl));
      
      res.json({
        message: 'Cache cleared for spot',
        spotId: spotId
      });
    } else {
      // Clear all cache
      scraper.clearCache();
      
      res.json({
        message: 'All forecast cache cleared'
      });
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Cache error',
      message: 'Failed to clear cache'
    });
  }
};

module.exports = {
  getLiveForecast,
  getDashboardForecasts,
  refreshSpotForecast,
  testForecastUrl,
  clearForecastCache
};
