require('./setup');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock axios.head so createSpot's URL accessibility check passes without live requests
jest.mock('axios', () => ({
  head: jest.fn().mockResolvedValue({ status: 200 }),
  get: jest.fn().mockResolvedValue({ data: '' }),
}));

const app = require('../../src/app');

const USER_A = {
  email: 'user-a@example.com',
  password: 'Password123!',
  firstName: 'User',
  lastName: 'A',
};
const USER_B = {
  email: 'user-b@example.com',
  password: 'Password123!',
  firstName: 'User',
  lastName: 'B',
};

async function registerAndLogin(user) {
  const res = await request(app).post('/api/auth/register').send(user);
  return res.body.tokens.accessToken;
}

async function createSpot(token, overrides = {}) {
  return request(app)
    .post('/api/spots')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Spot',
      url: 'https://www.windguru.cz/2346',
      ...overrides,
    });
}

describe('POST /api/spots', () => {
  let token;

  beforeEach(async () => {
    token = await registerAndLogin(USER_A);
  });

  it('201 creates spot with windguru URL; response includes source: "windguru"', async () => {
    const res = await createSpot(token);
    expect(res.status).toBe(201);
    expect(res.body.spot.source).toBe('windguru');
  });

  it('201 creates spot with windyweek URL; response includes source: "windyweek"', async () => {
    const res = await createSpot(token, {
      url: 'https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah',
    });
    expect(res.status).toBe(201);
    expect(res.body.spot.source).toBe('windyweek');
  });

  it('400 for unsupported URL format', async () => {
    const res = await createSpot(token, { url: 'https://example.com/weather' });
    expect(res.status).toBe(400);
  });

  it('400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/spots')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://www.windguru.cz/2346' });
    expect(res.status).toBe(400);
  });

  it('401 without auth token', async () => {
    const res = await request(app)
      .post('/api/spots')
      .send({ name: 'Test', url: 'https://www.windguru.cz/2346' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/spots', () => {
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    tokenA = await registerAndLogin(USER_A);
    tokenB = await registerAndLogin(USER_B);
    // Use different URLs to avoid the per-user duplicate URL constraint
    await createSpot(tokenA, { name: 'Spot A1', url: 'https://www.windguru.cz/2346' });
    await createSpot(tokenA, { name: 'Spot A2', url: 'https://www.windguru.cz/81565' });
    await createSpot(tokenB, { name: 'Spot B1', url: 'https://www.windguru.cz/98370' });
  });

  it('200 returns only spots belonging to the authenticated user', async () => {
    const res = await request(app)
      .get('/api/spots')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.spots.length).toBe(2);
    res.body.spots.forEach((s) => expect(s.name).toMatch(/^Spot A/));
  });

  it('does not return spots of another user', async () => {
    const res = await request(app)
      .get('/api/spots')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.spots.length).toBe(1);
    expect(res.body.spots[0].name).toBe('Spot B1');
  });

  it('401 without auth token', async () => {
    const res = await request(app).get('/api/spots');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/spots/:id', () => {
  let tokenA;
  let tokenB;
  let spotId;

  beforeEach(async () => {
    tokenA = await registerAndLogin(USER_A);
    tokenB = await registerAndLogin(USER_B);
    const res = await createSpot(tokenA, { name: 'Original Name' });
    spotId = res.body.spot._id;
  });

  it('200 updates spot name and notification criteria', async () => {
    const res = await request(app)
      .put(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Updated Name',
        notificationCriteria: { minWindSpeed: 15, maxWindSpeed: 45 },
      });
    expect(res.status).toBe(200);
    expect(res.body.spot.name).toBe('Updated Name');
  });

  it('404 when spot belongs to another user', async () => {
    const res = await request(app)
      .put(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  it('400 when updating to an invalid URL', async () => {
    const res = await request(app)
      .put(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com/not-supported' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/spots/:id', () => {
  let tokenA;
  let tokenB;
  let spotId;

  beforeEach(async () => {
    tokenA = await registerAndLogin(USER_A);
    tokenB = await registerAndLogin(USER_B);
    const res = await createSpot(tokenA);
    spotId = res.body.spot._id;
  });

  it('200 removes the spot', async () => {
    const res = await request(app)
      .delete(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  it('subsequent GET does not include deleted spot', async () => {
    await request(app)
      .delete(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    const res = await request(app)
      .get('/api/spots')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.spots.find((s) => s._id === spotId)).toBeUndefined();
  });

  it('404 when spot belongs to another user', async () => {
    const res = await request(app)
      .delete(`/api/spots/${spotId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/spots/test-url', () => {
  let token;

  beforeEach(async () => {
    token = await registerAndLogin(USER_A);
  });

  it('400 for an unsupported URL', async () => {
    const res = await request(app)
      .post('/api/spots/test-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/forecast' });
    expect(res.status).toBe(400);
  });
});
