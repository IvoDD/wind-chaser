/**
 * Fetch HTML fixtures from live sites for use in tests.
 * Run manually (never in CI):
 *   node backend/tests/fixtures/fetch-fixtures.js
 *
 * Saves full page HTML to tests/fixtures/html/ — commit those files so CI
 * never makes live network requests for scraper tests.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'html');

const FIXTURES = [
  {
    url: 'https://www.windguru.cz/2346',
    file: 'windguru-2346.html',
    description: 'Greece - Faros / Drepano (Patras)',
  },
  {
    url: 'https://www.windguru.cz/81565',
    file: 'windguru-81565.html',
    description: 'Burgas Kite',
  },
  {
    url: 'https://www.windguru.cz/98370',
    file: 'windguru-98370.html',
    description: 'Gokceada',
  },
  {
    url: 'https://www.windyweek.com/spots/bulgaria-sofia-cherni-vrah',
    file: 'windyweek-cherni-vrah.html',
    description: 'Cherni Vrah',
  },
];

async function fetchPage(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Accept cookie consent if present
  const consentSelectors = [
    'button[data-testid="uc-accept-all-button"]',
    '#didomi-notice-agree-button',
    '.fc-button.fc-cta-consent',
    '.cookie-consent-accept',
  ];
  for (const sel of consentSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        await new Promise((r) => setTimeout(r, 2000));
        break;
      }
    } catch {
      // continue
    }
  }

  // Extra wait for dynamic content
  await new Promise((r) => setTimeout(r, 4000));

  return page.content();
}

async function main() {
  console.log(`Saving fixtures to: ${OUTPUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const fixture of FIXTURES) {
      const start = Date.now();
      process.stdout.write(`Fetching ${fixture.description} (${fixture.url}) ... `);
      try {
        const html = await fetchPage(browser, fixture.url);
        const dest = path.join(OUTPUT_DIR, fixture.file);
        fs.writeFileSync(dest, html, 'utf8');
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`OK  ${html.length.toLocaleString()} bytes  ${elapsed}s  → ${dest}`);
      } catch (err) {
        console.error(`FAILED: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\nDone. Commit the generated HTML files to lock them for CI.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
