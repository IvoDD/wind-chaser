const fs = require('fs');
const path = require('path');
const WindyWeekScraper = require('../../src/services/WindyWeekScraper');
const cheerio = require('cheerio');

// WindyWeekScraper uses Puppeteer directly. We bypass the network by calling
// parseWindyWeekData directly with fixture HTML loaded via Cheerio.

jest.mock('puppeteer');

const FIXTURE_DIR = path.join(__dirname, '../fixtures/html');

function loadFixture(name) {
  const filePath = path.join(FIXTURE_DIR, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Fixture not found: ${filePath}\nRun: node backend/tests/fixtures/fetch-fixtures.js`
    );
  }
  return fs.readFileSync(filePath, 'utf8');
}

describe('WindyWeekScraper', () => {
  let scraper;

  beforeEach(() => {
    scraper = new WindyWeekScraper();
  });

  describe('extractSpotId', () => {
    it('extracts "bulgaria-sofia-cherni-vrah" from full URL', () => {
      expect(
        scraper.extractSpotId('https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah')
      ).toBe('bulgaria-sofia-cherni-vrah');
    });

    it('throws on invalid URL', () => {
      expect(() => scraper.extractSpotId('https://example.com/foo')).toThrow(
        /Invalid WindyWeek URL/
      );
    });
  });

  describe('caching', () => {
    it('getCachedData returns null for unknown spotId', () => {
      expect(scraper.getCachedData('unknown-spot')).toBeNull();
    });

    it('getCachedData returns data after setCachedData', () => {
      const data = { source: 'windyweek', forecasts: [] };
      scraper.setCachedData('test-spot', data);
      expect(scraper.getCachedData('test-spot')).toEqual(data);
    });

    it('clearCache() removes a specific entry', () => {
      scraper.setCachedData('test-spot', { forecasts: [] });
      scraper.clearCache('test-spot');
      expect(scraper.getCachedData('test-spot')).toBeNull();
    });

    it('clearCache() with no arg removes all entries', () => {
      scraper.setCachedData('spot-a', { forecasts: [] });
      scraper.setCachedData('spot-b', { forecasts: [] });
      scraper.clearCache();
      expect(scraper.getCachedData('spot-a')).toBeNull();
      expect(scraper.getCachedData('spot-b')).toBeNull();
    });
  });

  describe('parseWindyWeekData (windyweek-cherni-vrah.html)', () => {
    let result;
    const url = 'https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah';

    beforeAll(() => {
      const html = loadFixture('windyweek-cherni-vrah.html');
      const $ = cheerio.load(html);
      const s = new WindyWeekScraper();
      result = s.parseWindyWeekData($, url);
    });

    it('returns source: "windyweek"', () => {
      expect(result.source).toBe('windyweek');
    });

    it('returns at least 20 forecast periods', () => {
      expect(result.forecasts.length).toBeGreaterThanOrEqual(20);
    });

    it('windSpeed values are in knots (plausibly > 0 m/s converted)', () => {
      const speeds = result.forecasts.map((f) => f.windSpeed).filter((v) => v !== null);
      expect(speeds.length).toBeGreaterThan(0);
      // Knots = m/s * 1.944; a 5 m/s wind = ~9.7 knots — values should be positive numbers
      speeds.forEach((s) => {
        expect(typeof s).toBe('number');
        expect(s).toBeGreaterThanOrEqual(0);
      });
    });

    it('each forecast has a valid ISO timestamp or null', () => {
      result.forecasts.forEach((f) => {
        if (f.timestamp !== null) {
          expect(new Date(f.timestamp).toString()).not.toBe('Invalid Date');
        }
      });
    });

    it('timestamps are in chronological order (non-decreasing)', () => {
      const timestamps = result.forecasts
        .map((f) => f.timestamp)
        .filter(Boolean)
        .map((t) => new Date(t).getTime());

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });
});
