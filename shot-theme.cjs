/** Screenshot a route under a forced colour scheme / stored theme. */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4177';
const [, , theme, hash, out, w, h] = process.argv;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: Number(w) || 1280, height: Number(h) || 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: theme === 'paper' ? 'light' : 'dark' },
  ]);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  // Persisted store writes the theme; set it through the app's own path.
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  await page.goto(BASE + '/' + (hash || ''), { waitUntil: 'networkidle0' });
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: out });
  console.log('wrote', out);
  await browser.close();
})();
