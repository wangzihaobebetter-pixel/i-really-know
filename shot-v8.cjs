/**
 * v8 · the rehearsal repositioning, captured.
 *
 * VERDICT.md (2026-08-25) §3.2 ③ changed what this product says it is: not
 * "verify / prove", but a rehearsal you run on yourself before the room. That
 * is a claim about two screens — the first one and the result — so those two
 * screens are what this captures, in both languages and at both viewports.
 *
 * The result is captured in BOTH outcomes on purpose. The repositioned
 * headline is supposed to tell a person what they can see for themselves
 * ("one place did not come out clearly"), so a capture of only the happy path
 * would not show the sentence that actually changed.
 *
 * It is a capture script, not a gate: it asserts nothing and fails only if a
 * screen refuses to render. Per VERDICT §3.3 row 4 no new verify-*.mjs may be
 * added, and this is not one.
 *
 * Usage:
 *   node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 &
 *   APP_URL=http://127.0.0.1:4176/ node shot-v8.cjs
 */
const puppeteer = require('puppeteer-core');
const { mkdtempSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const BASE = process.env.APP_URL || 'http://127.0.0.1:4176/';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.SHOT_DIR || join('design', 'v8-rehearsal');

const VIEWPORTS = [
  { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { id: 'desktop', width: 1440, height: 900, deviceScaleFactor: 2 },
];
const LANGS = [
  {
    id: 'en', tag: 'en-US',
    find: 'Find the hard question', try_: 'Try this one question',
    selfRead: 'Not sure', finish: 'See what you can take with you',
    marks: { slipped: 'It slipped', held: 'It held' },
    answer: 'I would check whether the stated association survives adjustment for the variables that could affect both exposure and outcome, then compare the estimate and uncertainty rather than treating the raw pattern as causal.',
  },
  {
    id: 'zh', tag: 'zh-CN',
    find: '找出藏在里面的难问', try_: '自己试这一问',
    selfRead: '不好说', finish: '看看这次能带走什么',
    marks: { slipped: '没站住', held: '站住了' },
    answer: '我会先看这个关联在把同时影响暴露和结局的变量调整掉之后还站不站得住，然后比较估计值和不确定度，而不是把原始的相关直接当成因果。',
  },
];

async function clickText(page, needle, selector = 'button') {
  const ok = await page.evaluate(({ needle, selector }) => {
    const target = [...document.querySelectorAll(selector)].find((el) => (el.textContent || '').trim() === needle)
      || [...document.querySelectorAll(selector)].find((el) => (el.textContent || '').trim().includes(needle));
    if (!target) return false;
    target.click();
    return true;
  }, { needle, selector });
  if (!ok) throw new Error(`Could not find ${selector} containing “${needle}”`);
}

/** Let the page-turn / stagger animations finish, or the capture is a ghost. */
async function settle(page) {
  await page.evaluate(async () => {
    const running = document.getAnimations().map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(running), new Promise((r) => setTimeout(r, 2500))]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function shot(page, name) {
  await settle(page);
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: true });
  console.log(`  ${path}`);
  return path;
}

/** Welcome → one question → self-read → manual mark → result. */
async function walkToResult(page, lang, mark) {
  await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
  await clickText(page, lang.find);
  await clickText(page, lang.try_);
  await page.waitForSelector('[data-testid="run-prime"]', { timeout: 10000 });
  await page.click('[data-testid="run-prime-go"]');
  await page.waitForSelector('[data-testid="run-screen"]', { timeout: 10000 });
  await page.type('#run-answer', lang.answer);
  await page.click('.v5-send');
  await page.waitForSelector('.v5-self-options');
  await clickText(page, lang.selfRead);
  await page.waitForSelector('.manualgrade-opts');
  await clickText(page, lang.marks[mark], '.manualgrade-opts button');
  await page.waitForSelector('.v5-reply-line');
  await clickText(page, lang.finish);
  await page.waitForSelector('[data-testid="result-screen"]', { timeout: 10000 });
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  const taken = [];
  /*
   * One fresh browser profile per capture. The store persists to IndexedDB
   * (`createJSONStorage(() => idbStorage)`), so clearing localStorage between
   * walks does NOT restore a first open — the app keeps `firstOpenSeen` and
   * lands on Today instead of the welcome screen. A new user-data dir is the
   * only reset that is actually a reset.
   */
  const TARGETS = ['first', 'slipped', 'held'];
  for (const lang of LANGS) {
    for (const view of VIEWPORTS) {
      for (const target of TARGETS) {
        const profile = mkdtempSync(join(tmpdir(), 'irk-v8-'));
        const browser = await puppeteer.launch({
          executablePath: CHROME,
          headless: true,
          userDataDir: profile,
          args: ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--lang=${lang.tag}`],
        });
        try {
          const page = await browser.newPage();
          await page.evaluateOnNewDocument((tag) => {
            Object.defineProperty(navigator, 'language', { get: () => tag });
            Object.defineProperty(navigator, 'languages', { get: () => [tag] });
          }, lang.tag);
          await page.setViewport(view);
          await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
          await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
          await page.evaluate(() => document.fonts.ready);
          if (target === 'first') {
            taken.push(await shot(page, `01-first-screen-${lang.id}-${view.id}.png`));
          } else {
            await walkToResult(page, lang, target);
            taken.push(await shot(page, `02-result-${target}-${lang.id}-${view.id}.png`));
          }
        } finally {
          await browser.close();
        }
      }
    }
  }
  console.log(`shot-v8: ${taken.length} captures in ${OUT}`);
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
