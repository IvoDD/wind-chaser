# Wind Chaser — Testing Plan

## Overview

This document covers the full testing strategy: scraper unit tests backed by real HTML fixtures, backend integration tests against an in-memory database, frontend component tests, a GitHub Actions CI pipeline, and branch protection setup.

---

## 1. Directory Structure

```
wind-chaser/
├── backend/
│   ├── src/
│   └── tests/
│       ├── fixtures/
│       │   ├── html/
│       │   │   ├── windguru-2346.html        # Greece - Faros / Drepano (Patras)
│       │   │   ├── windguru-81565.html       # Burgas Kite
│       │   │   ├── windguru-98370.html       # Gokceada
│       │   │   └── windyweek-cherni-vrah.html
│       │   └── fetch-fixtures.js             # Script to refresh HTML fixtures
│       ├── unit/
│       │   ├── WindguruScraper.test.js
│       │   ├── WindyWeekScraper.test.js
│       │   └── ForecastScraperFactory.test.js
│       └── integration/
│           ├── auth.test.js
│           ├── spots.test.js
│           └── forecasts.test.js
├── frontend/
│   └── src/
│       └── components/
│           ├── AddSpotDialog.test.tsx
│           ├── EditSpotDialog.test.tsx
│           └── ForecastTable.test.tsx
└── .github/
    └── workflows/
        └── ci.yml
```

---

## 2. Dependencies to Install

### Backend

```bash
cd backend
npm install --save-dev \
  mongodb-memory-server \   # in-memory MongoDB for integration tests
  @jest/globals \           # explicit jest imports in ESM-style tests
  jest-environment-node     # explicit env for backend tests (already default)
```

`mongodb-memory-server` downloads a real `mongod` binary on first run (~70 MB, cached in `~/.cache/mongodb-binaries`). No Docker needed.

### Frontend

```bash
cd frontend
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event
```

These are likely already present from `create-react-app` but confirm.

---

## 3. HTML Fixture Fetching Script

Create `backend/tests/fixtures/fetch-fixtures.js`. Run this script manually (not in CI) to refresh fixtures from live sites.

```
node backend/tests/fixtures/fetch-fixtures.js
```

The script should:
1. Launch Puppeteer (already a project dependency)
2. Navigate to each URL with cookie consent handling (same logic as `WindguruScraper`)
3. Save the full `page.content()` as a `.html` file in `tests/fixtures/html/`
4. Print a summary: URL → file path, content length, timestamp

**URLs to fetch (from current MongoDB):**

| File | URL |
|------|-----|
| `windguru-2346.html` | https://www.windguru.cz/2346 |
| `windguru-81565.html` | https://www.windguru.cz/81565 |
| `windguru-98370.html` | https://www.windguru.cz/98370 |
| `windyweek-cherni-vrah.html` | https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah |

Commit the saved HTML files to the repo so CI never makes live network requests for scraper tests.

---

## 4. Backend Jest Configuration

Add a `jest.config.js` at `backend/`:

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 15000,        // scraper parsing can be slow on large HTML
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js']
};
```

Add test scripts to `backend/package.json`:

```json
"scripts": {
  "test": "jest",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:coverage": "jest --coverage"
}
```

---

## 5. Unit Tests — Scrapers

### 5.1 WindguruScraper (`tests/unit/WindguruScraper.test.js`)

Load each fixture HTML and pass it directly into the scraper's internal parse method (not `scrapeSpot()` which makes network requests). The scraper class will need a `parseHtml(html, url)` method extracted from its current `scrapeSpot` implementation, or tests can mock `axios.get` / `puppeteer.launch` to return fixture content.

**Recommended approach:** mock Axios to return fixture HTML and verify the scraper uses Cheerio path (avoids Puppeteer startup in tests).

**Tests to write:**

```
WindguruScraper
  parseHtml (windguru-2346.html)
    ✓ returns spotName "Greece - Faros / Drepano (Patras)"
    ✓ returns source: "windguru"
    ✓ returns at least 100 forecast periods
    ✓ first forecast has windSpeed as a number
    ✓ first forecast has windGusts as a number
    ✓ first forecast windDirection matches /^\d+°$/
    ✓ first forecast temperature is a number
    ✓ first forecast cloudCover is 0–100
    ✓ first forecast timestamp is a valid ISO date
    ✓ timestamps are in chronological order
  parseHtml (windguru-81565.html)
    ✓ returns spotName containing "Burgas"
    ✓ returns at least 100 forecast periods
  parseHtml (windguru-98370.html)
    ✓ returns at least 100 forecast periods
  parseWindguruDatetime
    ✓ parses "Sa10.10h" correctly (day=10, hour=10)
    ✓ parses "Su11.03h" correctly (day=11, hour=3)
    ✓ parses "Mo12.15h" correctly (day=12, hour=15)
    ✓ returns null for unrecognized format
    ✓ handles month rollover (e.g. Dec 31 → Jan 1)
  caching
    ✓ second call with same URL returns cached data
    ✓ cache expires after timeout (use fake timers)
    ✓ clearCache() removes entry
  error handling
    ✓ throws on empty HTML
    ✓ throws on HTML with no forecast table
```

### 5.2 WindyWeekScraper (`tests/unit/WindyWeekScraper.test.js`)

Same fixture approach for `windyweek-cherni-vrah.html`.

```
WindyWeekScraper
  parseHtml (windyweek-cherni-vrah.html)
    ✓ returns spotName "Cherni Vrah" or similar
    ✓ returns source: "windyweek"
    ✓ returns at least 20 forecast periods
    ✓ windSpeed is in knots (converted from m/s)
    ✓ each forecast has a valid timestamp
    ✓ timestamps are in chronological order
  extractSpotId
    ✓ extracts "bulgaria-sofia-cherni-vrah" from full URL
    ✓ throws on invalid URL
  caching
    ✓ same tests as WindguruScraper caching section
```

### 5.3 ForecastScraperFactory (`tests/unit/ForecastScraperFactory.test.js`)

Pure logic tests, no fixtures needed.

```
ForecastScraperFactory
  detectSource
    ✓ "https://www.windguru.cz/2346"            → "windguru"
    ✓ "https://www.windguru.cz/81565"           → "windguru"
    ✓ "https://www.windyweek.com/spots/foo-bar" → "windyweek"
    ✓ "https://example.com"                     → null
    ✓ null / undefined / empty string           → null
  validateUrl
    ✓ valid windguru URL returns { valid: true }
    ✓ windguru URL without numeric ID           → { valid: false }
    ✓ valid windyweek URL returns { valid: true }
    ✓ windyweek URL with missing slug           → { valid: false }
    ✓ completely unknown URL                    → { valid: false }
  getScraper
    ✓ returns WindguruScraper instance for windguru URL
    ✓ returns WindyWeekScraper instance for windyweek URL
    ✓ throws descriptive error for unsupported URL
  clearCache
    ✓ calls clearCache on the correct scraper for a windguru URL
    ✓ calls clearCache on the correct scraper for a windyweek URL
    ✓ calls clearCache on all scrapers when no URL given
```

---

## 6. Backend Integration Tests

Use `mongodb-memory-server` to spin up a real in-memory MongoDB instance per test suite. Use `supertest` to fire HTTP requests against the Express app without binding a port.

**Setup pattern (shared `tests/integration/setup.js`):**

```js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Wipe all collections between tests for isolation
  await Promise.all(
    Object.values(mongoose.connection.collections).map(c => c.deleteMany({}))
  );
});
```

### 6.1 Auth (`tests/integration/auth.test.js`)

```
POST /api/auth/register
  ✓ 201 with user object and tokens on valid input
  ✓ 400 when any required field is missing
  ✓ 400 for invalid email format
  ✓ 409 when email already registered
  ✓ 400 for weak password (below validation rules)

POST /api/auth/login
  ✓ 200 with tokens on correct credentials
  ✓ 401 on wrong password
  ✓ 401 on unknown email
  ✓ 423 when account is locked (after N failed attempts)

POST /api/auth/refresh
  ✓ 200 with new tokens on valid refresh token
  ✓ 401 on expired/invalid refresh token
  ✓ 401 on refresh token not belonging to user

POST /api/auth/logout
  ✓ 200 and refresh token removed from user record
  ✓ subsequent refresh with revoked token returns 401

GET /api/auth/profile
  ✓ 200 with user data on valid access token
  ✓ 401 with no token
  ✓ 401 with tampered token
```

### 6.2 Spots (`tests/integration/spots.test.js`)

```
POST /api/spots
  ✓ 201 creates spot with windguru URL; response includes source: "windguru"
  ✓ 201 creates spot with windyweek URL; response includes source: "windyweek"
  ✓ 400 for unsupported URL format
  ✓ 400 when name is missing
  ✓ 401 without auth token

GET /api/spots
  ✓ 200 returns only spots belonging to authenticated user
  ✓ does not return spots of another user
  ✓ 401 without auth token

PUT /api/spots/:id
  ✓ 200 updates spot name and notification criteria
  ✓ 404 when spot belongs to another user
  ✓ 400 when updating to an invalid URL

DELETE /api/spots/:id
  ✓ 200 removes spot
  ✓ subsequent GET does not include deleted spot
  ✓ 404 when spot belongs to another user

POST /api/spots/test-url
  ✓ 200 for a valid windguru URL format (mock the actual scrape)
  ✓ 400 for an unsupported URL
```

### 6.3 Forecasts (`tests/integration/forecasts.test.js`)

The scraper makes live network calls — mock `ForecastScraperFactory` in integration tests so CI doesn't depend on external sites being up.

```
GET /api/forecasts/dashboard
  [REGRESSION] ✓ returns 200 (not 500) when user has spots with a "url" field
               (guards against the getSpotUrl-is-not-defined crash from 2026-07-04)
  ✓ returns empty spots array when user has no active spots
  ✓ response includes stats.successful / stats.failed / stats.total
  ✓ when scraper throws for one spot, that spot has status: "error" and
    the rest are still returned (partial failure doesn't kill the response)
  ✓ 401 without auth token

GET /api/forecasts/live/:spotId
  ✓ 200 with forecast data for owned active spot
  ✓ 404 for spot belonging to another user
  ✓ 400 for inactive spot
  ✓ 401 without auth token

POST /api/forecasts/refresh/:spotId
  ✓ 200 and clears cache before scraping
  ✓ 404 for spot belonging to another user

POST /api/forecasts/test
  ✓ 400 when no URL provided
  ✓ 400 for an invalid URL format (no network call needed)
  ✓ 200 when scraper returns data (mock the scraper)

DELETE /api/forecasts/cache
  ✓ 200 clears all caches
  ✓ 200 clears cache for a specific owned spot
  ✓ 404 for spot belonging to another user
```

#### Regression test detail (forecasts.test.js)

This is the critical test for the bug fixed on 2026-07-04 where `getDashboardForecasts` crashed with `ReferenceError: getSpotUrl is not defined` when the user had spots:

```js
it('regression: dashboard does not crash when user has spots (getSpotUrl bug)', async () => {
  // Create user and two spots
  const { token } = await registerAndLogin();
  await createSpot(token, { name: 'Spot A', url: 'https://www.windguru.cz/2346' });
  await createSpot(token, { name: 'Spot B', url: 'https://www.windguru.cz/81565' });

  // Mock scraper to return minimal valid data
  scraperFactory.scrapeSpot.mockResolvedValue(minimalForecastFixture);

  const res = await request(app)
    .get('/api/forecasts/dashboard')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);        // was 500 before fix
  expect(res.body.spots).toHaveLength(2);
});
```

---

## 7. Frontend Component Tests

Use React Testing Library. Keep these focused on component behaviour, not pixel rendering.

### 7.1 AddSpotDialog (`AddSpotDialog.test.tsx`)

```
✓ renders "Forecast URL" label (not the old "Windguru URL")
✓ placeholder includes both windguru.cz and windyweek.com examples
✓ helper text says "Supports Windguru and WindyWeek URLs"
✓ Save button disabled when URL field is empty
✓ Save button disabled when name field is empty
✓ Save button enabled when both name and URL are filled
✓ calls onSave with { url, name, ... } (not windguruUrl)
```

### 7.2 EditSpotDialog (`EditSpotDialog.test.tsx`)

```
✓ pre-populates the "url" field from the existing spot
✓ does not render a "windguruUrl" input
✓ calls onSave with updated url value
```

### 7.3 ForecastTable (`ForecastTable.test.tsx`)

```
✓ renders wind speed cells with correct values
✓ applies colour class for high wind speed (>= 25 knots)
✓ renders "—" or similar for null/undefined values
✓ renders the correct number of forecast period columns
```

---

## 8. GitHub Actions CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    name: Backend tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
        working-directory: backend
      - run: npm test -- --ci --forceExit
        working-directory: backend
        env:
          NODE_ENV: test
          JWT_SECRET: test-secret-for-ci

  frontend-tests:
    name: Frontend tests + type check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
        working-directory: frontend
      - run: npm test -- --watchAll=false --ci
        working-directory: frontend
      - run: npx tsc --noEmit
        working-directory: frontend
```

Key notes:
- `mongodb-memory-server` downloads its binary on first run; it is automatically cached by the `node_modules` cache in `actions/setup-node`.
- `--forceExit` is needed for Jest when mongoose connections aren't fully closed.
- `JWT_SECRET` is set via env so no `.env` file is needed in CI.
- The frontend TypeScript check is a separate step (`tsc --noEmit`) to catch type errors that tests might not surface.

---

## 9. GitHub Branch Protection

After the first CI run passes, configure branch protection on `main` via **Settings → Branches → Add rule**:

| Setting | Value |
|---|---|
| Branch name pattern | `main` |
| Require status checks to pass | ✓ |
| Required checks | `backend-tests`, `frontend-tests` |
| Require branches to be up to date | ✓ |
| Require pull request before merging | ✓ (optional but recommended) |
| Allow force pushes | off |
| Allow deletions | off |

This can also be configured via the GitHub CLI:
```bash
gh api repos/{owner}/wind-chaser/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["backend-tests","frontend-tests"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```

---

## 10. Additional Suggested Tests

These are worth adding beyond the ones described above:

### Security / Auth
- **Spot ownership isolation** — user A cannot read, update, or delete user B's spots (403/404 expected). This is a correctness-critical boundary.
- **Account lockout** — N consecutive wrong passwords locks the account (already implemented in `authController.js`, needs a test).
- **JWT tampering** — modifying the token payload and re-signing with a wrong secret returns 401.

### Scraper resilience
- **Network timeout simulation** — mock Axios to throw `ECONNABORTED`; verify the controller returns 503.
- **Partial HTML** — truncated or malformed fixture; scraper should throw a descriptive error, not an unintelligible crash.
- **Zero forecast periods** — page loads but table is empty; scraper should throw rather than return `{ forecasts: [] }`.

### Data integrity
- **Spot `source` field** — creating a windguru spot auto-sets `source: "windguru"`, windyweek sets `source: "windyweek"`, and the value is stored correctly in MongoDB.
- **Notification criteria defaults** — a new spot without explicit criteria gets `minWindSpeed: 10`, `maxWindSpeed: 50`, `timeRange: { start: "06:00", end: "20:00" }`.

### Frontend
- **SpotsContext** — adding a spot updates the in-memory list without a full page reload.
- **ForecastDashboard error state** — when the API returns 500, the "Failed to retrieve dashboard data" message is shown.

---

## 11. Implementation Order

Suggested order for the implementation session:

1. **Install dependencies** (mongodb-memory-server, testing-library)
2. **Write `fetch-fixtures.js`** and run it to generate HTML files; commit the fixtures
3. **Jest config** (`jest.config.js`, update `package.json` scripts)
4. **Unit tests** — ForecastScraperFactory (no fixtures, pure logic, quick wins)
5. **Unit tests** — WindguruScraper (fixtures, mock Axios)
6. **Unit tests** — WindyWeekScraper (fixtures, mock Axios)
7. **Integration test setup** (shared setup.js with MongoMemoryServer)
8. **Integration tests** — auth.test.js
9. **Integration tests** — spots.test.js
10. **Integration tests** — forecasts.test.js (including regression test)
11. **Frontend component tests** — AddSpotDialog, EditSpotDialog, ForecastTable
12. **GitHub Actions CI** (`.github/workflows/ci.yml`)
13. **Branch protection** (configure after first green CI run)

---

## 12. Acceptance Criteria

- `npm test` in `backend/` runs all unit + integration tests with no network calls to external sites
- `npm test -- --watchAll=false` in `frontend/` passes
- CI pipeline goes green on a fresh push to a PR branch
- The regression test for `getSpotUrl` is in `forecasts.test.js` and labelled with a comment referencing the 2026-07-04 fix
- HTML fixtures are committed and do not change unless `fetch-fixtures.js` is re-run manually
