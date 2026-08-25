/**
 * v7 R2 · Measure shipped products instead of describing them.
 *
 * Screenshots tell you a product is green. They do not tell you the tap target
 * is 56px, the corner is 16px, the body sets at 17/1.6, or that the only
 * fixed element is 84px tall at the bottom. Those numbers are what a design
 * decision actually is, and they are what the first round of this research was
 * missing.
 *
 * Reads public surfaces only. No login, no accounts, nothing typed.
 */
const puppeteer = require('puppeteer-core');
const { writeFileSync, mkdirSync, existsSync } = require('node:fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.OUT || '/Users/zihaowang/.openclaw/workspace/memory/ireallyknow-v7r2/measure';

const TARGETS = JSON.parse(process.env.TARGETS || '[]');

const PROBE = () => {
  const seen = new Map();
  const round = (n) => Math.round(n * 10) / 10;
  const all = [...document.querySelectorAll('body *')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });

  // Typography: distinct (family, size, weight, line-height) combos, by pixels covered.
  const type = new Map();
  for (const el of all) {
    if (!el.childNodes.length) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const key = `${cs.fontFamily.split(',')[0].replace(/"/g, '')} | ${round(parseFloat(cs.fontSize))}px | ${cs.fontWeight} | lh ${cs.lineHeight}`;
    const r = el.getBoundingClientRect();
    type.set(key, (type.get(key) || 0) + Math.round(r.width * r.height));
  }

  // Interactive targets: real hit sizes.
  const targets = [...document.querySelectorAll('button, a[role=button], [role=button], input[type=submit]')]
    .map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), r: getComputedStyle(el).borderRadius, text: (el.innerText || '').trim().slice(0, 24) }; })
    .filter((t) => t.w > 8 && t.h > 8);

  // Corner radii actually used, weighted by area.
  const radii = new Map();
  for (const el of all) {
    const cs = getComputedStyle(el);
    const br = cs.borderTopLeftRadius;
    if (br === '0px' || !br) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    radii.set(br, (radii.get(br) || 0) + 1);
  }

  // Motion the product declares.
  const motion = new Map();
  for (const el of all) {
    const cs = getComputedStyle(el);
    for (const [prop, val] of [['transition', cs.transitionDuration], ['animation', cs.animationDuration]]) {
      if (!val || val === '0s') continue;
      const key = `${prop} ${val} ${prop === 'transition' ? cs.transitionTimingFunction : cs.animationTimingFunction}`;
      motion.set(key, (motion.get(key) || 0) + 1);
    }
  }

  // Persistent chrome: what stays on screen.
  const fixed = all.filter((el) => ['fixed', 'sticky'].includes(getComputedStyle(el).position))
    .map((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), pos: cs.position, top: Math.round(r.top), bottom: Math.round(window.innerHeight - r.bottom), h: Math.round(r.height), w: Math.round(r.width), bg: cs.backgroundColor, z: cs.zIndex }; })
    .filter((f) => f.h > 20 && f.w > 60);

  // Surface colours by painted area.
  const bg = new Map();
  for (const el of all) {
    const cs = getComputedStyle(el);
    const c = cs.backgroundColor;
    if (!c || c === 'rgba(0, 0, 0, 0)') continue;
    const r = el.getBoundingClientRect();
    bg.set(c, (bg.get(c) || 0) + Math.round(r.width * r.height));
  }

  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
  const heights = targets.map((t) => t.h).sort((a, b) => a - b);
  return {
    title: document.title,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    docHeight: document.documentElement.scrollHeight,
    type: top(type, 12),
    radii: top(radii, 6),
    motion: top(motion, 6),
    fixed: fixed.slice(0, 8),
    bg: top(bg, 6),
    targetCount: targets.length,
    targetHeight: heights.length ? { min: heights[0], median: heights[Math.floor(heights.length / 2)], max: heights[heights.length - 1] } : null,
    biggestTargets: targets.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 6),
  };
};

(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const results = [];
  for (const t of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    let data = null, error = null;
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, t.wait || 2500));
      if (t.click) {
        await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, t.click);
        await new Promise((r) => setTimeout(r, t.after || 2500));
      }
      data = await page.evaluate(PROBE);
      await page.screenshot({ path: `${OUT}/${t.id}.png` });
    } catch (e) { error = String(e.message).slice(0, 200); }
    results.push({ id: t.id, name: t.name, url: t.url, error, data });
    console.log(`${t.id.padEnd(22)} ${error ? 'ERR ' + error : (data ? `${data.type.length} type · ${data.targetCount} targets · ${data.fixed.length} fixed` : 'no data')}`);
    await page.close();
  }
  writeFileSync(`${OUT}/measurements.json`, JSON.stringify(results, null, 2));
  await browser.close();
})();
