const WindguruScraper = require('./WindguruScraper');
const WindyWeekScraper = require('./WindyWeekScraper');

/**
 * Factory for creating and managing forecast scrapers
 * Supports multiple forecast sources (Windguru, WindyWeek)
 */
class ForecastScraperFactory {
  constructor() {
    // Initialize scraper instances (singleton pattern for caching)
    this.scrapers = {
      windguru: new WindguruScraper(),
      windyweek: new WindyWeekScraper()
    };
  }

  /**
   * Detect the forecast source from a URL
   * @param {string} url - Forecast URL
   * @returns {string|null} Source identifier ('windguru', 'windyweek') or null if unknown
   */
  detectSource(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const normalizedUrl = url.toLowerCase();

    if (normalizedUrl.includes('windguru.cz')) {
      return 'windguru';
    }

    if (normalizedUrl.includes('windyweek.com')) {
      return 'windyweek';
    }

    return null;
  }

  /**
   * Get the appropriate scraper for a URL
   * @param {string} url - Forecast URL
   * @returns {object} Scraper instance
   * @throws {Error} If URL source is not supported
   */
  getScraper(url) {
    const source = this.detectSource(url);

    if (!source) {
      throw new Error(`Unsupported forecast URL. Supported sources: Windguru (windguru.cz), WindyWeek (windyweek.com)`);
    }

    return this.scrapers[source];
  }

  /**
   * Scrape forecast data from any supported URL
   * @param {string} url - Forecast URL
   * @returns {Promise<object>} Forecast data in unified format
   */
  async scrapeSpot(url) {
    const scraper = this.getScraper(url);
    return scraper.scrapeSpot(url);
  }

  /**
   * Test if a URL is valid and scrapeable
   * @param {string} url - Forecast URL
   * @returns {Promise<object>} Test result with success status and details
   */
  async testUrl(url) {
    try {
      const source = this.detectSource(url);

      if (!source) {
        return {
          success: false,
          source: null,
          error: 'Unsupported URL format. Please use a Windguru or WindyWeek URL.'
        };
      }

      const scraper = this.scrapers[source];
      const result = await scraper.scrapeSpot(url);

      return {
        success: true,
        source,
        spotName: result.spotName,
        forecastCount: result.forecasts.length,
        sampleForecast: result.forecasts[0] || null
      };
    } catch (error) {
      return {
        success: false,
        source: this.detectSource(url),
        error: error.message
      };
    }
  }

  /**
   * Clear cache for a specific URL or all caches
   * @param {string} url - Optional URL to clear cache for
   */
  clearCache(url = null) {
    if (url) {
      const source = this.detectSource(url);
      if (source && this.scrapers[source]) {
        const scraper = this.scrapers[source];
        // Extract spot ID based on source
        if (source === 'windguru') {
          const match = url.match(/windguru\.cz\/(\d+)/);
          if (match) {
            scraper.clearCache(match[1]);
          }
        } else if (source === 'windyweek') {
          const match = url.match(/windyweek\.com\/spots\/([a-z0-9-]+)/i);
          if (match) {
            scraper.clearCache(match[1]);
          }
        }
      }
    } else {
      // Clear all caches
      Object.values(this.scrapers).forEach(scraper => {
        scraper.clearCache();
      });
    }
  }

  /**
   * Validate a forecast URL format
   * @param {string} url - URL to validate
   * @returns {object} Validation result
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        source: null,
        error: 'URL is required'
      };
    }

    const source = this.detectSource(url);

    if (!source) {
      return {
        valid: false,
        source: null,
        error: 'URL must be from a supported source (Windguru or WindyWeek)'
      };
    }

    // Source-specific validation
    if (source === 'windguru') {
      const windguruRegex = /^https?:\/\/(www\.)?windguru\.cz\/\d+\/?$/;
      if (!windguruRegex.test(url)) {
        return {
          valid: false,
          source,
          error: 'Invalid Windguru URL format. Expected: https://www.windguru.cz/12345'
        };
      }
    }

    if (source === 'windyweek') {
      const windyweekRegex = /^https?:\/\/(www\.)?windyweek\.com\/spots\/[a-z0-9-]+\/?$/i;
      if (!windyweekRegex.test(url)) {
        return {
          valid: false,
          source,
          error: 'Invalid WindyWeek URL format. Expected: https://www.windyweek.com/spots/country-region-spot'
        };
      }
    }

    return {
      valid: true,
      source,
      error: null
    };
  }

  /**
   * Get list of supported sources
   * @returns {array} List of supported source identifiers
   */
  getSupportedSources() {
    return Object.keys(this.scrapers);
  }
}

// Export singleton instance
module.exports = new ForecastScraperFactory();
