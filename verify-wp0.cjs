/**
 * WP0 acceptance harness (spec §8 "Verify" column).
 * Real device metrics via puppeteer-core + system Chrome — headless --screenshot
 * has no device metrics and produces false "no overflow" results.
 */
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.IRK_URL || 'http://localhost:4174/';        // production build (vite preview)
const DEV_URL = process.env.IRK_DEV_URL || 'http://localhost:4176/'; // dev server, for the dev-only gallery
const SHOTS = 'verify-shots';

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  if (!ok) failed++;
};

const ROUTES = ['#/', '#/queue', '#/record', '#/class', '#/packs', '#/settings', '#/nope'];

async function visit(page, hash, base = URL) {
  await page.goto(base + hash, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 450));
}

async function run(browser, { width, height, isMobile, label, theme }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile, hasTouch: isMobile, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme === 'slate' ? 'dark' : 'light' }]);

  for (const hash of ROUTES) {
    await visit(page, hash);
    const info = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      theme: document.documentElement.dataset.theme,
      hasMain: !!document.querySelector('main'),
      navCount: document.querySelectorAll('nav a').length,
      bodyText: (document.body.innerText || '').slice(0, 60),
      paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
    }));
    const tag = `${label}/${theme} ${hash}`;
    check(`${tag} no horizontal overflow`, info.scrollWidth <= info.clientWidth, `${info.scrollWidth} vs ${info.clientWidth}`);
    check(`${tag} rendered content`, info.hasMain && info.bodyText.trim().length > 0, info.bodyText.replace(/\n/g, ' '));
    check(`${tag} theme applied`, info.theme === theme, `${info.theme} paper=${info.paper}`);
    check(`${tag} nav present`, info.navCount >= 5, `${info.navCount} links`);
  }

  // The primitive gallery is dev-only by design (§8) — check it on the dev server.
  await visit(page, '#/dev/ui', DEV_URL);
  const gallery = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    marks: document.querySelectorAll('.mark').length,
    pips: document.querySelectorAll('.pips').length,
    heading: (document.querySelector('h1') || {}).textContent || '',
  }));
  check(`${label}/${theme} gallery renders`, gallery.heading.includes('Primitive'), gallery.heading);
  check(`${label}/${theme} gallery no overflow`, gallery.scrollWidth <= gallery.clientWidth, `${gallery.scrollWidth} vs ${gallery.clientWidth}`);
  check(`${label}/${theme} gallery shows every verdict mark`, gallery.marks >= 5, `${gallery.marks} marks`);
  check(`${label}/${theme} gallery shows score pips`, gallery.pips >= 5, `${gallery.pips} pips`);
  await page.screenshot({ path: `${SHOTS}/gallery-${label}-${theme}.png`, fullPage: true });
  await visit(page, '#/');
  await page.screenshot({ path: `${SHOTS}/home-${label}-${theme}.png`, fullPage: true });
  await page.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  await run(browser, { width: 390, height: 844, isMobile: true, label: 'mobile', theme: 'paper' });
  await run(browser, { width: 390, height: 844, isMobile: true, label: 'mobile', theme: 'slate' });
  await run(browser, { width: 1280, height: 900, isMobile: false, label: 'desktop', theme: 'paper' });
  await run(browser, { width: 1280, height: 900, isMobile: false, label: 'desktop', theme: 'slate' });

  // Store round-trip: settings survive a reload through the IndexedDB adapter.
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await visit(page, '#/settings');
  await page.evaluate(() => localStorage.setItem('irk-ui', JSON.stringify({ theme: 'slate', language: 'en' })));
  await visit(page, '#/');
  const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
  check('pre-paint theme slice honoured on reload', persisted === 'slate', String(persisted));

  // v1 migration against a captured v1 payload — unit test against the real module,
  // loaded from the dev server so there is no compiled-copy drift.
  await visit(page, '#/', DEV_URL);
  const mig = await page.evaluate(async () => {
    localStorage.setItem('ireallyknow-v1', JSON.stringify({
      version: 1,
      state: {
        settings: { apiBase: 'https://api.deepseek.com/v1', apiKey: 'sk-test', model: 'deepseek-chat', count: 8, difficulty: 'spicy' },
        sessions: [{
          id: 'old1', title: 'ML 作业2', material: 'gradient descent notes', createdAt: 1750000000000, model: 'deepseek-chat',
          summary: '你对学习率的理解还停留在表面。',
          questions: [
            { id: 'q1', text: '为什么用线性回归？', point: '方法选择', type: '方法选择', answerKey: '因为关系近似线性', answer: '因为看着像', rating: 'fuzzy' },
            { id: 'q2', text: '学习率过大会怎样？', point: '概念', type: '概念解释', answerKey: '发散', answer: '会震荡', rating: 'real' },
          ],
        }],
      },
    }));
    const m = await import('/src/lib/migrate-v1.ts');
    return m.migrateV1();
  });

  check('v1 migration imported the session', !!mig && mig.count === 1, `count=${mig && mig.count}`);
  const s0 = mig && mig.sessions[0];
  check('v1 migration mapped ratings', !!s0 && s0.probes.length === 2 && s0.probes[0].selfGrade === 'shaky' && s0.probes[1].selfGrade === 'owned',
    s0 ? s0.probes.map((p) => p.selfGrade).join(',') : 'none');
  check('v1 migration mapped question types to dimensions', !!s0 && s0.probes[0].dimensionId === 'method' && s0.probes[1].dimensionId === 'concept',
    s0 ? s0.probes.map((p) => p.dimensionId).join(',') : 'none');
  check('v1 migration marked complete', !!s0 && s0.status === 'complete', s0 && s0.status);
  check('v1 migration carried the summary into a diagnosis', !!s0 && !!s0.diagnosis && s0.diagnosis.headline.length > 0, s0 && s0.diagnosis && s0.diagnosis.headline);
  check('v1 migration mapped difficulty spicy → defense', !!s0 && s0.difficulty === 'defense', s0 && s0.difficulty);
  check('v1 settings inferred the provider', !!mig && mig.settings && mig.settings.provider === 'deepseek', mig && mig.settings && mig.settings.provider);
  check('v1 payload left in place (never deleted)', await page.evaluate(() => !!localStorage.getItem('ireallyknow-v1')));

  // Analysis unit checks — divergence is the product's headline signal.
  const an = await page.evaluate(async () => {
    const a = await import('/src/lib/analysis.ts');
    const mk = (self, score) => ({ id: 'x', dimensionId: 'd', kind: 'concept', anchor: { quote: '', placed: false }, question: '', whyThisProbe: '', reference: { keyPoints: [], ownedLooksLike: '', surfaceLooksLike: '' }, timerSec: 90, difficulty: 'standard', selfGrade: self, ai: score === null ? undefined : { score, verdictLine: '', evidence: { present: [], missing: [] }, parroting: false, confidence: 'med', model: 'm', at: 0 } });
    const material = 'the invariant holds because seen is a superset of the frontier';
    const placed = a.placeAnchor(material, { quote: 'seen   is a superset', placed: false });
    return {
      illusion: a.classifyDivergence(mk('owned', 0)),
      owned: a.classifyDivergence(mk('owned', 3)),
      undersold: a.classifyDivergence(mk('notmine', 3)),
      borrowed: a.classifyDivergence(mk('notmine', 0)),
      unscored: a.classifyDivergence(mk(undefined, null)),
      index: a.ownershipIndex([mk('owned', 3), mk('owned', 0)]),
      calib: a.calibration([mk('owned', 3), mk('owned', 0)]),
      placedOk: placed.placed && material.slice(placed.start, placed.end).replace(/\s+/g, ' ') === 'seen is a superset',
    };
  });
  check('divergence: claimed it, could not defend it → illusion', an.illusion === 'illusion', an.illusion);
  check('divergence: claimed and defended → owned', an.owned === 'owned', an.owned);
  check('divergence: disowned but defended → undersold', an.undersold === 'undersold', an.undersold);
  check('divergence: disowned and undefended → borrowed', an.borrowed === 'borrowed', an.borrowed);
  check('divergence: nothing graded → unscored', an.unscored === 'unscored', an.unscored);
  check('ownership index averages the AI track', an.index === 50, String(an.index));
  check('calibration penalises the gap', an.calib === 50, String(an.calib));
  check('anchor placement survives whitespace drift', an.placedOk === true, String(an.placedOk));

  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})();
