/** WCAG contrast on real v4 surfaces in paper + slate, without a shipped component gallery. */
const puppeteer = require('puppeteer-core');
const { mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP = process.env.APP_URL || process.env.BASE_URL || 'http://127.0.0.1:4173/';
const profile = mkdtempSync(join(tmpdir(), 'irk-contrast-'));
const failures = [];

const MEASURE = (selector) => {
  const element = document.querySelector(selector);
  if (!element) return null;
  const parse = (color) => {
    const parts = (color.match(/[\d.]+/g) || []).map(Number);
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
  };
  const composite = (front, back, alpha) => front.map((value, index) => value * alpha + back[index] * (1 - alpha));
  const luminance = (rgb) => {
    const linear = rgb.map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const layers = [];
  let node = element;
  while (node) {
    const computed = getComputedStyle(node);
    const imageColor = computed.backgroundImage.match(/rgba?\([^)]+\)/)?.[0];
    if (imageColor) {
      const gradient = parse(imageColor);
      if (gradient.alpha > 0) layers.push(gradient);
    }
    const color = parse(computed.backgroundColor);
    if (color.alpha > 0) layers.push(color);
    if (color.alpha === 1) break;
    node = node.parentElement;
  }
  let background = parse(getComputedStyle(document.body).backgroundColor).rgb;
  for (let index = layers.length - 1; index >= 0; index -= 1) background = composite(layers[index].rgb, background, layers[index].alpha);
  const style = getComputedStyle(element);
  const foregroundParts = parse(style.color);
  const foreground = foregroundParts.alpha < 1 ? composite(foregroundParts.rgb, background, foregroundParts.alpha) : foregroundParts.rgb;
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return { ratio: (values[0] + 0.05) / (values[1] + 0.05), size: parseFloat(style.fontSize), weight: Number(style.fontWeight) || 400, fg: style.color, bg: `rgb(${background.map((v) => Math.round(v)).join(', ')})` };
};

const SETTLE = async (page) => {
  // Measure the settled frame. Entrance animations are still running right after
  // navigation, and sampling mid-flight reports a colour the user never sees —
  // which is how this gate produced a different ratio on every run.
  await page.evaluate(async () => {
    const running = document.getAnimations().map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(running), new Promise((r) => setTimeout(r, 2000))]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
};

async function measureSet(page, theme, surface, samples, rows) {
  await SETTLE(page);
  for (const [label, selector] of samples) {
    const result = await page.evaluate(MEASURE, selector);
    if (!result) {
      failures.push(`${theme}/${surface}: selector ${selector} matched nothing`);
      continue;
    }
    const large = result.size >= 24 || (result.size >= 18.66 && result.weight >= 700);
    const required = large ? 3 : 4.5;
    const ok = result.ratio >= required;
    rows.push({ theme, surface, label, ratio: result.ratio, required });
    if (!ok) failures.push(`${theme}/${surface}/${label}: ${result.ratio.toFixed(2)}:1, needs ${required}:1 (fg ${result.fg} on bg ${result.bg})`);
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args: ['--lang=en-US'] });
  const rows = [];
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'language', { get: () => 'en-US' }));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const theme of ['paper', 'slate']) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme === 'slate' ? 'dark' : 'light' }]);
      await page.goto(`${APP}#/welcome`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('[data-testid="welcome-screen"]');
      await page.waitForFunction((expected) => document.documentElement.dataset.theme === expected, {}, theme);
      await measureSet(page, theme, 'welcome', [
        ['sentence', '.welcome-copy .t-sentence'],
        ['body', '.welcome-copy .t-body-lg'],
        ['source label', '.welcome-paper .t-micro'],
        ['source excerpt', '.welcome-paper p'],
        ['skip action', '.welcome-topbar button'],
        ['primary action', '.welcome-actions .btn-primary'],
      ], rows);

      await page.evaluate(() => {
        document.querySelector('#contrast-fixtures')?.remove();
        const fixture = document.createElement('div');
        fixture.id = 'contrast-fixtures';
        fixture.style.cssText = 'position:fixed;left:0;top:0;padding:16px;background:var(--app);display:grid;gap:4px;z-index:-1';
        fixture.innerHTML = `
          <span class="ink-held">Held</span><span class="ink-half-held">Half-held</span>
          <span class="ink-slipped">Slipped</span><span class="ink-held-more">Steadier</span>
          <span class="ink-accent">Action link</span><span class="ink-2">Secondary</span><span class="ink-3">Tertiary</span>
          <span class="bg-held">Held wash</span><span class="bg-half-held">Half wash</span>
          <span class="bg-slipped">Slipped wash</span><span class="bg-held-more">Steadier wash</span>`;
        document.body.appendChild(fixture);
      });
      await measureSet(page, theme, 'state-tokens', [
        ['held', '#contrast-fixtures .ink-held'], ['half-held', '#contrast-fixtures .ink-half-held'],
        ['slipped', '#contrast-fixtures .ink-slipped'], ['steadier', '#contrast-fixtures .ink-held-more'],
        ['action', '#contrast-fixtures .ink-accent'], ['secondary', '#contrast-fixtures .ink-2'], ['tertiary', '#contrast-fixtures .ink-3'],
        ['held wash', '#contrast-fixtures .bg-held'], ['half wash', '#contrast-fixtures .bg-half-held'],
        ['slipped wash', '#contrast-fixtures .bg-slipped'], ['steadier wash', '#contrast-fixtures .bg-held-more'],
      ], rows);
    }

    // Print-register document remains readable regardless of the surrounding app theme.
    await page.setViewport({ width: 1440, height: 1000, isMobile: false, hasTouch: false });
    await page.goto(`${APP}#/class`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Load a demo cohort')).click());
    await page.waitForSelector('.teacher-list');
    for (const theme of ['paper', 'slate']) {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme === 'slate' ? 'dark' : 'light' }]);
      await page.goto(`${APP}#/class/cohort_demo/s/sub_nur-antepartum`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('article.doc');
      await page.waitForFunction((expected) => document.documentElement.dataset.theme === expected, {}, theme);
      await measureSet(page, theme, 'evidence-document', [
        ['document body', '.doc'], ['document secondary', '.doc .ink-2'], ['micro label', '.doc .t-micro'],
        ['source quote', '.doc-quote'], ['slipped status', '.doc .ink-undefended'],
      ], rows);
    }

    for (const row of rows) console.log(`  ✓ ${row.theme.padEnd(5)} ${row.surface.padEnd(18)} ${row.label.padEnd(16)} ${row.ratio.toFixed(2)}:1`);
    console.log(`verify-contrast: ${rows.length} rendered samples across both themes and the teacher document`);
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
  console.log('verify-contrast: every sampled v4 surface meets WCAG AA ✓');
})();
