/**
 * v7 · Walk all ten schemes and prove three things at once:
 *   1. every scheme renders Today and a run-through without throwing,
 *   2. its text clears WCAG AA where the base product's contrast gate checks,
 *   3. the ten are actually different from each other, measured in pixels.
 *
 * Point 3 is the one that matters. The first attempt at v7 was ten palettes,
 * and a palette swap is a small pixel difference concentrated in flat areas.
 * Reporting the pairwise difference is how a claim of "ten different designs"
 * gets checked instead of asserted.
 */
const puppeteer = require('puppeteer-core');
const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { PNG } = require('pngjs');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.APP_URL || 'http://127.0.0.1:4173';
const OUT = process.env.SHOT_DIR || 'shots-v7';
const IDS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

const MEASURE = `(selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const parse = (c) => { const p = (c.match(/[\\d.]+/g) || []).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const comp = (f, b, a) => f.map((v, i) => v * a + b[i] * (1 - a));
  const lum = (rgb) => { const l = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
  const layers = []; let n = el;
  while (n) { const cs = getComputedStyle(n); const img = cs.backgroundImage.match(/rgba?\\([^)]+\\)/); if (img) { const g = parse(img[0]); if (g.a > 0) layers.push(g); } const c = parse(cs.backgroundColor); if (c.a > 0) layers.push(c); if (c.a === 1) break; n = n.parentElement; }
  let bg = parse(getComputedStyle(document.body).backgroundColor).rgb;
  for (let i = layers.length - 1; i >= 0; i--) bg = comp(layers[i].rgb, bg, layers[i].a);
  const cs = getComputedStyle(el); const fp = parse(cs.color);
  const fg = fp.a < 1 ? comp(fp.rgb, bg, fp.a) : fp.rgb;
  const v = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return { ratio: (v[0] + 0.05) / (v[1] + 0.05), size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400 };
}`;

const CHECKS = [
  ['h1, h2, .s-path-title, .s-outline-title', 'heading'],
  ['.s-tab, .s-topbar-mid, .s-toolbar a, .s-rail-stop, .s-side-row, .s-dock-btn', 'nav'],
  ['small', 'secondary text'],
  ['.s-self-options button', 'self-grade option'],
];

const settle = async (page) => {
  await page.evaluate(async () => {
    const running = document.getAnimations().map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(running), new Promise((r) => setTimeout(r, 1500))]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
};

const diff = (a, b) => {
  const A = PNG.sync.read(a); const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 100;
  let n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    if (d > 12) n++;
  }
  return (n / (A.width * A.height)) * 100;
};

(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // Seed one real session through the product's own path: sample chooser → read → run.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.removeItem('irk-scheme'));
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' });
  await settle(page);
  /* First open lands on Welcome. Walk through it the way a person would rather
     than writing firstOpenSeen into the store behind the product's back. */
  if (await page.evaluate(() => location.hash.includes('welcome'))) {
    await page.evaluate(() => {
      const skip = [...document.querySelectorAll('button')].find((b) => /直接带我自己的来|Bring my own/.test(b.textContent || ''));
      (skip || document.querySelector('.welcome-primary'))?.click();
    });
    await new Promise((r) => setTimeout(r, 900));
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' });
    await settle(page);
  }
  const opened = await page.evaluate(() => {
    const go = document.querySelector('.today-specimen, .sample-invitation, .s-specimen');
    if (go) { go.click(); return true; }
    return false;
  });
  if (opened) {
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => { const o = document.querySelector('.sample-option'); if (o) o.click(); });
    await new Promise((r) => setTimeout(r, 900));
  }
  let sessionId = await page.evaluate(() => (location.hash.match(/#\/(?:read|run)\/([^/?]+)/) || [])[1] || null);
  if (!sessionId) { console.error('shot-schemes: could not seed a session'); process.exit(1); }

  const rows = [];
  const contrastFailures = [];
  const shoot = async (id, surface, hash) => {
    await page.goto(`${BASE}/?ui=${id}${hash}`, { waitUntil: 'networkidle0' });
    await settle(page);
    await new Promise((r) => setTimeout(r, 350));
    const file = `${OUT}/${id}-${surface}.png`;
    await page.screenshot({ path: file });
    rows.push({ id, surface, file });
    for (const [selector, label] of CHECKS) {
      const m = await page.evaluate(`(${MEASURE})(${JSON.stringify(selector)})`);
      if (!m) continue;
      const large = m.size >= 24 || (m.size >= 18.66 && m.weight >= 700);
      const floor = large ? 3 : 4.5;
      if (m.ratio < floor) contrastFailures.push(`${id}/${surface} ${label}: ${m.ratio.toFixed(2)}:1 (needs ${floor})`);
    }
  };

  for (const id of IDS) {
    /* ?ui=NN is a real navigation, so index.html re-runs and writes data-ui
       before first paint. Setting localStorage and changing only the hash does
       not reload the document — which is how the first run of this script
       reported ten identical screenshots. */
    await shoot(id, 'today', '#/');
    await shoot(id, 'run', `#/run/${sessionId}`);
  }

  /* Second pass: the self-grade step. This is where Anki's interval row,
     Duolingo's extruded blocks and Headspace's pills actually differ, and the
     answering phase hides all three. Commit one answer, then re-walk — the
     probe stays committed, so every scheme opens straight into self-grade. */
  await page.goto(`${BASE}/?ui=01#/run/${sessionId}`, { waitUntil: 'networkidle0' });
  await settle(page);
  const committed = await page.evaluate(() => {
    const box = document.querySelector('#run-answer');
    if (!box) return false;
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    set.call(box, '因为固定加线性的排序代价在这个模型里是可加的，所以两段可以分开估计再相加。');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  if (committed) {
    await new Promise((r) => setTimeout(r, 250));
    await page.evaluate(() => {
      const send = document.querySelector('.s-send, .v5-send');
      if (send) send.click();
    });
    await new Promise((r) => setTimeout(r, 700));
  }
  for (const id of IDS) await shoot(id, 'self', `#/run/${sessionId}`);

  /* Desktop. Two schemes are only themselves at 1440: Structured's spine and
     Notion's sidebar both collapse to a bottom bar on a phone, so a mobile-only
     sheet would under-report exactly the two schemes that changed navigation
     most. */
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  for (const id of IDS) await shoot(id, 'wide', '#/');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const { readFileSync } = require('node:fs');
  const todays = IDS.map((id) => readFileSync(`${OUT}/${id}-today.png`));
  const runs = IDS.map((id) => readFileSync(`${OUT}/${id}-run.png`));
  const selfs = IDS.map((id) => readFileSync(`${OUT}/${id}-self.png`));
  const pairs = [];
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) {
    pairs.push({
      a: IDS[i], b: IDS[j],
      today: diff(todays[i], todays[j]), run: diff(runs[i], runs[j]), self: diff(selfs[i], selfs[j]),
    });
  }
  const min = pairs.reduce((acc, p) => Math.min(acc, Math.max(p.today, p.run)), 100);
  const avg = pairs.reduce((acc, p) => acc + (p.today + p.run + p.self) / 3, 0) / pairs.length;
  const closest = [...pairs].sort((x, y) => Math.max(x.today, x.run) - Math.max(y.today, y.run)).slice(0, 3);

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ pairs, min, avg, contrastFailures, errors }, null, 2));
  console.log(`shot-schemes: ${rows.length} screenshots in ${OUT}/`);
  console.log(`shot-schemes: ${pairs.length} pairs · mean difference ${avg.toFixed(1)}% · closest pair ${min.toFixed(1)}%`);
  for (const c of closest) console.log(`  closest: ${c.a} vs ${c.b} — today ${c.today.toFixed(1)}% · run ${c.run.toFixed(1)}% · self ${c.self.toFixed(1)}%`);
  if (errors.length) { console.error(`  ✗ ${errors.length} page error(s):`); [...new Set(errors)].slice(0, 6).forEach((e) => console.error(`    ${e}`)); }
  for (const f of contrastFailures) console.error(`  ✗ ${f}`);
  await browser.close();
  const bad = errors.length > 0 || contrastFailures.length > 0 || min < 20;
  if (min < 20) console.error(`  ✗ closest pair differs by only ${min.toFixed(1)}% — that is a re-skin, not a redesign`);
  process.exit(bad ? 1 : 0);
})();
