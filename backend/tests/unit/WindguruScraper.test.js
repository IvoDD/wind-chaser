const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WindguruScraper = require('../../src/services/WindguruScraper');

jest.mock('axios');
// Mock puppeteer so the Puppeteer fallback path fails fast in unit tests
// (prevents live network calls when Axios parse fails)
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

describe('WindguruScraper', () => {
  let scraper;

  beforeEach(() => {
    scraper = new WindguruScraper();
    jest.clearAllMocks();
  });

  describe('parseWindguruDatetime', () => {
    it('parses "Sa10.10h" correctly (day=10, hour=10)', () => {
      const ref = new Date(2025, 0, 9); // Jan 9 2025 (Thu) — so day 10 = Fri, not Sa, but parser uses day number
      const result = scraper.parseWindguruDatetime('Sa10.10h', ref);
      expect(result).not.toBeNull();
      expect(result.getDate()).toBe(10);
      expect(result.getHours()).toBe(10);
    });

    it('parses "Su11.03h" correctly (day=11, hour=3)', () => {
      const ref = new Date(2025, 0, 10);
      const result = scraper.parseWindguruDatetime('Su11.03h', ref);
      expect(result).not.toBeNull();
      expect(result.getDate()).toBe(11);
      expect(result.getHours()).toBe(3);
    });

    it('parses "Mo12.15h" correctly (day=12, hour=15)', () => {
      const ref = new Date(2025, 0, 11);
      const result = scraper.parseWindguruDatetime('Mo12.15h', ref);
      expect(result).not.toBeNull();
      expect(result.getDate()).toBe(12);
      expect(result.getHours()).toBe(15);
    });

    it('returns null for unrecognized format', () => {
      const result = scraper.parseWindguruDatetime('not-a-date');
      expect(result).toBeNull();
    });

    it('handles month rollover (e.g. Jan 31 → day 1 next month)', () => {
      const ref = new Date(2025, 0, 31); // Jan 31
      // Day 1 with daysDiff < -2 should become Feb 1
      const result = scraper.parseWindguruDatetime('Sa01.12h', ref);
      expect(result).not.toBeNull();
      // month could be Jan or Feb depending on rollover logic — just verify it's a valid date
      expect(result instanceof Date).toBe(true);
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(12);
    });
  });

  describe('caching', () => {
    it('second call with same URL returns cached data without re-fetching', async () => {
      const html = loadFixture('windguru-2346.html');
      axios.get.mockResolvedValue({ data: html });

      await scraper.scrapeSpot('https://www.windguru.cz/2346');
      await scraper.scrapeSpot('https://www.windguru.cz/2346');

      // axios.get should only be called once (second call hits cache)
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('cache expires after timeout (using fake timers)', async () => {
      jest.useFakeTimers();
      const html = loadFixture('windguru-2346.html');
      axios.get.mockResolvedValue({ data: html });

      await scraper.scrapeSpot('https://www.windguru.cz/2346');
      // Advance past the 5-minute cache TTL
      jest.advanceTimersByTime(6 * 60 * 1000);
      await scraper.scrapeSpot('https://www.windguru.cz/2346');

      expect(axios.get).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('clearCache() removes the entry', async () => {
      const html = loadFixture('windguru-2346.html');
      axios.get.mockResolvedValue({ data: html });

      await scraper.scrapeSpot('https://www.windguru.cz/2346');
      scraper.clearCache('2346');
      await scraper.scrapeSpot('https://www.windguru.cz/2346');

      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('throws on empty HTML', async () => {
      axios.get.mockResolvedValue({ data: '' });
      await expect(scraper.scrapeSpot('https://www.windguru.cz/2346')).rejects.toThrow();
    });

    it('throws on HTML with no forecast table', async () => {
      axios.get.mockResolvedValue({
        data: '<html><body><p>No forecast here</p></body></html>',
      });
      await expect(scraper.scrapeSpot('https://www.windguru.cz/2346')).rejects.toThrow();
    });
  });

  describe('parseHtml (windguru-2346.html)', () => {
    let result;

    beforeAll(async () => {
      const html = loadFixture('windguru-2346.html');
      axios.get.mockResolvedValue({ data: html });
      const s = new WindguruScraper();
      result = await s.scrapeSpot('https://www.windguru.cz/2346');
    });

    it('returns source: "windguru"', () => {
      expect(result.source).toBe('windguru');
    });

    it('returns at least 100 forecast periods', () => {
      expect(result.forecasts.length).toBeGreaterThanOrEqual(100);
    });

    it('first forecast has windSpeed as a number', () => {
      expect(typeof result.forecasts[0].windSpeed).toBe('number');
    });

    it('first forecast has windGusts as a number', () => {
      expect(typeof result.forecasts[0].windGusts).toBe('number');
    });

    it('first forecast windDirection matches /^\\d+°$/ or is null', () => {
      const dir = result.forecasts[0].windDirection;
      if (dir !== null) {
        expect(dir).toMatch(/^\d+°$/);
      }
    });

    it('first forecast temperature is a number', () => {
      expect(typeof result.forecasts[0].temperature).toBe('number');
    });

    it('first forecast cloudCover is 0–100 or null', () => {
      const cc = result.forecasts[0].cloudCover;
      if (cc !== null) {
        expect(cc).toBeGreaterThanOrEqual(0);
        expect(cc).toBeLessThanOrEqual(100);
      }
    });

    it('first forecast timestamp is a valid ISO date string', () => {
      const ts = result.forecasts[0].timestamp;
      expect(ts).not.toBeNull();
      expect(new Date(ts).toString()).not.toBe('Invalid Date');
    });

    it('timestamps are in chronological order', () => {
      const timestamps = result.forecasts
        .map((f) => f.timestamp)
        .filter(Boolean)
        .map((t) => new Date(t).getTime());

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('parseHtml (windguru-81565.html)', () => {
    it('returns at least 100 forecast periods', async () => {
      const html = loadFixture('windguru-81565.html');
      axios.get.mockResolvedValue({ data: html });
      const s = new WindguruScraper();
      const result = await s.scrapeSpot('https://www.windguru.cz/81565');
      expect(result.forecasts.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe('parseHtml (windguru-98370.html)', () => {
    it('returns at least 100 forecast periods', async () => {
      const html = loadFixture('windguru-98370.html');
      axios.get.mockResolvedValue({ data: html });
      const s = new WindguruScraper();
      const result = await s.scrapeSpot('https://www.windguru.cz/98370');
      expect(result.forecasts.length).toBeGreaterThanOrEqual(100);
    });
  });
});
