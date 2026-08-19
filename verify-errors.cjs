/** Real-browser error paths for the v4 settings → bring → visible-read flow. */
const puppeteer = require('puppeteer-core');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP = process.env.APP_URL || process.env.BASE_URL || 'http://127.0.0.1:4173/';
const MOCK_ROOT = process.env.MOCK_ROOT || 'http://127.0.0.1:4199';
const MOCK_API = `${MOCK_ROOT}/v1`;
const profile = mkdtempSync(join(tmpdir(), 'irk-errors-'));
const failures = [];

async function setNth(page, selector, index, value) {
  await page.evaluate(({ selector, index, value }) => {
    const input = document.querySelectorAll(selector)[index];
    if (!input) throw new Error(`Missing ${selector}[${index}]`);
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, { selector, index, value });
}
async function clickText(page, text) {
  const ok = await page.evaluate((text) => {
    const button = [...document.querySelectorAll('button')].find((item) => (item.textContent || '').includes(text));
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (!ok) throw new Error(`Missing button “${text}”`);
}
async function configure(page, model) {
  await page.goto(`${APP}#/settings`, { waitUntil: 'networkidle0' });
  const selects = await page.$$('select');
  await selects[0].select('custom');
  await setNth(page, 'input.control', 0, '[REDACTED]');
  await setNth(page, 'input.control', 1, model);
  await setNth(page, 'input.control', 2, MOCK_API);
}
async function testConnection(page, model) {
  await configure(page, model);
  const started = Date.now();
  await clickText(page, 'Test connection');
  await page.waitForFunction(() => /Connection works|rejected the API key|rate-limiting|could not reach/.test(document.body.innerText), { timeout: 30000 });
  return { text: await page.evaluate(() => document.body.innerText), elapsed: Date.now() - started };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args: ['--lang=en-US'] });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'en-US' }));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 401: readable, no retry.
    await fetch(`${MOCK_ROOT}/__reset`);
    let run = await testConnection(page, 'fault-401');
    if (!run.text.includes('rejected the API key')) failures.push('401 did not show the readable key message');
    let seen = await (await fetch(`${MOCK_ROOT}/__seen`)).json();
    if (seen.length !== 1) failures.push(`401 made ${seen.length} requests instead of failing once`);

    // 429: one delayed retry, then success.
    await fetch(`${MOCK_ROOT}/__reset`);
    run = await testConnection(page, 'fault-429-once');
    seen = await (await fetch(`${MOCK_ROOT}/__seen`)).json();
    if (!run.text.includes('Connection works.')) failures.push('429 did not recover');
    if (seen.length !== 2) failures.push(`429 path made ${seen.length} requests instead of two`);
    if (run.elapsed < 900) failures.push(`429 retry waited only ${run.elapsed}ms`);

    // Malformed generation: exactly one repair call, then the visible read room becomes ready.
    await fetch(`${MOCK_ROOT}/__reset`);
    await configure(page, 'fault-badjson');
    await page.evaluate(() => { location.hash = '#/bring'; });
    await page.waitForSelector('[data-testid="bring-screen"]');
    await setNth(page, 'input[type="date"]', 0, new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
    await setNth(page, 'input.control:not([type="date"])', 0, 'Error-path scheduler review');
    const source = readFileSync(join(process.cwd(), 'src/lib/session-ops.ts'), 'utf8');
    await setNth(page, '#bring-material', 0, source.slice(source.indexOf('export function targetsFromSession'), source.indexOf('export function probeForTarget')));
    await clickText(page, 'Read it');
    await page.waitForSelector('[data-testid="read-screen"]');
    await page.waitForFunction(() => document.body.innerText.includes('Start the questions'), { timeout: 30000 });
    seen = await (await fetch(`${MOCK_ROOT}/__seen`)).json();
    const kinds = seen.map((item) => item.kind);
    if (kinds.filter((kind) => kind === 'GENERATE').length !== 1) failures.push('malformed path did not make exactly one generation call');
    if (kinds.filter((kind) => kind === 'REPAIR').length !== 1) failures.push('malformed path did not make exactly one repair call');
    if (!seen.every((item) => item.violations.length === 0)) failures.push('error-path provider contract violation');

    // Scoring failure: the answer remains, but Next/Finish stays blocked until an explicit manual mark.
    await fetch(`${MOCK_ROOT}/__reset`);
    await configure(page, 'fault-score-500');
    await page.evaluate(() => { location.hash = '#/bring'; });
    await page.waitForSelector('[data-testid="bring-screen"]');
    await setNth(page, 'input[type="date"]', 0, new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
    await setNth(page, 'input.control:not([type="date"])', 0, 'Scoring recovery review');
    await setNth(page, '#bring-material', 0, source.slice(source.indexOf('export function targetsFromSession'), source.indexOf('export function probeForTarget')));
    await clickText(page, 'Read it');
    await page.waitForSelector('[data-testid="read-screen"]');
    await page.waitForFunction(() => document.body.innerText.includes('Start the questions'), { timeout: 30000 });
    await clickText(page, 'Start the questions');
    await page.waitForSelector('[data-testid="run-screen"]');
    await setNth(page, '.v5-answer-input', 0, 'The schedule changes because a missed answer resets the target to the one-day stage.');
    await page.click('.v5-send');
    await clickText(page, 'stand behind it');
    await page.waitForFunction(() => document.body.innerText.includes('Mark it myself and continue'), { timeout: 30000 });
    let bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Next question') || bodyText.includes('See what you can take')) failures.push('scoring failure exposed Next/Finish before manual marking');
    await clickText(page, 'Mark it myself and continue');
    await clickText(page, 'It half-held');
    await page.waitForFunction(() => document.body.innerText.includes('Next question') || document.body.innerText.includes('See what you can take'));
    await page.click('.v5-reply-details summary');
    bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('The schedule changes because')) failures.push('scoring failure lost the committed answer');
    const scoreSeen = await (await fetch(`${MOCK_ROOT}/__seen`)).json();

    console.log(JSON.stringify({ authRequests: 1, rateRequests: 2, malformedKinds: kinds, scoreRequests: scoreSeen.filter((item) => item.kind === 'SCORE').length, failures }, null, 2));
  } catch (error) {
    failures.push(error.stack || error.message);
  } finally {
    await browser.close();
    rmSync(profile, { recursive: true, force: true });
  }
  if (failures.length) {
    failures.forEach((failure) => console.error('  ✗ ' + failure));
    process.exit(1);
  }
  console.log('verify-errors: 401, 429, malformed JSON, and score-failure manual recovery passed in the v5 flow ✓');
})();
