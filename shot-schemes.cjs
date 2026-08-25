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
const BASE = process.env.APP_URL || 'http://127.0.0.1:4174';
const OUT = process.env.SHOT_DIR || 'shots-v7r2';
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
  const duplicates = [];

  /* Scheme 04 printed "还剩 5 问" twice: once on the persistent bar, once again
     under the body, because the bar copy was added after the wrapper already
     had one. Any scheme can regress the same way — the run wrapper and the
     shared dock are written in different files — so the count of visible
     progress lines is asserted on every scheme, not just the one that broke. */
  
  const countProgressLines = () => page.evaluate(() => {
    const re = /(还剩\s*\d+|\b\d+\s+(?:questions?\s+)?left\b)/;
    const seen = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (!child.children.length) {
          const text = (child.textContent || '').trim();
          if (re.test(text) && text.length < 40) seen.push(text);
        } else walk(child);
      }
    };
    walk(document.body);
    return seen;
  });
  /* P28 put a declaration screen in front of the first probe of a fresh
     run-through. It is a real surface, so it gets shot on its own (surface
     'prime'); on every other run surface it has to be acknowledged first, or
     the sheet would show ten copies of the same interstitial where the
     run-through is supposed to be. */
  /* The flag lives in the persisted store in IndexedDB ('irk-v2'), not in the
     synchronous localStorage slice — that one only carries theme and language.
     Editing the wrong one is how the first run of this pass produced nine
     copies of the run screen labelled 'prime'. */
  const readPrimeFlag = () => page.evaluate(async () => {
    const raw = await new Promise((resolve) => {
      const open = indexedDB.open('keyval-store');
      open.onsuccess = () => {
        const db = open.result;
        const req = db.transaction('keyval', 'readonly').objectStore('keyval').get('irk-v2');
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      };
      open.onerror = () => resolve(null);
    });
    if (!raw) return null;
    try { return JSON.parse(raw)?.state?.ui?.stuckPrimeSeenAt ?? null; } catch { return null; }
  });

  const forgetPrimeOnce = async () => {
    await page.evaluate(async () => {
      const raw = await new Promise((resolve) => {
        const open = indexedDB.open('keyval-store');
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('keyval', 'readonly').objectStore('keyval').get('irk-v2');
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        };
        open.onerror = () => resolve(null);
      });
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.state?.ui) delete parsed.state.ui.stuckPrimeSeenAt;
      await new Promise((resolve) => {
        const open = indexedDB.open('keyval-store');
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(JSON.stringify(parsed), 'irk-v2');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        };
        open.onerror = () => resolve();
      });
    });
  };

  /* zustand persists through idb-keyval asynchronously, so the click that set
     this flag can still be in flight when the next scheme tries to clear it:
     the clear reads the pre-write value, writes it back, and the app's write
     then lands on top. That race is what made the prime shot come out right on
     odd schemes and wrong on even ones. Clear, read back, retry. */
  const forgetPrime = async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await forgetPrimeOnce();
      if ((await readPrimeFlag()) === null) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    console.error('shot-schemes: could not clear the prime flag — the prime shots would be run screens');
    process.exit(1);
  };

  const shoot = async (id, surface, hash) => {
    await page.goto(`${BASE}/?ui=${id}${hash}`, { waitUntil: 'networkidle0' });
    await settle(page);
    await new Promise((r) => setTimeout(r, 350));
    if (surface !== 'prime' && (await page.$('[data-testid="run-prime"]'))) {
      await page.click('[data-testid="run-prime-go"]');
      await settle(page);
      await new Promise((r) => setTimeout(r, 350));
    }
    const file = `${OUT}/${id}-${surface}.png`;
    await page.screenshot({ path: file });
    rows.push({ id, surface, file });
    if (surface === 'run') {
      const lines = await countProgressLines();
      if (lines.length > 1) duplicates.push(`${id}/run prints the remaining count ${lines.length} times: ${lines.join(' | ')}`);
    }
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
    /* Land on the run route first, then clear the flag and reload. Clearing it
       from the Today page loses a race with the store's own persist write
       (AppShell records lastRoute on every non-run route), which restored the
       flag on alternating iterations and produced five run screens labelled
       'prime'. */
    await page.goto(`${BASE}/?ui=${id}&pass=clear#/run/${sessionId}`, { waitUntil: 'networkidle0' });
    await forgetPrime();
    /* The URL shoot() navigates to must differ from the one above, or Chrome
       treats it as a same-document hash navigation, the app never re-hydrates,
       and the in-memory copy of the flag survives the IndexedDB clear. */
    await shoot(id, 'prime', `#/run/${sessionId}`);
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

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ pairs, min, avg, contrastFailures, duplicates, errors }, null, 2));
  console.log(`shot-schemes: ${rows.length} screenshots in ${OUT}/`);
  console.log(`shot-schemes: ${pairs.length} pairs · mean difference ${avg.toFixed(1)}% · closest pair ${min.toFixed(1)}%`);
  for (const c of closest) console.log(`  closest: ${c.a} vs ${c.b} — today ${c.today.toFixed(1)}% · run ${c.run.toFixed(1)}% · self ${c.self.toFixed(1)}%`);
  if (errors.length) { console.error(`  ✗ ${errors.length} page error(s):`); [...new Set(errors)].slice(0, 6).forEach((e) => console.error(`    ${e}`)); }
  for (const f of contrastFailures) console.error(`  ✗ ${f}`);
  for (const f of duplicates) console.error(`  ✗ ${f}`);
  await browser.close();
  const bad = errors.length > 0 || contrastFailures.length > 0 || duplicates.length > 0 || min < 20;
  if (min < 20) console.error(`  ✗ closest pair differs by only ${min.toFixed(1)}% — that is a re-skin, not a redesign`);
  process.exit(bad ? 1 : 0);
})();
