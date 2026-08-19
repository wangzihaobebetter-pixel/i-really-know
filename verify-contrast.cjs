/**
 * Contrast audit on the real rendered page, in BOTH themes. FABLE §6.
 *
 * WHY THIS FILE WAS REWRITTEN. P3 §2.5 swapped in the pre-composited wash
 * scheme and the dev/ui sample list. FABLE §6 extends the sample list further
 * so the new token surface (held / half-held / slipped / held-more, ink
 * buttons, terracotta accent, the dark-by-default removal) is actually
 * measured — not assumed. The v2 gate was narrowly true; the new gate has to
 * be true for the things the design now puts on screen.
 *
 * Three changes vs P3:
 *  1. Sample list now covers the FABLE state vocabulary (held / half-held /
 *     slipped / held-more) — both word colour and span wash.
 *  2. Sample list now covers the INK primary button (paper-on-ink contrast in
 *     the default theme, ink-on-paper in slate), the TERRACOTTA accent, and
 *     the disabled-button state.
 *  3. The third theme is GONE — FABLE §6 removes the script theme. The gate
 *     audits two themes only; an opt-in dark that fails AA is still a shipped
 *     dark that fails AA.
 *
 * Coverage rule: a selector that matches nothing is a SILENT loss of coverage,
 * and the runtime reports it as a hard failure — exactly the failure mode
 * v2's gate slipped into.
 */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';

/** [hash, label, selector, setup?] — setup runs in the page before sampling. */
const SAMPLES = [
  // --- Body / chrome typography ---
  ['#/', 'body text',                '.t-body'],
  ['#/', 'secondary text',           '.ink-2'],
  ['#/', 'tertiary text',            '.ink-3'],
  ['#/', 'card blurb',               '.sample-card .t-small'],
  ['#/', 'sample card title',        '.sample-card-title'],
  ['#/', 'demo provenance',          '.demo-source'],
  ['#/', 'field label',              '.field-label'],
  ['#/', 'serif sentence',           '.t-sentence'],
  ['#/', 'question',                 '.t-question'],
  ['#/', 'title',                    '.t-title'],
  ['#/', 'small',                    '.t-small'],
  ['#/', 'micro',                    '.t-micro'],
  ['#/', 'mono small',               '.t-mono-small'],

  // --- Accent (terracotta) ---
  ['#/', 'accent · link',            '.ink-accent'],
  ['#/', 'accent · wash',            '.bg-accent'],
  ['#/', 'focus ring',               ':focus-visible'],

  // --- Primary button: ink on paper (default), paper on ink (slate) ---
  ['#/', 'primary button · text',     '.btn-primary'],

  // --- FABLE state vocabulary (default class names) ---
  ['#/dev/ui', 'state · held',        '.ink-held'],
  ['#/dev/ui', 'state · half-held',   '.ink-half-held'],
  ['#/dev/ui', 'state · slipped',     '.ink-slipped'],
  ['#/dev/ui', 'state · held-more',   '.ink-held-more'],
  ['#/dev/ui', 'state · over',        '.ink-over'],
  ['#/dev/ui', 'state · under',       '.ink-under'],

  // --- FABLE state wash ---
  ['#/dev/ui', 'wash · held',         '.bg-held'],
  ['#/dev/ui', 'wash · half-held',    '.bg-half-held'],
  ['#/dev/ui', 'wash · slipped',      '.bg-slipped'],
  ['#/dev/ui', 'wash · held-more',    '.bg-held-more'],

  // --- Legacy v2 aliases (still in screens until copy is rewritten) ---
  ['#/dev/ui', 'v2 alias · defended',     '.ink-defended'],
  ['#/dev/ui', 'v2 alias · partial',      '.ink-partial'],
  ['#/dev/ui', 'v2 alias · undefended',   '.ink-undefended'],
  ['#/dev/ui', 'v2 alias · underclaimed', '.ink-underclaimed'],

  // --- v2 anchor marks ---
  ['#/dev/ui', 'anchor · held',        '.anchor-held'],
  ['#/dev/ui', 'anchor · half-held',   '.anchor-half-held'],
  ['#/dev/ui', 'anchor · slipped',     '.anchor-slipped'],
  ['#/dev/ui', 'anchor · held-more',   '.anchor-held-more'],
  ['#/dev/ui', 'anchor · focused wash','.anchor-held.is-active'],

  // --- v2 anchor aliases ---
  ['#/dev/ui', 'v2 anchor · defended',     '.anchor-defended'],
  ['#/dev/ui', 'v2 anchor · partial',      '.anchor-partial'],
  ['#/dev/ui', 'v2 anchor · undefended',   '.anchor-undefended'],
  ['#/dev/ui', 'v2 anchor · underclaimed', '.anchor-underclaimed'],

  // --- Glass chrome (paper-on-glass text) ---
  ['#/dev/ui', 'glass chrome text',     '.glass .t-small'],
];

/** The instructor sheet is print-register and does not follow the app theme. */
const DOC_SAMPLES = [
  ['doc body',        '.doc .t-body'],
  ['doc method',      '.doc-method .t-small'],
  ['doc micro label', '.doc .t-micro'],
  ['doc quote',       '.doc-quote'],
];

const MEASURE = (s, forceActive) => {
  const el = document.querySelector(s);
  if (!el) return null;
  if (forceActive) el.classList.add('is-active');

  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  };
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const over = (fg, bg, a) => fg.map((v, i) => v * a + bg[i] * (1 - a));

  /* Walk up compositing EVERY layer, including a background-image gradient's
     own colour — this is the specific blindness that let v2's Painted Page
     wash go unmeasured. */
  let node = el;
  let bg = null;
  const stack = [];
  while (node) {
    const cs = getComputedStyle(node);
    const c = parse(cs.backgroundColor);
    if (c.a > 0) stack.push(c);
    const img = cs.backgroundImage;
    if (img && img !== 'none') {
      const m = img.match(/rgba?\([^)]+\)/);
      if (m) {
        const g = parse(m[0]);
        if (g.a > 0) stack.push(g);
      }
    }
    if (stack.length && stack[stack.length - 1].a === 1) break;
    node = node.parentElement;
  }
  const base = parse(getComputedStyle(document.body).backgroundColor);
  bg = base.rgb;
  for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i].rgb, bg, stack[i].a);

  const fgp = parse(getComputedStyle(el).color);
  const fg = fgp.a < 1 ? over(fgp.rgb, bg, fgp.a) : fgp.rgb;

  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  const cs = getComputedStyle(el);
  return {
    ratio: (l1 + 0.05) / (l2 + 0.05),
    size: parseFloat(cs.fontSize),
    weight: Number(cs.fontWeight) || 400,
    layers: stack.length,
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const rows = [];
  // FABLE §6: paper is default, slate is opt-in. Script theme is removed.
  for (const theme of ['paper', 'slate']) {
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: theme === 'slate' ? 'dark' : 'light' },
    ]);
    for (const [hash, label, sel] of SAMPLES) {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle0' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await new Promise((r) => setTimeout(r, 260));
      const r = await page.evaluate(MEASURE, sel, sel.includes('is-active'));
      if (r) rows.push({ theme, label, sel, ...r });
      else rows.push({ theme, label, sel, missing: true });
    }
  }

  /* The instructor documents are print register in every theme, so they are
     measured separately. The demo cohort has deterministic ids, which is what
     makes this reachable from a script without an API key. */
  for (const theme of ['paper', 'slate']) {
    await page.goto(`${BASE}/#/class`, { waitUntil: 'networkidle0' });
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await new Promise((r) => setTimeout(r, 300));
    const loaded = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')]
        .find((x) => /demo|演示班级|示例班级/i.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    });
    if (!loaded) { rows.push({ theme: `${theme}/doc`, label: 'demo cohort', sel: 'button[demo]', missing: true }); continue; }
    await new Promise((r) => setTimeout(r, 700));

    for (const [hash, labels] of [
      ['#/class/cohort_demo/s/sub_nur-antepartum', DOC_SAMPLES],
      ['#/class/cohort_demo/reteach', [['reteach subtitle', '.doc .t-small.ink-2'], ['reteach micro', '.doc .t-micro']]],
    ]) {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle0' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await new Promise((r) => setTimeout(r, 450));
      for (const [label, sel] of labels) {
        const r = await page.evaluate(MEASURE, sel, false);
        if (r) rows.push({ theme: `${theme}/doc`, label, sel, ...r });
        else rows.push({ theme: `${theme}/doc`, label, sel, missing: true });
      }
    }
  }

  await browser.close();

  const fails = [];
  const missing = [];
  for (const r of rows) {
    if (r.missing) { missing.push(`${r.theme}/${r.label} (${r.sel})`); continue; }
    // WCAG AA: 3:1 for large text (>=18.66px bold, or >=24px), else 4.5:1.
    const large = r.size >= 24 || (r.size >= 18.66 && r.weight >= 700);
    const need = large ? 3 : 4.5;
    const ok = r.ratio >= need;
    console.log(`  ${ok ? '✓' : '✗'} ${r.theme.padEnd(11)} ${r.label.padEnd(24)} ${r.ratio.toFixed(2)}:1 (needs ${need}, ${r.layers} bg layer${r.layers === 1 ? '' : 's'})`);
    if (!ok) fails.push(`${r.theme}/${r.label} at ${r.ratio.toFixed(2)}:1, needs ${need}`);
  }

  /* A selector that no longer matches is a SILENT loss of coverage — exactly
     how v2's gate came to be measuring nothing that mattered. */
  if (missing.length) {
    console.error(`\nverify-contrast: ${missing.length} sampled selector(s) matched nothing:`);
    missing.forEach((m) => console.error('  ✗ ' + m));
  }
  if (fails.length) {
    console.error(`\nverify-contrast: ${fails.length} below AA`);
    fails.forEach((f) => console.error('  ✗ ' + f));
  }
  if (fails.length || missing.length) process.exit(1);

  const docRows = rows.filter((r) => r.theme.endsWith('/doc')).length;
  if (!docRows) {
    console.error('\nverify-contrast: the instructor documents were never reached — coverage claim would be false.');
    process.exit(1);
  }
  console.log(`\nverify-contrast: ${rows.length} samples — 2 student app themes plus ${docRows} on the print register — all meet WCAG AA ✓`);
})().catch((e) => { console.error('crashed:', e.message); process.exit(1); });
