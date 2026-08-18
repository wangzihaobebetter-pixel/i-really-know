/**
 * Contrast audit on the real rendered page, both themes. The palette is meant
 * to be quiet, and quiet palettes are exactly where body text drifts under 4.5:1.
 */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';

const SAMPLES = [
  ['#/', 'body text', '.t-body'],
  ['#/', 'secondary text', '.ink-2'],
  ['#/', 'tertiary text', '.ink-3'],
  ['#/', 'card blurb', '.sample-card .t-small'],
  ['#/packs/cs', 'dimension one-liner', '.t-small.ink-2'],
  ['#/settings', 'field label', '.field-label'],
];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const rows = [];
  for (const theme of ['paper', 'slate']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme === 'paper' ? 'light' : 'dark' }]);
    for (const [hash, label, sel] of SAMPLES) {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle0' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await new Promise((r) => setTimeout(r, 200));
      const r = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const lum = (rgb) => {
          const [r, g, b] = rgb.map((v) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const fg = parse(getComputedStyle(el).color);
        let node = el, bg = null;
        while (node && !bg) {
          const c = getComputedStyle(node).backgroundColor;
          if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) bg = parse(c);
          node = node.parentElement;
        }
        if (!bg) bg = parse(getComputedStyle(document.body).backgroundColor);
        const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        const size = parseFloat(getComputedStyle(el).fontSize);
        const weight = Number(getComputedStyle(el).fontWeight) || 400;
        return { ratio: (l1 + 0.05) / (l2 + 0.05), size, weight };
      }, sel);
      if (r) rows.push({ theme, label, ...r });
    }
  }
  await browser.close();

  const fails = [];
  for (const r of rows) {
    // WCAG AA: 3:1 for large text (>=18.66px bold, or >=24px), else 4.5:1.
    const large = r.size >= 24 || (r.size >= 18.66 && r.weight >= 700);
    const need = large ? 3 : 4.5;
    const ok = r.ratio >= need;
    console.log(`  ${ok ? '✓' : '✗'} ${r.theme.padEnd(6)} ${r.label.padEnd(22)} ${r.ratio.toFixed(2)}:1 (needs ${need})`);
    if (!ok) fails.push(`${r.theme}/${r.label} at ${r.ratio.toFixed(2)}:1, needs ${need}`);
  }
  if (fails.length) {
    console.error(`\nverify-contrast: ${fails.length} below AA`);
    process.exit(1);
  }
  console.log('\nverify-contrast: all sampled text meets WCAG AA ✓');
})().catch((e) => { console.error('crashed:', e.message); process.exit(1); });
