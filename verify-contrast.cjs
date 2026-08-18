/**
 * Contrast audit on the real rendered page, in all three themes. P3 §2.5.
 *
 * WHY THIS FILE WAS REWRITTEN. The v2 gate was real but narrow, and P3 §0.4
 * verified the specific failure: it sampled six generic text selectors
 * (`.t-body`, `.ink-2`, `.ink-3`, `.sample-card .t-small`, `.t-small.ink-2`,
 * `.field-label`) and NOT ONE STATE COLOUR. Worse, it read
 * `getComputedStyle(node).backgroundColor` and walked up the DOM, while
 * `.anchor-span` set `background-color: transparent` and painted its wash as a
 * `background-image` linear-gradient — so the gate walked straight past the
 * Painted Page to `--sheet`. The AA claim was true for six selectors and
 * SILENT ABOUT EVERY STATE COLOUR IN THE PRODUCT.
 *
 * Three changes, all of them required before any colour work could be called
 * done:
 *
 *  1. Sample the state colours: the hero numeral in each of its three states,
 *     each Axis-A span mark, each Axis-B mark, the instructor evidence sheet
 *     body, and the glass chrome's text.
 *  2. Resolve washes properly. Every wash now ships as a pre-composited opaque
 *     hex (tokens.css), and this gate ALSO composites any remaining
 *     translucent layer and any `background-image` gradient it finds, so it
 *     can no longer be blind to a painted background.
 *  3. Check the third theme. `script` is opt-in, and an opt-in theme that
 *     fails AA is still a shipped theme that fails AA.
 */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';

/** [hash, label, selector, setup?] — setup runs in the page before sampling. */
const SAMPLES = [
  ['#/', 'body text',              '.t-body'],
  ['#/', 'secondary text',         '.ink-2'],
  ['#/', 'tertiary text',          '.ink-3'],
  ['#/', 'card blurb',             '.sample-card .t-small'],
  ['#/', 'hero numeral',           '.divergence-numeral'],
  ['#/', 'hero claim line',        '.divergence-claim'],
  ['#/', 'demo provenance',        '.demo-source'],
  ['#/', 'sample card title',      '.sample-card-title'],
  ['#/packs/cs', 'dimension line', '.t-small.ink-2'],
  ['#/settings', 'field label',    '.field-label'],
  ['#/dev/ui', 'axis A · defended',     '.anchor-defended'],
  ['#/dev/ui', 'axis A · partial',      '.anchor-partial'],
  ['#/dev/ui', 'axis A · undefended',   '.anchor-undefended'],
  ['#/dev/ui', 'axis A · underclaimed', '.anchor-underclaimed'],
  ['#/dev/ui', 'axis A · focused wash', '.anchor-defended.is-active'],
  ['#/dev/ui', 'mark word · defended',     '.ink-defended'],
  ['#/dev/ui', 'mark word · partial',      '.ink-partial'],
  ['#/dev/ui', 'mark word · undefended',   '.ink-undefended'],
  ['#/dev/ui', 'mark word · underclaimed', '.ink-underclaimed'],
  ['#/dev/ui', 'axis B · over',  '.ink-over'],
  ['#/dev/ui', 'axis B · under', '.ink-under'],
  ['#/dev/ui', 'glass chrome text', '.glass .t-small'],
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
  for (const theme of ['paper', 'slate', 'script']) {
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
  console.log(`\nverify-contrast: ${rows.length} samples — 3 app themes plus ${docRows} on the print register — all meet WCAG AA ✓`);
})().catch((e) => { console.error('crashed:', e.message); process.exit(1); });
