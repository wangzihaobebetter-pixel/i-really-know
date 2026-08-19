const puppeteer = require('puppeteer-core');
const { mkdtempSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const APP = process.env.APP_URL || 'http://127.0.0.1:4173/';
const MOCK = process.env.MOCK_URL || 'http://127.0.0.1:4199';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS = join(process.cwd(), 'artifacts', 'e2e');
mkdirSync(ARTIFACTS, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'irk-keyed-'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

async function clickText(page, needle) {
  const ok = await page.evaluate((needle) => {
    const button = [...document.querySelectorAll('button')].find((item) => (item.textContent || '').includes(needle));
    if (!button) return false;
    button.click();
    return true;
  }, needle);
  if (!ok) throw new Error(`No button containing “${needle}”`);
}
async function setNth(page, selector, index, value) {
  await page.evaluate(({ selector, index, value }) => {
    const input = document.querySelectorAll(selector)[index];
    if (!input) throw new Error(`Missing ${selector}[${index}]`);
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, index, value });
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText); }

(async () => {
  await fetch(`${MOCK}/__reset`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: profile,
    args: ['--lang=en-US', '--no-first-run', '--no-default-browser-check'],
  });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US'] });
    });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`${APP}#/settings`, { waitUntil: 'networkidle0', timeout: 30000 });

    const selects = await page.$$('select');
    await selects[0].select('custom');
    await setNth(page, 'input.control', 0, '[REDACTED]');
    await setNth(page, 'input.control', 1, 'mock-v5');
    await setNth(page, 'input.control', 2, `${MOCK}/v1`);
    await clickText(page, 'Test connection');
    await page.waitForFunction(() => document.body.innerText.includes('Connection works.'), { timeout: 10000 });

    await page.evaluate(() => { location.hash = '#/bring'; });
    await page.waitForSelector('[data-testid="bring-screen"]');
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await setNth(page, 'input[type="date"]', 0, date);
    await setNth(page, 'input.control:not([type="date"])', 0, 'Return-schedule implementation');
    const source = readFileSync(join(process.cwd(), 'src/lib/session-ops.ts'), 'utf8');
    await setNth(page, '#bring-material', 0, source.slice(source.indexOf('export function targetsFromSession'), source.indexOf('export function probeForTarget')));
    await page.click('.pace-v5 button:nth-child(1)');
    await clickText(page, 'Read it');
    await page.waitForSelector('[data-testid="read-screen"]', { timeout: 10000 });
    await page.waitForFunction(() => document.body.innerText.includes('Start the questions'), { timeout: 15000 });
    await clickText(page, 'Start the questions');
    await page.waitForSelector('[data-testid="run-screen"]');

    for (let i = 0; i < 4; i += 1) {
      await page.waitForSelector('#run-answer');
      await page.type('#run-answer', `The alternative changes the cost and invariant at this step; I would trace a tiny input and compare the boundary case ${i + 1}.`);
      await page.click('.v5-send');
      await page.waitForSelector('.v5-self-options');
      const before = await bodyText(page);
      check(!before.includes('You gave the mechanism') && !before.includes('You restated the submission'), `question ${i + 1}: verdict appeared before self-grade`);
      await clickText(page, 'stand behind it');
      await page.waitForSelector('.v5-reply-line', { timeout: 15000 });
      check((await page.$$('details[open]')).length === 0, `question ${i + 1}: details opened automatically`);
      await clickText(page, i === 3 ? 'See what you can take with you' : 'Next question');
    }

    await page.waitForSelector('[data-testid="result-screen"]');
    const result = await bodyText(page);
    check(!result.includes('No model verdict was invented'), 'keyed result was mislabeled as self-marked');
    check(result.includes('Your page, marked'), 'keyed result lost its anchored page');
    check((await page.$$('.return-promise-v5')).length === 1, 'weak keyed answers were not scheduled for return');
    const productText = await page.evaluate(() => {
      const clone = document.querySelector('[data-testid="result-screen"]')?.cloneNode(true);
      clone?.querySelector('.result-marked-v5')?.remove();
      return clone?.innerText || '';
    });
    check(!/confidence|dimensionId|counterfactual|blindspot/.test(productText), 'internal model terms leaked outside the student’s own marked source');
    await new Promise((resolve) => setTimeout(resolve, 320));
    const screenshot = join(ARTIFACTS, '11-mobile-keyed-result.png');
    await page.screenshot({ path: screenshot });
    check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);

    const seen = await (await fetch(`${MOCK}/__seen`)).json();
    const kinds = seen.map((item) => item.kind);
    check(kinds.filter((kind) => kind === 'PING').length === 1, 'settings connection did not reach the provider');
    check(kinds.filter((kind) => kind === 'GENERATE').length === 1, 'generation call count was not one');
    check(kinds.filter((kind) => kind === 'SCORE').length === 4, 'each of four answers was not scored exactly once');
    check(seen.every((item) => item.violations.length === 0), `provider contract violations: ${JSON.stringify(seen.filter((item) => item.violations.length))}`);

    console.log(JSON.stringify({ app: APP, mock: MOCK, kinds, screenshot, failures }, null, 2));
  } catch (error) {
    failures.push(error.stack || error.message);
    console.log(JSON.stringify({ app: APP, mock: MOCK, failures }, null, 2));
  } finally {
    await browser.close();
    rmSync(profile, { recursive: true, force: true });
  }
  if (failures.length) process.exit(1);
  console.log('verify-keyed: settings → visible read → 4 questions → self-grade → model verdict → result passed ✓');
})();
