require('./setup');
const request = require('supertest');
const app = require('../../src/app');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const VALID_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
};

async function registerUser(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...VALID_USER, ...overrides });
  return res;
}

describe('POST /api/auth/register', () => {
  it('201 with user object and tokens on valid input', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it('400 when any required field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'missing@example.com', password: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('400 for invalid email format', async () => {
    const res = await registerUser({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('409 when email already registered', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
  });

  it('400 for weak password (too short)', async () => {
    const res = await registerUser({ password: 'abc' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('200 with tokens on correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it('401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_USER.password });
    expect(res.status).toBe(401);
  });

  it('423 when account is locked after too many failed attempts', async () => {
    // Trigger account lockout by failing login 5+ times
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: VALID_USER.email, password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(423);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken;

  beforeEach(async () => {
    const res = await registerUser();
    refreshToken = res.body.tokens.refreshToken;
  });

  it('200 with new tokens on valid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it('401 on expired/invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.value' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken;
  let refreshToken;

  beforeEach(async () => {
    const res = await registerUser();
    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
  });

  it('200 and refresh token is removed from user record', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
  });

  it('subsequent refresh with revoked token returns 401', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/profile', () => {
  let accessToken;

  beforeEach(async () => {
    const res = await registerUser();
    accessToken = res.body.tokens.accessToken;
  });

  it('200 with user data on valid access token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it('401 with no token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('401 with tampered token', async () => {
    const tampered = accessToken.slice(0, -5) + 'XXXXX';
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });
});
