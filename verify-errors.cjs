/**
 * Error-path check in a real browser: rejected key, rate-limit backoff, and a
 * model that returns prose instead of JSON. These branches existed in the
 * client from the start and had never once executed.
 */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';
const MOCK = process.env.MOCK_URL || 'http://localhost:4188/v1';

const problems = [];
const note = (m) => console.log('  ' + m);

const setField = (page, names, val) => page.evaluate((ns, v) => {
  const f = [...document.querySelectorAll('.field')]
    .find((x) => ns.includes(x.querySelector('.field-label')?.textContent.trim()));
  const el = f?.querySelector('input, textarea');
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, names, val);

const click = async (page, texts) => {
  const h = await page.evaluateHandle((w) => {
    const n = [...document.querySelectorAll('button')];
    return n.find((x) => w.some((t) => x.textContent.trim() === t)) || null;
  }, texts);
  const el = h.asElement();
  if (el) await el.click();
  return !!el;
};

async function testConnection(page, model) {
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.field', { timeout: 10000 });
  await setField(page, ['API base URL', 'API 地址'], MOCK);
  await setField(page, ['API key'], 'sk-mock');
  await setField(page, ['Model', '模型'], model);
  await new Promise((r) => setTimeout(r, 300));
  await click(page, ['Test connection', '测试连接']);
  await page.waitForFunction(
    () => /Connection works|连接正常|rejected|拒绝|rate-limiting|限流|could not read|读不了|went wrong/.test(document.body.innerText),
    { timeout: 30000 },
  ).catch(() => {});
  return page.evaluate(() => document.body.innerText);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await fetch(MOCK.replace(/\/v1$/, '') + '/__reset');

  /* 1. rejected key → a readable message, not a raw 401, and no retry storm */
  let text = await testConnection(page, 'fault-401');
  const authOk = /rejected this API key|拒绝了这个 API key/.test(text);
  note(`401: ${authOk ? 'shows the "check your key" message' : 'DID NOT surface an auth message'}`);
  if (!authOk) problems.push('a 401 did not produce the readable auth message');
  let seen = await (await fetch(MOCK.replace(/\/v1$/, '') + '/__seen')).json();
  const authCalls = seen.length;
  note(`401: client made ${authCalls} request(s) — auth errors must not be retried`);
  if (authCalls > 1) problems.push(`auth error was retried ${authCalls} times; it should fail fast`);

  /* 2. 429 on the first call → backoff, then success */
  await fetch(MOCK.replace(/\/v1$/, '') + '/__reset');
  const t0 = Date.now();
  text = await testConnection(page, 'fault-429-once');
  const elapsed = Date.now() - t0;
  const rateOk = /Connection works|连接正常/.test(text);
  seen = await (await fetch(MOCK.replace(/\/v1$/, '') + '/__seen')).json();
  note(`429: recovered=${rateOk}, ${seen.length} requests, ${elapsed}ms elapsed`);
  if (!rateOk) problems.push('a single 429 was not recovered by the backoff');
  if (seen.length < 2) problems.push('no retry was attempted after the 429');
  if (elapsed < 900) problems.push(`retry happened after only ${elapsed}ms — backoff did not wait`);

  /* 3. prose instead of JSON → one repair round-trip, then success */
  await fetch(MOCK.replace(/\/v1$/, '') + '/__reset');
  await page.goto(`${BASE}/#/import`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el,
      'def solve(xs):\n    total = 0\n    for x in xs:\n        total += x * 2\n    return total\n\n'
      + 'I used a running total instead of building a list because the input can be very large and '
      + 'I only need the sum. The complexity is O(n) time and O(1) space. I did not handle the case '
      + 'where xs contains None, because the caller validates that upstream.');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle0' });
  await setField(page, ['Model', '模型'], 'fault-badjson');
  await new Promise((r) => setTimeout(r, 300));
  await page.goto(`${BASE}/#/import`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el,
      'def solve(xs):\n    total = 0\n    for x in xs:\n        total += x * 2\n    return total\n\n'
      + 'I used a running total instead of building a list because the input can be very large. '
      + 'Time complexity is O(n) and space is O(1). I did not handle None entries in xs.');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 400));
  await click(page, ['Begin examination', '开始口试']);
  const recovered = await page.waitForSelector('#viva-answer', { timeout: 30000 }).then(() => true).catch(() => false);
  seen = await (await fetch(MOCK.replace(/\/v1$/, '') + '/__seen')).json();
  const kinds = seen.reduce((a, s) => ({ ...a, [s.kind]: (a[s.kind] || 0) + 1 }), {});
  note(`bad JSON: recovered=${recovered}, calls=${JSON.stringify(kinds)}`);
  if (!recovered) problems.push('a non-JSON response was not recovered by the repair round-trip');
  if (!kinds.REPAIR) problems.push('the repair call was never made');

  await browser.close();
  console.log('');
  if (problems.length) {
    console.error(`verify-errors FAILED (${problems.length}):`);
    problems.forEach((p) => console.error('  ✗ ' + p));
    process.exit(1);
  }
  console.log('verify-errors: auth, rate-limit and malformed-JSON paths all behave ✓');
})().catch((e) => { console.error('verify-errors crashed:', e.message); process.exit(1); });
