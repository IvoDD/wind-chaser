const ForecastScraperFactory = require('../../src/services/ForecastScraperFactory');
const WindguruScraper = require('../../src/services/WindguruScraper');
const WindyWeekScraper = require('../../src/services/WindyWeekScraper');

describe('ForecastScraperFactory', () => {
  describe('detectSource', () => {
    it('returns "windguru" for windguru.cz URLs', () => {
      expect(ForecastScraperFactory.detectSource('https://www.windguru.cz/2346')).toBe('windguru');
      expect(ForecastScraperFactory.detectSource('https://www.windguru.cz/81565')).toBe('windguru');
    });

    it('returns "windyweek" for windyweek.com URLs', () => {
      expect(ForecastScraperFactory.detectSource('https://www.windyweek.com/spots/foo-bar')).toBe('windyweek');
    });

    it('returns null for unknown domains', () => {
      expect(ForecastScraperFactory.detectSource('https://example.com')).toBeNull();
    });

    it('returns null for null, undefined, and empty string', () => {
      expect(ForecastScraperFactory.detectSource(null)).toBeNull();
      expect(ForecastScraperFactory.detectSource(undefined)).toBeNull();
      expect(ForecastScraperFactory.detectSource('')).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('valid windguru URL returns { valid: true }', () => {
      const result = ForecastScraperFactory.validateUrl('https://www.windguru.cz/2346');
      expect(result.valid).toBe(true);
      expect(result.source).toBe('windguru');
    });

    it('windguru URL without numeric ID returns { valid: false }', () => {
      const result = ForecastScraperFactory.validateUrl('https://www.windguru.cz/spot-name');
      expect(result.valid).toBe(false);
    });

    it('valid windyweek URL returns { valid: true }', () => {
      const result = ForecastScraperFactory.validateUrl(
        'https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah'
      );
      expect(result.valid).toBe(true);
      expect(result.source).toBe('windyweek');
    });

    it('windyweek URL with missing slug returns { valid: false }', () => {
      const result = ForecastScraperFactory.validateUrl('https://www.windyweek.com/spots/');
      expect(result.valid).toBe(false);
    });

    it('completely unknown URL returns { valid: false }', () => {
      const result = ForecastScraperFactory.validateUrl('https://example.com/forecast');
      expect(result.valid).toBe(false);
    });
  });

  describe('getScraper', () => {
    it('returns a WindguruScraper instance for a windguru URL', () => {
      const scraper = ForecastScraperFactory.getScraper('https://www.windguru.cz/2346');
      expect(scraper).toBeInstanceOf(WindguruScraper);
    });

    it('returns a WindyWeekScraper instance for a windyweek URL', () => {
      const scraper = ForecastScraperFactory.getScraper(
        'https://www.windyweek.com/spots/foo-bar'
      );
      expect(scraper).toBeInstanceOf(WindyWeekScraper);
    });

    it('throws a descriptive error for an unsupported URL', () => {
      expect(() => ForecastScraperFactory.getScraper('https://example.com')).toThrow(
        /Unsupported forecast URL/
      );
    });
  });

  describe('clearCache', () => {
    it('calls clearCache on the windguru scraper for a windguru URL', () => {
      const scraper = ForecastScraperFactory.scrapers.windguru;
      const spy = jest.spyOn(scraper, 'clearCache');
      ForecastScraperFactory.clearCache('https://www.windguru.cz/2346');
      expect(spy).toHaveBeenCalledWith('2346');
      spy.mockRestore();
    });

    it('calls clearCache on the windyweek scraper for a windyweek URL', () => {
      const scraper = ForecastScraperFactory.scrapers.windyweek;
      const spy = jest.spyOn(scraper, 'clearCache');
      ForecastScraperFactory.clearCache(
        'https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah'
      );
      expect(spy).toHaveBeenCalledWith('bulgaria-sofia-cherni-vrah');
      spy.mockRestore();
    });

    it('calls clearCache on all scrapers when no URL is given', () => {
      const windguruSpy = jest.spyOn(ForecastScraperFactory.scrapers.windguru, 'clearCache');
      const windyweekSpy = jest.spyOn(ForecastScraperFactory.scrapers.windyweek, 'clearCache');
      ForecastScraperFactory.clearCache();
      expect(windguruSpy).toHaveBeenCalled();
      expect(windyweekSpy).toHaveBeenCalled();
      windguruSpy.mockRestore();
      windyweekSpy.mockRestore();
    });
  });
});
