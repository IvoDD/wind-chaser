const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class WindguruScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Extract spot ID from Windguru URL
   * @param {string} url - Windguru URL (e.g., https://www.windguru.cz/12345)
   * @returns {string} spotId
   */
  extractSpotId(url) {
    const match = url.match(/windguru\.cz\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Windguru URL format');
    }
    return match[1];
  }

  /**
   * Check if cached data is still valid
   * @param {string} spotId
   * @returns {object|null} cached data or null
   */
  getCachedData(spotId) {
    const cached = this.cache.get(spotId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache forecast data
   * @param {string} spotId
   * @param {object} data
   */
  setCachedData(spotId, data) {
    this.cache.set(spotId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Parse Windguru datetime string to ISO timestamp
   * Format: "Sa10.10h" = Saturday, day 10, hour 10
   * @param {string} datetimeStr - Windguru datetime string (e.g., "Sa10.10h")
   * @param {Date} referenceDate - Reference date for determining month/year
   * @returns {Date} Parsed date object
   */
  parseWindguruDatetime(datetimeStr, referenceDate = new Date()) {
    // Pattern: DayAbbr + DayOfMonth + "." + Hour + "h"
    // Examples: "Sa10.10h", "Su11.03h", "Mo12.15h"
    const match = datetimeStr.match(/^([A-Za-z]{2})(\d+)\.(\d+)h?$/);

    if (!match) {
      console.warn(`Unable to parse Windguru datetime: "${datetimeStr}"`);
      return null;
    }

    const [_, dayAbbr, dayOfMonthStr, hourStr] = match;
    const dayOfMonth = parseInt(dayOfMonthStr, 10);
    const hour = parseInt(hourStr, 10);

    // Day abbreviation mapping (for validation)
    const dayMap = {
      'Su': 0, 'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5, 'Sa': 6
    };

    // Start from reference date and find the matching day
    const result = new Date(referenceDate);
    result.setHours(hour, 0, 0, 0);

    // Get current month and year
    let month = referenceDate.getMonth();
    let year = referenceDate.getFullYear();

    // Set the day of month
    result.setFullYear(year, month, dayOfMonth);

    // Handle month rollover: if the day is in the past (more than 2 days ago),
    // it's likely next month's forecast
    const daysDiff = (result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < -2) {
      // Day is too far in the past, must be next month
      result.setMonth(month + 1);
    }

    // Validate day of week matches (optional sanity check)
    const expectedDayOfWeek = dayMap[dayAbbr];
    if (expectedDayOfWeek !== undefined && result.getDay() !== expectedDayOfWeek) {
      console.warn(`Day of week mismatch for "${datetimeStr}": expected ${expectedDayOfWeek}, got ${result.getDay()}`);
    }

    return result;
  }

  /**
   * Scrape wind forecast data from Windguru
   * @param {string} url - Windguru URL
   * @returns {Promise<object>} Structured wind forecast data
   */
  async scrapeSpot(url) {
    try {
      const spotId = this.extractSpotId(url);

      // Check cache first
      const cachedData = this.getCachedData(spotId);
      if (cachedData) {
        console.log(`Returning cached data for spot ${spotId}`);
        return cachedData;
      }

      console.log(`Scraping wind data for spot ${spotId}...`);

      // Try simple HTTP request first (faster)
      let forecastData;
      try {
        forecastData = await this.scrapeWithAxios(url);
      } catch (error) {
        console.log('Axios scraping failed, trying with Puppeteer...', error.message);
        forecastData = await this.scrapeWithPuppeteer(url);
      }

      // Cache the result
      this.setCachedData(spotId, forecastData);

      return forecastData;
    } catch (error) {
      console.error('Error scraping Windguru:', error);
      throw new Error(`Failed to scrape wind data: ${error.message}`);
    }
  }

  /**
   * Scrape using simple HTTP request + Cheerio
   * @param {string} url
   * @returns {Promise<object>}
   */
  async scrapeWithAxios(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    return this.parseWindguruData($, url);
  }

  /**
   * Scrape using Puppeteer (for dynamic content)
   * @param {string} url
   * @returns {Promise<object>}
   */
  async scrapeWithPuppeteer(url) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      const page = await browser.newPage();

      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Handle potential cookie consent or privacy notices
      try {
        const consentSelectors = [
          'button[data-testid="uc-accept-all-button"]',
          'button:contains("Accept")',
          'button:contains("Agree")',
          'button:contains("I agree")',
          '.fc-button.fc-cta-consent',
          '#didomi-notice-agree-button',
          '.cookie-consent-accept'
        ];

        for (const selector of consentSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              await button.click();
              console.log(`Clicked consent button: ${selector}`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              break;
            }
          } catch (e) {
            // Continue trying other selectors
          }
        }
      } catch (consentError) {
        console.log('No cookie consent found or error handling it:', consentError.message);
      }

      // Wait a bit more for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to wait for forecast table
      const tableSelectors = [
        'table.tabulka',
        'table[class*="forecast"]',
        '.forecast-table',
        'table[id*="forecast"]',
        'table[class*="wind"]'
      ];

      for (const selector of tableSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`Found forecast table with selector: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      return this.parseWindguruData($, url);
    } finally {
      await browser.close();
    }
  }

  /**
   * Parse wind forecast data from Windguru HTML
   * Returns data in unified format with proper timestamps
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {string} url - Original URL
   * @returns {object} Structured forecast data in unified format
   */
  parseWindguruData($, url) {
    const spotId = this.extractSpotId(url);
    const referenceDate = new Date();

    // Try multiple methods to get spot name
    let spotName = '';
    const nameSelectors = ['h1', '.spot-name', 'title', '.location-name', '#spot-title'];

    for (const selector of nameSelectors) {
      const name = $(selector).first().text().trim();
      if (name && !name.toLowerCase().includes('privacy') && !name.toLowerCase().includes('cookie')) {
        spotName = name;
        break;
      }
    }

    if (!spotName) {
      spotName = `Windguru Spot ${spotId}`;
    }

    // Find forecast table
    const tableSelectors = [
      'table.tabulka',
      'table[class*="forecast"]',
      '.forecast-table table',
      'table[id*="forecast"]',
      'table[class*="wind"]',
      'table.fcst_table',
      '.fcst_table_wrapper table'
    ];

    let forecastTable = null;
    for (const selector of tableSelectors) {
      forecastTable = $(selector).first();
      if (forecastTable.length > 0) {
        console.log(`Found forecast table with selector: ${selector}`);
        break;
      }
    }

    if (!forecastTable || !forecastTable.length) {
      // Fallback: find table with most rows
      const tables = $('table');
      let bestTable = null;
      let maxRows = 0;

      tables.each((i, table) => {
        const rowCount = $(table).find('tr').length;
        if (rowCount > maxRows) {
          maxRows = rowCount;
          bestTable = $(table);
        }
      });

      if (bestTable && maxRows > 5) {
        forecastTable = bestTable;
        console.log(`Using table with ${maxRows} rows as forecast table`);
      }
    }

    if (!forecastTable || !forecastTable.length) {
      throw new Error('No forecast table found on page. The page might require JavaScript or have anti-bot protection.');
    }

    // Extract forecast data rows using row position (Windguru has a fixed structure)
    const rows = {};
    const tableRows = forecastTable.find('tr');

    console.log(`Found ${tableRows.length} rows in forecast table`);

    // Windguru table structure:
    // Row 0: Headers (datetime)
    // Row 1: Wind speed (knots)
    // Row 2: Wind gusts (knots)
    // Row 3: Wind direction (arrows)
    // Row 4: Temperature
    // Row 5-7: Cloud coverage (different heights)
    // Row 8: Precipitation

    const rowMapping = [
      { index: 0, key: 'headers', description: 'Date/Time headers' },
      { index: 1, key: 'windSpeed', description: 'Wind speed (knots)' },
      { index: 2, key: 'windGusts', description: 'Wind gusts (knots)' },
      { index: 3, key: 'windDirection', description: 'Wind direction (arrows)' },
      { index: 4, key: 'temperature', description: 'Temperature' },
      { index: 5, key: 'cloudLow', description: 'Low cloud coverage' },
      { index: 6, key: 'cloudMid', description: 'Mid cloud coverage' },
      { index: 7, key: 'cloudHigh', description: 'High cloud coverage' },
      { index: 8, key: 'precipitation', description: 'Precipitation' }
    ];

    // Extract data from each row based on position
    rowMapping.forEach(mapping => {
      if (mapping.index < tableRows.length) {
        const $row = $(tableRows[mapping.index]);
        const cells = [];

        $row.find('td, th').each((cellIndex, cell) => {
          if (cellIndex > 0) { // Skip first column (row label)
            const cellText = $(cell).text().trim();
            const cellHtml = $(cell).html();
            cells.push({ text: cellText, html: cellHtml });
          }
        });

        rows[mapping.key] = cells;
        console.log(`Row ${mapping.index} (${mapping.description}): ${cells.length} cells`);
      }
    });

    // Parse datetime headers from first row
    const headers = rows.headers || [];
    console.log(`Headers found: ${headers.length} time periods`);

    // Build forecast array with proper timestamps
    const forecasts = [];
    const maxColumns = Math.max(
      headers.length,
      (rows.windSpeed || []).length,
      (rows.windGusts || []).length,
      (rows.windDirection || []).length,
      (rows.temperature || []).length,
      (rows.precipitation || []).length
    );

    for (let i = 0; i < maxColumns; i++) {
      const header = headers[i] || {};
      const datetimeStr = header.text || '';

      // Parse datetime to proper timestamp
      const timestamp = this.parseWindguruDatetime(datetimeStr, referenceDate);

      // Parse wind direction from HTML
      let windDirection = null;
      if (rows.windDirection && rows.windDirection[i]) {
        const directionData = rows.windDirection[i];

        // Look for compass directions in text first
        if (directionData.text && directionData.text.trim()) {
          const text = directionData.text.trim();
          const compassMatch = text.match(/^([NESW]{1,3})$/i);
          if (compassMatch) {
            windDirection = compassMatch[1].toUpperCase();
          } else {
            const degreeMatch = text.match(/(\d+)°?/);
            if (degreeMatch) {
              windDirection = `${parseInt(degreeMatch[1])}°`;
            }
          }
        }

        // Extract from HTML (title attribute with degrees)
        if (!windDirection && directionData.html) {
          const html = directionData.html;
          const titleMatch = html.match(/title="[^"]*\((\d+)°\)"/);
          if (titleMatch) {
            windDirection = `${parseInt(titleMatch[1])}°`;
          } else {
            const rotateMatch = html.match(/rotate\((\d+(?:\.\d+)?)/i);
            if (rotateMatch) {
              const degrees = parseFloat(rotateMatch[1]);
              const adjustedDegrees = (degrees - 180 + 360) % 360;
              windDirection = `${Math.round(adjustedDegrees)}°`;
            }
          }
        }
      }

      // Calculate cloud cover as average percentage (0-100)
      const cloudCover = this.calculateCloudCoverPercentage(
        rows.cloudLow?.[i]?.text,
        rows.cloudMid?.[i]?.text,
        rows.cloudHigh?.[i]?.text
      );

      const forecastPoint = {
        timestamp: timestamp ? timestamp.toISOString() : null,
        windSpeed: this.parseNumericValue(rows.windSpeed?.[i]?.text),
        windGusts: this.parseNumericValue(rows.windGusts?.[i]?.text),
        windDirection: windDirection,
        temperature: this.parseNumericValue(rows.temperature?.[i]?.text),
        cloudCover: cloudCover,
        precipitation: this.parseNumericValue(rows.precipitation?.[i]?.text),
        // Fields not available from Windguru
        humidity: null,
        pressure: null,
        windChill: null
      };

      forecasts.push(forecastPoint);
    }

    if (forecasts.length === 0) {
      throw new Error('No forecast data could be extracted from the table');
    }

    // Return unified data structure
    return {
      source: 'windguru',
      spotId,
      spotName,
      url,
      scrapedAt: new Date().toISOString(),
      metadata: {
        sourceUnits: {
          windSpeed: 'knots',
          temperature: 'celsius'
        }
      },
      forecasts
    };
  }

  /**
   * Parse numeric value from text (wind speed, temperature, etc.)
   * @param {string} text
   * @returns {number|null}
   */
  parseNumericValue(text) {
    if (!text || typeof text !== 'string') return null;

    const cleanText = text.trim();
    if (!cleanText) return null;

    // Extract number (handles decimal points and ranges)
    const matches = cleanText.match(/-?(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
    if (matches) {
      const firstNum = parseFloat(matches[0]);
      if (!isNaN(firstNum)) {
        return Math.round(firstNum * 10) / 10;
      }
    }

    return null;
  }

  /**
   * Calculate cloud cover as a single percentage (0-100)
   * Takes the average of low, mid, high cloud coverage
   * @param {string} lowText
   * @param {string} midText
   * @param {string} highText
   * @returns {number|null}
   */
  calculateCloudCoverPercentage(lowText, midText, highText) {
    const low = this.parseNumericValue(lowText);
    const mid = this.parseNumericValue(midText);
    const high = this.parseNumericValue(highText);

    const values = [low, mid, high].filter(v => v !== null);

    if (values.length === 0) return null;

    // Calculate average and ensure it's 0-100
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(Math.min(100, Math.max(0, average)));
  }

  /**
   * Convert degrees to compass direction
   * @param {number} degrees
   * @returns {string}
   */
  degreesToCompass(degrees) {
    if (degrees < 0 || degrees > 360) return null;

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Test if a Windguru URL is scrapeable
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async testUrl(url) {
    try {
      await this.scrapeSpot(url);
      return true;
    } catch (error) {
      console.error('URL test failed:', error.message);
      return false;
    }
  }

  /**
   * Clear cache for a specific spot or all spots
   * @param {string} spotId - Optional, if not provided clears all cache
   */
  clearCache(spotId = null) {
    if (spotId) {
      this.cache.delete(spotId);
    } else {
      this.cache.clear();
    }
  }
}

module.exports = WindguruScraper;
