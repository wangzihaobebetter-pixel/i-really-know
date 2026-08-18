/** Capture the emotional beats of a keyed run in the paper theme. */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4177';
const MOCK = 'http://localhost:4188/v1';
const MATERIAL = require('node:fs').readFileSync('src/samples/material/cs-algorithms.md', 'utf8');

const click = async (page, texts) => {
  const h = await page.evaluateHandle((w) => {
    const n = [...document.querySelectorAll('button')];
    return n.find((x) => w.some((t) => x.textContent.trim() === t)) || null;
  }, texts);
  const el = h.asElement();
  if (el) await el.click();
  return !!el;
};
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
const paper = (page) => page.evaluate(() => { document.documentElement.dataset.theme = 'paper'; });

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1180, height: 1000, deviceScaleFactor: 2 });

  await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.field');
  await setField(page, ['API base URL', 'API 地址'], MOCK);
  await setField(page, ['API key'], 'sk-mock');
  await setField(page, ['Model', '模型'], 'mock-1');
  await new Promise((r) => setTimeout(r, 300));

  await page.goto(`${BASE}/#/import`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea');
  await page.evaluate((t) => {
    const el = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, MATERIAL);
  await new Promise((r) => setTimeout(r, 400));
  await paper(page);
  await click(page, ['Begin examination', '开始口试']);
  await page.waitForSelector('#viva-answer', { timeout: 25000 });
  await paper(page);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: 'shot-viva-paper.png' });

  // one full probe, revealed
  await page.type('#viva-answer', 'I picked it because it is the standard structure for this problem.');
  await click(page, ['Commit answer', '提交回答']);
  await new Promise((r) => setTimeout(r, 300));
  await click(page, ['I own this', '我掌握了']);
  await new Promise((r) => setTimeout(r, 1200));
  await paper(page);
  await page.screenshot({ path: 'shot-reveal-paper.png' });

  // finish the run claiming ownership throughout, to reach the illusion map
  for (let i = 0; i < 10; i++) {
    if (!(await click(page, ['Next probe', 'Finish and see the map', '下一题', '结束，看地图']))) break;
    await new Promise((r) => setTimeout(r, 300));
    if (!(await page.$('#viva-answer'))) break;
    await page.type('#viva-answer', 'I am confident about this.');
    await click(page, ['Commit answer', '提交回答']);
    await new Promise((r) => setTimeout(r, 250));
    await click(page, ['I own this', '我掌握了']);
    await new Promise((r) => setTimeout(r, 900));
  }
  await page.waitForSelector('.anchored', { timeout: 15000 });
  await paper(page);
  await click(page, ['Write the summary', '生成总评']);
  await new Promise((r) => setTimeout(r, 1500));
  await paper(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: 'shot-illusion-paper.png' });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await new Promise((r) => setTimeout(r, 500));
  await paper(page);
  await page.screenshot({ path: 'shot-map-mobile.png' });

  console.log('captured');
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
