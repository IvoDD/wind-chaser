require('./setup');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock axios.head so createSpot's URL accessibility check passes without live requests
jest.mock('axios', () => ({
  head: jest.fn().mockResolvedValue({ status: 200 }),
  get: jest.fn().mockResolvedValue({ data: '' }),
}));

// Mock the ForecastScraperFactory before importing the app so the controller
// gets the mock when it requires the module.
jest.mock('../../src/services/ForecastScraperFactory', () => ({
  scrapeSpot: jest.fn(),
  validateUrl: jest.fn(),
  detectSource: jest.fn(),
  clearCache: jest.fn(),
  testUrl: jest.fn(),
  getSupportedSources: jest.fn().mockReturnValue(['windguru', 'windyweek']),
}));

const app = require('../../src/app');
const scraperFactory = require('../../src/services/ForecastScraperFactory');

const MINIMAL_FORECAST = {
  source: 'windguru',
  spotId: '2346',
  spotName: 'Test Spot',
  url: 'https://www.windguru.cz/2346',
  scrapedAt: new Date().toISOString(),
  metadata: { sourceUnits: { windSpeed: 'knots', temperature: 'celsius' } },
  forecasts: [
    {
      timestamp: new Date().toISOString(),
      windSpeed: 15,
      windGusts: 20,
      windDirection: '249°',
      temperature: 22,
      cloudCover: 30,
      precipitation: 0,
      humidity: null,
      pressure: null,
      windChill: null,
    },
  ],
};

async function registerAndLogin() {
  const user = {
    email: `user-${Date.now()}@example.com`,
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.tokens.accessToken };
}

async function createSpot(token, overrides = {}) {
  const res = await request(app)
    .post('/api/spots')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Spot',
      url: 'https://www.windguru.cz/2346',
      ...overrides,
    });
  return res.body.spot;
}

beforeEach(() => {
  jest.clearAllMocks();
  scraperFactory.scrapeSpot.mockResolvedValue(MINIMAL_FORECAST);
  scraperFactory.validateUrl.mockReturnValue({ valid: true, source: 'windguru' });
  scraperFactory.detectSource.mockReturnValue('windguru');
  scraperFactory.testUrl.mockResolvedValue({
    success: true,
    source: 'windguru',
    spotName: 'Test Spot',
    forecastCount: 1,
    sampleForecast: MINIMAL_FORECAST.forecasts[0],
  });
});

describe('GET /api/forecasts/dashboard', () => {
  it('returns 200 with empty spots array when user has no active spots', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .get('/api/forecasts/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.spots).toEqual([]);
  });

  it('regression: dashboard does not crash when user has spots (getSpotUrl bug 2026-07-04)', async () => {
    // Regression test: guards against the ReferenceError: getSpotUrl is not defined
    // crash that occurred in getDashboardForecasts when a user had active spots (fixed 2026-07-04)
    const { token } = await registerAndLogin();
    await createSpot(token, { name: 'Spot A', url: 'https://www.windguru.cz/2346' });
    await createSpot(token, { name: 'Spot B', url: 'https://www.windguru.cz/81565' });

    scraperFactory.scrapeSpot.mockResolvedValue(MINIMAL_FORECAST);

    const res = await request(app)
      .get('/api/forecasts/dashboard')
      .set('Authorization', `Bearer ${token}`);

    // Was 500 before the getSpotUrl fix
    expect(res.status).toBe(200);
    expect(res.body.spots).toHaveLength(2);
  });

  it('response includes stats.successful / stats.failed / stats.total', async () => {
    const { token } = await registerAndLogin();
    await createSpot(token);

    const res = await request(app)
      .get('/api/forecasts/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({
      successful: expect.any(Number),
      failed: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it('when scraper throws for one spot, that spot has status: "error" and the rest succeed', async () => {
    const { token } = await registerAndLogin();
    // Use different URLs (duplicate URL per user is rejected by the controller)
    await createSpot(token, { name: 'Good Spot', url: 'https://www.windguru.cz/2346' });
    await createSpot(token, { name: 'Bad Spot', url: 'https://www.windguru.cz/81565' });

    let callCount = 0;
    scraperFactory.scrapeSpot.mockImplementation(async (url) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Simulated scrape failure');
      }
      return MINIMAL_FORECAST;
    });

    const res = await request(app)
      .get('/api/forecasts/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.spots).toHaveLength(2);
    const statuses = res.body.spots.map((s) => s.status);
    expect(statuses).toContain('success');
    expect(statuses).toContain('error');
  });

  it('401 without auth token', async () => {
    const res = await request(app).get('/api/forecasts/dashboard');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/forecasts/live/:spotId', () => {
  let token;
  let spotId;

  beforeEach(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
    const spot = await createSpot(token);
    spotId = spot._id;
  });

  it('200 with forecast data for owned active spot', async () => {
    const res = await request(app)
      .get(`/api/forecasts/live/${spotId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.forecast).toBeDefined();
  });

  it('404 for spot belonging to another user', async () => {
    const { token: otherToken } = await registerAndLogin();
    const res = await request(app)
      .get(`/api/forecasts/live/${spotId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('401 without auth token', async () => {
    const res = await request(app).get(`/api/forecasts/live/${spotId}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/forecasts/refresh/:spotId', () => {
  let token;
  let spotId;

  beforeEach(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
    const spot = await createSpot(token);
    spotId = spot._id;
  });

  it('200 and clears cache before scraping', async () => {
    const res = await request(app)
      .post(`/api/forecasts/refresh/${spotId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(scraperFactory.clearCache).toHaveBeenCalled();
  });

  it('404 for spot belonging to another user', async () => {
    const { token: otherToken } = await registerAndLogin();
    const res = await request(app)
      .post(`/api/forecasts/refresh/${spotId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/forecasts/test', () => {
  let token;

  beforeEach(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
  });

  it('400 when no URL provided', async () => {
    const res = await request(app)
      .post('/api/forecasts/test')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('400 for an invalid URL format (no network call needed)', async () => {
    scraperFactory.validateUrl.mockReturnValue({
      valid: false,
      source: null,
      error: 'Unsupported URL',
    });
    const res = await request(app)
      .post('/api/forecasts/test')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/forecast' });
    expect(res.status).toBe(400);
    expect(scraperFactory.scrapeSpot).not.toHaveBeenCalled();
  });

  it('200 when scraper returns data (mock)', async () => {
    scraperFactory.validateUrl.mockReturnValue({ valid: true, source: 'windguru' });
    scraperFactory.testUrl.mockResolvedValue({
      success: true,
      source: 'windguru',
      spotName: 'Test Spot',
      forecastCount: 1,
      sampleForecast: MINIMAL_FORECAST.forecasts[0],
    });
    const res = await request(app)
      .post('/api/forecasts/test')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://www.windguru.cz/2346' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/forecasts/cache', () => {
  let token;
  let spotId;

  beforeEach(async () => {
    const auth = await registerAndLogin();
    token = auth.token;
    const spot = await createSpot(token);
    spotId = spot._id;
  });

  it('200 clears all caches when no spotId given', async () => {
    const res = await request(app)
      .delete('/api/forecasts/cache')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(scraperFactory.clearCache).toHaveBeenCalled();
  });

  it('200 clears cache for a specific owned spot', async () => {
    const res = await request(app)
      .delete(`/api/forecasts/cache?spotId=${spotId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('404 for spot belonging to another user', async () => {
    const { token: otherToken } = await registerAndLogin();
    const res = await request(app)
      .delete(`/api/forecasts/cache?spotId=${spotId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
