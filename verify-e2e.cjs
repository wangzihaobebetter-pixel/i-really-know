/**
 * End-to-end check against the real build in a real browser.
 * Drives the keyless path a first-time user actually takes: open a sample,
 * answer every probe, self-grade, finish, and land on the Painted Page.
 * Fails loudly on console errors, so a runtime crash cannot pass as "built ok".
 */
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';

const problems = [];
const note = (m) => console.log('  ' + m);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  /* ---------- 1. desktop home ---------- */
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sample-card', { timeout: 15000 });

  const sampleCount = await page.$$eval('.sample-card', (n) => n.length);
  note(`home: ${sampleCount} sample cards`);
  if (sampleCount < 8) problems.push(`expected 8 sample cards, saw ${sampleCount}`);

  const h1 = await page.$eval('h1', (n) => n.textContent.trim());
  note(`home h1: "${h1}"`);
  // An unresolved i18n key renders as the key itself — that shipped once already.
  const rawKeys = await page.evaluate(() =>
    (document.body.innerText.match(/\b(?:common|home|import|viva|map|record|queue|packs|settings|class)\.[a-zA-Z.]+\b/g) || []).slice(0, 5));
  if (rawKeys.length) problems.push('unresolved i18n keys on screen: ' + rawKeys.join(', '));
  await page.screenshot({ path: 'shot-home-desktop.png' });

  /* ---------- 2. run a whole sample, keyless ---------- */
  /* v3's home leads with the live demo, so the first sample card is reached
     below it. Clicking a card still opens that sample's viva. */
  await page.click('.sample-card');
  await page.waitForSelector('#viva-answer', { timeout: 15000 });

  let probesDone = 0;
  for (let i = 0; i < 12; i++) {
    const onViva = await page.$('#viva-answer');
    if (!onViva) break;

    /* P3 §6: the probe question is the largest text on screen and has its own
       class now. In v2 it was body text and this selector was `.t-body-lg`. */
    const question = await page.$eval('.probe-question', (n) => n.textContent.trim().slice(0, 60));
    await page.type('#viva-answer', 'A deliberately mediocre answer that restates the submission without giving a mechanism.');

    // commit
    const committed = await clickByText(page, 'button', ['Commit answer', '提交回答']);
    if (!committed) { problems.push(`probe ${i + 1}: no commit button`); break; }

    // self-grade must appear BEFORE any score — that ordering is the product
    await page.waitForSelector('.selfgrade-opt', { timeout: 5000 }).catch(() => {});
    /* The self-grade must appear BEFORE any verdict is on screen. Reversing
       that ordering destroys the only signal this product has, so assert it
       rather than trusting it. */
    const verdictLeaked = await page.evaluate(() =>
      !!document.querySelector('.divergence-numeral, .mark'));
    if (verdictLeaked) problems.push(`probe ${i + 1}: a verdict was on screen before the self-grade`);
    const graded = await clickByText(page, 'button', ['Shaky', '有点虚']);
    if (!graded) { problems.push(`probe ${i + 1}: no self-grade control`); break; }

    probesDone++;
    note(`probe ${probesDone} answered — "${question}…"`);

    const advanced = await clickByText(page, 'button', ['Next probe', 'Finish and see the map', '下一题', '结束，看地图']);
    if (!advanced) { problems.push(`probe ${i + 1}: no next/finish button`); break; }
    await new Promise((r) => setTimeout(r, 350));
  }

  if (probesDone < 5) problems.push(`only completed ${probesDone} probes, expected 5`);

  /* ---------- 3. the Painted Page ---------- */
  await page.waitForSelector('.anchored', { timeout: 15000 }).catch(() => {
    problems.push('map: .anchored (Painted Page) never rendered');
  });
  const spans = await page.$$eval('.anchor-span', (n) => n.length).catch(() => 0);
  const marked = await page.$$eval('.anchor-span', (ns) =>
    ns.filter((n) => /anchor-(defended|partial|undefended|underclaimed)/.test(n.className)).length).catch(() => 0);
  note(`map: ${spans} anchored spans, ${marked} carrying a verdict colour`);
  if (spans === 0) problems.push('map: no anchor spans — anchors did not place');
  if (marked === 0) problems.push('map: anchors placed but none coloured by verdict');

  /* v3's headline is a signed span count, not an unsigned 0-100 index, and
     there must be exactly ONE hero on the screen (P3 §2.1). */
  const heroes = await page.$$eval('.t-hero', (ns) => ns.map((n) => n.textContent.trim())).catch(() => []);
  note(`map: ${heroes.length} hero numeral(s) ${JSON.stringify(heroes)}`);
  if (heroes.length === 0) problems.push('map: no divergence hero rendered');
  if (heroes.length > 1) problems.push(`map: ${heroes.length} hero numerals on one screen — the rule is one`);
  if (heroes[0] && !/^[+−-]?\d+$/.test(heroes[0].replace(/\s/g, ''))) {
    problems.push(`map: hero is not a signed count ("${heroes[0]}")`);
  }

  const claim = await page.$eval('.divergence-claim', (n) => n.textContent.trim()).catch(() => '');
  note(`map: claim line "${claim}"`);
  if (!claim) problems.push('map: the divergence claim line is missing — the number would be a bare score');

  await page.screenshot({ path: 'shot-map-desktop.png', fullPage: false });

  /* ---------- 4. mobile ---------- */
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sample-card', { timeout: 15000 });
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note(`mobile 390px: horizontal overflow ${overflow}px`);
  if (overflow > 2) problems.push(`mobile: ${overflow}px of horizontal overflow`);
  await page.screenshot({ path: 'shot-home-mobile.png' });

  /* ---------- 5. every route renders ---------- */
  for (const hash of ['#/packs', '#/packs/med', '#/queue', '#/record', '#/settings', '#/class', '#/nope']) {
    await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 250));
    const text = await page.evaluate(() => document.body.innerText.trim().length);
    note(`route ${hash}: ${text} chars rendered`);
    const floor = hash === '#/nope' ? 20 : 40;
    if (text < floor) problems.push(`route ${hash} rendered almost nothing (${text} chars)`);
  }

  await browser.close();

  const realErrors = consoleErrors.filter((e) => !/favicon|manifest|sw\.js/i.test(e));
  if (realErrors.length) {
    problems.push(`${realErrors.length} console errors`);
    realErrors.slice(0, 6).forEach((e) => console.log('  console: ' + e.slice(0, 160)));
  }

  console.log('');
  if (problems.length) {
    console.error(`verify-e2e FAILED (${problems.length}):`);
    problems.forEach((p) => console.error('  ✗ ' + p));
    process.exit(1);
  }
  console.log('verify-e2e: all checks passed ✓');
})().catch((e) => { console.error('verify-e2e crashed:', e.message); process.exit(1); });

async function clickByText(page, selector, texts) {
  const handle = await page.evaluateHandle((sel, wanted) => {
    const nodes = [...document.querySelectorAll(sel)];
    return nodes.find((n) => wanted.some((w) => n.textContent.trim() === w)) || null;
  }, selector, texts);
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
