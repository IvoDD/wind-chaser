const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class WindyWeekScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    // Conversion factor: m/s to knots
    this.MS_TO_KNOTS = 1.94384;
  }

  /**
   * Extract spot ID from WindyWeek URL
   * @param {string} url - WindyWeek URL (e.g., https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah)
   * @returns {string} spotId (slug)
   */
  extractSpotId(url) {
    const match = url.match(/windyweek\.com\/spots\/([a-z0-9-]+)/i);
    if (!match) {
      throw new Error('Invalid WindyWeek URL format');
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
   * Parse WindyWeek date header to get month and day
   * Format: "Sat, 10/1" = Saturday, January 10th
   * @param {string} dateStr - Date string (e.g., "Sat, 10/1")
   * @param {Date} referenceDate - Reference date for year
   * @returns {object} { dayOfMonth, month }
   */
  parseDateHeader(dateStr, referenceDate = new Date()) {
    // Format: "Sat, 10/1" where 10 is day of month and 1 is month
    const match = dateStr.match(/(\d+)\/(\d+)/);
    if (!match) {
      return null;
    }

    const dayOfMonth = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed

    return { dayOfMonth, month };
  }

  /**
   * Parse hour cell to get hour value
   * Format: "10h" = 10:00
   * @param {string} hourStr - Hour string (e.g., "10h")
   * @returns {number} Hour (0-23)
   */
  parseHourCell(hourStr) {
    const match = hourStr.match(/(\d+)h?/);
    if (!match) {
      return null;
    }
    return parseInt(match[1], 10);
  }

  /**
   * Build full timestamp from date header and hour
   * @param {object} dateInfo - { dayOfMonth, month }
   * @param {number} hour - Hour (0-23)
   * @param {Date} referenceDate - Reference date for year
   * @returns {Date}
   */
  buildTimestamp(dateInfo, hour, referenceDate = new Date()) {
    if (!dateInfo || hour === null) {
      return null;
    }

    const year = referenceDate.getFullYear();
    const result = new Date(year, dateInfo.month, dateInfo.dayOfMonth, hour, 0, 0, 0);

    // Handle year rollover: if date is more than 6 months in the past, it's next year
    const daysDiff = (result.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < -180) {
      result.setFullYear(year + 1);
    }

    return result;
  }

  /**
   * Convert m/s to knots
   * @param {number} ms - Speed in m/s
   * @returns {number} Speed in knots
   */
  msToKnots(ms) {
    if (ms === null || ms === undefined) return null;
    return Math.round(ms * this.MS_TO_KNOTS * 10) / 10;
  }

  /**
   * Scrape wind forecast data from WindyWeek
   * @param {string} url - WindyWeek URL
   * @returns {Promise<object>} Structured wind forecast data
   */
  async scrapeSpot(url) {
    try {
      const spotId = this.extractSpotId(url);

      // Check cache first
      const cachedData = this.getCachedData(spotId);
      if (cachedData) {
        console.log(`Returning cached data for WindyWeek spot ${spotId}`);
        return cachedData;
      }

      console.log(`Scraping WindyWeek data for spot ${spotId}...`);

      // WindyWeek requires JavaScript, so we use Puppeteer directly
      const forecastData = await this.scrapeWithPuppeteer(url);

      // Cache the result
      this.setCachedData(spotId, forecastData);

      return forecastData;
    } catch (error) {
      console.error('Error scraping WindyWeek:', error);
      throw new Error(`Failed to scrape WindyWeek data: ${error.message}`);
    }
  }

  /**
   * Scrape using Puppeteer (WindyWeek requires JavaScript)
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

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`Navigating to ${url}...`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try to accept cookies if present
      try {
        const cookieButtons = await page.$$('button');
        for (const btn of cookieButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.toLowerCase().includes('accept') || text.toLowerCase().includes('agree'))) {
            await btn.click();
            console.log('Clicked cookie consent button');
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
          }
        }
      } catch (e) {
        console.log('No cookie consent found or error handling it');
      }

      // Wait for forecast table
      try {
        await page.waitForSelector('table.forecast-table', { timeout: 10000 });
        console.log('Found forecast table');
      } catch (e) {
        console.log('Forecast table selector timeout, proceeding anyway');
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      return this.parseWindyWeekData($, url);
    } finally {
      await browser.close();
    }
  }

  /**
   * Parse wind forecast data from WindyWeek HTML
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {string} url - Original URL
   * @returns {object} Structured forecast data in unified format
   */
  parseWindyWeekData($, url) {
    const spotId = this.extractSpotId(url);
    const referenceDate = new Date();

    // Get spot name from title or h1
    let spotName = '';
    const title = $('title').text();
    if (title) {
      // Extract spot name from title like "Wind and local weather forecast - Vitosha (Cherni Vrah) - Sofia - Bulgaria - Windyweek"
      const match = title.match(/forecast\s*-\s*([^-]+)/i);
      if (match) {
        spotName = match[1].trim();
      }
    }
    if (!spotName) {
      spotName = `WindyWeek Spot ${spotId}`;
    }

    // Find the forecast table
    const forecastTable = $('table.forecast-table').first();
    if (!forecastTable.length) {
      throw new Error('No forecast table found on WindyWeek page');
    }

    // Extract row data - accumulate across all days
    const rows = {
      windSpeed: [],
      windGusts: [],
      windDirection: [],
      temperature: [],
      windChill: [],
      humidity: [],
      pressure: [],
      precipitation: [],
      cloudiness: []
    };

    const rowLabels = {
      'Wind (m/s)': 'windSpeed',
      'Wind gusts (m/s)': 'windGusts',
      'Wind direction': 'windDirection',
      'Temperature (°C)': 'temperature',
      'Wind chill (°C)': 'windChill',
      'Humidity (%)': 'humidity',
      'Pressure (hPa)': 'pressure',
      'Rainfall (mm/h)': 'precipitation',
      'Cloudiness': 'cloudiness'
    };

    // Process each row - append cells to accumulate data across days
    forecastTable.find('tr').each((rowIndex, row) => {
      const $row = $(row);
      const headerCell = $row.find('th').first();
      const headerText = headerCell.text().trim();

      // Check if this is a data row we care about
      const rowKey = rowLabels[headerText];
      if (rowKey) {
        $row.find('td').each((cellIndex, cell) => {
          const $cell = $(cell);
          const text = $cell.text().trim();
          const html = $cell.html();
          rows[rowKey].push({ text, html });
        });
      }
    });

    // Log totals
    console.log(`Wind speed cells: ${rows.windSpeed.length}`);
    console.log(`Temperature cells: ${rows.temperature.length}`);

    // Extract date headers and hour cells
    // Date headers are in <th class="date-caption"> elements
    // Hour cells are in cells with class "grey"
    const dateHeaders = [];
    const hourCells = [];

    // Find date headers (e.g., "Sat, 10/1")
    forecastTable.find('th.date-caption').each((i, cell) => {
      const text = $(cell).text().trim();
      if (/\d+\/\d+/.test(text)) {
        // Count how many hour cells follow this date
        // Each day has cells until the next date-caption
        dateHeaders.push({ text, index: i });
      }
    });

    // Find all hour cells in order - accumulate across all days
    // Hour cells are in rows where the first column contains time like "0h", "1h", etc.
    forecastTable.find('tr').each((rowIndex, row) => {
      const $row = $(row);
      const firstCell = $row.find('td, th').first();
      const firstCellText = firstCell.text().trim();

      // Check if this looks like a time header row (first cell is empty or contains a date)
      // The actual hour cells have class "grey" and contain patterns like "0h", "1h"
      $row.find('td.grey, th.grey').each((i, cell) => {
        const text = $(cell).text().trim();
        if (/^\d+h$/.test(text)) {
          hourCells.push(text);
        }
      });
    });

    console.log(`Total hour cells found: ${hourCells.length}`);

    console.log(`Date headers: ${dateHeaders.map(d => d.text).join(', ')}`);
    console.log(`Hour cells found: ${hourCells.length}`);

    // Build timestamp array by combining date headers with hour cells
    // Each day typically has 24 hours (or 25 starting from current hour)
    const timestamps = [];

    if (dateHeaders.length > 0 && hourCells.length > 0) {
      // Calculate hours per day based on total hours / days
      // WindyWeek shows hourly data, so typically 24 hours per day
      const hoursPerDay = Math.ceil(hourCells.length / dateHeaders.length);

      let hourIndex = 0;
      for (let dayIndex = 0; dayIndex < dateHeaders.length; dayIndex++) {
        const dateInfo = this.parseDateHeader(dateHeaders[dayIndex].text, referenceDate);

        // Process hours for this day
        const startHourIndex = hourIndex;
        while (hourIndex < hourCells.length) {
          const hour = this.parseHourCell(hourCells[hourIndex]);

          // Check if we've moved to the next day (hour resets to 0 or smaller)
          if (hourIndex > startHourIndex) {
            const prevHour = this.parseHourCell(hourCells[hourIndex - 1]);
            if (hour !== null && prevHour !== null && hour < prevHour) {
              // Hour decreased, we've moved to a new day
              break;
            }
          }

          const timestamp = this.buildTimestamp(dateInfo, hour, referenceDate);
          timestamps.push(timestamp);
          hourIndex++;

          // Safety check: don't process more than 25 hours for a single day
          if (hourIndex - startHourIndex >= 25) {
            break;
          }
        }
      }
    }

    console.log(`Built ${timestamps.length} timestamps`);

    // Determine the number of forecast periods
    const numPeriods = Math.max(
      timestamps.length,
      (rows.windSpeed || []).length,
      (rows.windGusts || []).length,
      (rows.temperature || []).length
    );

    // Build forecast array
    const forecasts = [];

    for (let i = 0; i < numPeriods; i++) {
      // Parse wind direction from HTML (title attribute contains degrees)
      let windDirection = null;
      if (rows.windDirection && rows.windDirection[i]) {
        const html = rows.windDirection[i].html || '';
        // Look for title="SW (229°)"
        const titleMatch = html.match(/title="[^"]*\((\d+)°\)"/);
        if (titleMatch) {
          windDirection = `${parseInt(titleMatch[1])}°`;
        }
      }

      // Get wind speed in m/s and convert to knots
      const windSpeedMs = this.parseNumericValue(rows.windSpeed?.[i]?.text);
      const windGustsMs = this.parseNumericValue(rows.windGusts?.[i]?.text);

      const forecastPoint = {
        timestamp: timestamps[i] ? timestamps[i].toISOString() : null,
        windSpeed: this.msToKnots(windSpeedMs),
        windGusts: this.msToKnots(windGustsMs),
        windDirection: windDirection,
        temperature: this.parseNumericValue(rows.temperature?.[i]?.text),
        cloudCover: null, // WindyWeek uses icons, not percentages
        precipitation: this.parseNumericValue(rows.precipitation?.[i]?.text),
        humidity: this.parseNumericValue(rows.humidity?.[i]?.text),
        pressure: this.parseNumericValue(rows.pressure?.[i]?.text),
        windChill: this.parseNumericValue(rows.windChill?.[i]?.text)
      };

      forecasts.push(forecastPoint);
    }

    if (forecasts.length === 0) {
      throw new Error('No forecast data could be extracted from WindyWeek');
    }

    // Return unified data structure
    return {
      source: 'windyweek',
      spotId,
      spotName,
      url,
      scrapedAt: new Date().toISOString(),
      metadata: {
        sourceUnits: {
          windSpeed: 'm/s', // Original unit before conversion
          temperature: 'celsius'
        }
      },
      forecasts
    };
  }

  /**
   * Parse numeric value from text
   * @param {string} text
   * @returns {number|null}
   */
  parseNumericValue(text) {
    if (!text || typeof text !== 'string') return null;

    const cleanText = text.trim();
    if (!cleanText) return null;

    // Extract number (handles negative values and decimals)
    const matches = cleanText.match(/-?\d+(?:\.\d+)?/);
    if (matches) {
      const num = parseFloat(matches[0]);
      if (!isNaN(num)) {
        return Math.round(num * 10) / 10;
      }
    }

    return null;
  }

  /**
   * Test if a WindyWeek URL is scrapeable
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async testUrl(url) {
    try {
      await this.scrapeSpot(url);
      return true;
    } catch (error) {
      console.error('WindyWeek URL test failed:', error.message);
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

module.exports = WindyWeekScraper;
