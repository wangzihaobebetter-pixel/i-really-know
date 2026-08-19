const puppeteer = require('puppeteer-core');
const { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS = join(process.cwd(), 'artifacts', 'e2e');
const DOWNLOADS = join(ARTIFACTS, 'downloads');
rmSync(DOWNLOADS, { recursive: true, force: true });
mkdirSync(DOWNLOADS, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'irk-e2e-'));
const failures = [];
const evidence = {};

function check(condition, message) {
  if (!condition) failures.push(message);
}
async function text(page) { return page.evaluate(() => document.body.innerText); }
async function clickText(page, needle, selector = 'button') {
  const clicked = await page.evaluate(({ needle, selector }) => {
    const target = [...document.querySelectorAll(selector)].find((el) => (el.textContent || '').trim().includes(needle));
    if (!target) return false;
    target.click();
    return true;
  }, { needle, selector });
  if (!clicked) throw new Error(`Could not find ${selector} containing “${needle}”`);
}
async function setNth(page, selector, index, value) {
  await page.evaluate(({ selector, index, value }) => {
    const input = document.querySelectorAll(selector)[index];
    if (!input) throw new Error(`Missing ${selector}[${index}]`);
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, index, value });
}
async function shot(page, name, fullPage = false) {
  // Let the 160–260 ms page/sheet transitions settle before taking visual evidence.
  await new Promise((resolve) => setTimeout(resolve, 320));
  const path = join(ARTIFACTS, name);
  await page.screenshot({ path, fullPage });
  return path;
}
async function forceEnglish(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US'] });
  });
}
async function waitForDownload(previous, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const files = readdirSync(DOWNLOADS).filter((name) => name.endsWith('.pdf') && !name.endsWith('.crdownload'));
    const fresh = files.find((name) => !previous.includes(name));
    if (fresh) return join(DOWNLOADS, fresh);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--lang=en-US'],
  });
  const pageErrors = [];
  try {
    const page = await browser.newPage();
    await forceEnglish(page);
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('[data-testid="welcome-screen"]', { timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);
    evidence.welcome = await shot(page, '01-mobile-welcome.png');
    const welcomeText = await text(page);
    check(welcomeText.includes('Hear the question here'), 'cold start did not state the value proposition');
    check((await page.$$('.welcome-primary')).length === 1, 'cold start did not expose one primary action');

    await clickText(page, 'Find the hard question');
    await page.waitForFunction(() => document.body.innerText.includes('The answer is not sitting in the excerpt'));
    check((await text(page)).includes('Not answerable by copying'), 'welcome did not demonstrate the non-copyable mechanism');
    await clickText(page, 'Try this one question');
    await page.waitForSelector('[data-testid="run-screen"]', { timeout: 10000 });
    evidence.question = await shot(page, '02-mobile-question.png');
    check((await page.$$('.run-question')).length === 1, 'run-through showed more or fewer than one question');

    const answer = 'I would check whether the stated association survives adjustment for the variables that could affect both exposure and outcome, then compare the estimate and uncertainty rather than treating the raw pattern as causal.';
    await page.type('#run-answer', answer);
    await page.click('.v5-send');
    await page.waitForSelector('.v5-self-options');
    evidence.selfgrade = await shot(page, '03-mobile-selfgrade.png');
    check(!(await text(page)).includes('Something you said, and stood behind'), 'judgment appeared before self-read');
    await clickText(page, 'Not sure');
    await page.waitForSelector('.manualgrade-opts');
    await clickText(page, 'It held');
    await page.waitForSelector('.v5-reply-line');
    check((await page.$$('.v5-reply-line')).length === 1, 'answer did not receive exactly one immediate line');
    await clickText(page, 'See what you can take with you');
    await page.waitForSelector('[data-testid="result-screen"]');
    evidence.result = await shot(page, '04-mobile-result.png');
    const resultText = await text(page);
    check((await page.$$('.held-voice-card')).length === 1, 'underclaim did not preserve the student’s held words as the lead object');
    check(resultText.includes('Your page, marked'), 'marked original page is missing');
    check(resultText.includes('That is enough for this run-through'), 'result has no structural ending');

    await page.click('.result-all-v5 > summary');
    const headings = await page.$$eval('.result-group-heading', (elements) => elements.map((element) => getComputedStyle(element).fontSize));
    check(headings.length >= 1 && new Set(headings).size === 1, 'result outcome headings are not equal-size');
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    evidence.resultEnd = await shot(page, '04b-mobile-result-ending.png');

    await clickText(page, 'Put it down for now');
    await page.waitForSelector('[data-testid="today-screen"]');
    evidence.today = await shot(page, '05-mobile-today.png');

    // No-key submission of a real artifact from this repository: it must end in a transparent choice, not a dead end.
    await page.evaluate(() => { location.hash = '#/bring'; });
    await page.waitForSelector('[data-testid="bring-screen"]');
    await page.$$eval('.occasion-row button', (buttons) => buttons[buttons.length - 1].click());
    await setNth(page, 'input.control:not([type="date"])', 0, 'Pull request code review');
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await setNth(page, 'input[type="date"]', 0, tomorrow);
    await setNth(page, 'input.control:not([type="date"])', 1, 'Spaced-return scheduler');
    const realSource = readFileSync(join(process.cwd(), 'src/lib/session-ops.ts'), 'utf8');
    const realMaterial = realSource.slice(realSource.indexOf('export function gradeTarget'), realSource.indexOf('export function probeForTarget'));
    check(realMaterial.includes('gradeTarget'), 'QA could not load the real repository artifact');
    await setNth(page, '#bring-material', 0, realMaterial);
    await clickText(page, 'Read it');
    await page.waitForSelector('[role="dialog"]');
    evidence.noKey = await shot(page, '06-mobile-no-key-choice.png');
    const noKeyText = await text(page);
    check(noKeyText.includes('The key stays on this device'), 'no-key choice did not explain local key handling');
    check(noKeyText.includes('Use the real example instead'), 'no-key choice had no value-preserving path');

    // Teacher half at desktop width, including CSV, self-contained link and both PDFs.
    const teacher = await browser.newPage();
    await forceEnglish(teacher);
    teacher.on('pageerror', (error) => pageErrors.push(error.message));
    await teacher.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    const client = await teacher.createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS });
    await teacher.goto(`${BASE}#/class`, { waitUntil: 'networkidle0', timeout: 30000 });
    await clickText(teacher, 'Load a demo cohort');
    await teacher.waitForFunction(() => location.hash.startsWith('#/class/') && document.querySelectorAll('.teacher-row').length >= 3);
    evidence.cohort = await shot(teacher, '07-desktop-cohort.png', true);
    check((await teacher.$$('nav')).length === 0, 'student navigation leaked into the independent instructor workspace');

    const csvPath = join(profile, 'qa-roster.csv');
    writeFileSync(csvPath, `name,student_id,title,material\nQA Student,QA-001,Real scheduler code,"${realMaterial.replaceAll('"', '""').replaceAll('\n', ' ')}"\n`);
    const csvInput = await teacher.$('input[type="file"]');
    await csvInput.uploadFile(csvPath);
    await teacher.waitForFunction(() => document.querySelectorAll('.teacher-row').length >= 4);
    check((await teacher.$$('.teacher-row')).length >= 4, 'CSV roster import did not add the submission');

    await clickText(teacher, 'Copy student link');
    await teacher.waitForSelector('.share-fallback textarea');
    const shareLink = await teacher.$eval('.share-fallback textarea', (el) => el.value);
    check(shareLink.includes('#/join/'), 'student link is not self-contained');
    const joinPage = await browser.newPage();
    await forceEnglish(joinPage);
    await joinPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await joinPage.goto(shareLink, { waitUntil: 'networkidle0', timeout: 30000 });
    await joinPage.waitForSelector('[data-testid="join-screen"]');
    check((await text(joinPage)).includes('These questions are ready for you'), 'student share link did not open independently');
    await joinPage.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Save it here and begin'));
      return button && !button.disabled;
    });
    await clickText(joinPage, 'Save it here and begin');
    await joinPage.waitForSelector('[data-testid="run-screen"]');
    const returnedCount = (await joinPage.$$('.v5-run-progress span')).length;
    for (let index = 0; index < returnedCount; index += 1) {
      await joinPage.waitForSelector('#run-answer');
      await joinPage.type('#run-answer', `Student answer for returned question ${index + 1}: I would name the choice, trace the mechanism, and check the boundary case.`);
      await joinPage.click('.v5-send');
      await joinPage.waitForSelector('.v5-self-options');
      await clickText(joinPage, 'Not sure');
      await joinPage.waitForSelector('.manualgrade-opts');
      await clickText(joinPage, index === 0 ? 'It slipped' : 'It held');
      await joinPage.waitForSelector('.v5-reply-line');
      await clickText(joinPage, index === returnedCount - 1 ? 'See what you can take with you' : 'Next question');
    }
    await joinPage.waitForSelector('[data-testid="result-screen"]');
    await clickText(joinPage, 'Copy the result link');
    await joinPage.waitForSelector('.return-result-card textarea');
    const returnLink = await joinPage.$eval('.return-result-card textarea', (element) => element.value);
    check(returnLink.includes('#/return/'), 'student result did not create a self-contained return link');
    await joinPage.close();

    await teacher.goto(returnLink, { waitUntil: 'networkidle0', timeout: 30000 });
    await teacher.waitForSelector('[data-testid="return-screen"]');
    await teacher.waitForFunction(() => document.querySelectorAll('.toast').length === 0, { timeout: 8000 });
    evidence.returnImport = await shot(teacher, '08-desktop-return-import.png');
    await clickText(teacher, 'Import as unverified evidence and review');
    await teacher.waitForSelector('article.doc');
    check((await text(teacher)).includes('Student answer for returned question 1'), 'returned student words did not reach the local evidence sheet');
    check((await text(teacher)).includes('not authenticated'), 'returned result was not clearly marked unverified');
    await clickText(teacher, 'I reviewed these answers');
    await teacher.waitForFunction(() => document.body.innerText.includes('Returned link reviewed by the instructor'));
    await teacher.waitForFunction(() => document.querySelectorAll('.toast').length === 0, { timeout: 8000 });
    check((await teacher.$$('article.doc input, article.doc textarea, article.doc select')).length === 0, 'evidence document contains live form controls');
    evidence.sheet = await shot(teacher, '09-desktop-evidence-sheet.png');
    const beforeSheet = readdirSync(DOWNLOADS);
    await clickText(teacher, 'Download PDF');
    const sheetPdf = await waitForDownload(beforeSheet);
    check(Boolean(sheetPdf), 'evidence sheet PDF did not download');
    evidence.sheetPdf = sheetPdf;

    await teacher.evaluate(() => { location.hash = '#/class/cohort_demo'; });
    await teacher.waitForSelector('.teacher-list');
    await clickText(teacher, 'Reteach map');
    await teacher.waitForSelector('article.doc');
    check((await teacher.$$('article.doc input, article.doc textarea, article.doc select')).length === 0, 'reteach document contains live form controls');
    evidence.reteach = await shot(teacher, '10-desktop-reteach-map.png');
    check((await teacher.$$('.concept-row')).length > 0, 'reteach map did not aggregate concepts');
    const beforeMap = readdirSync(DOWNLOADS);
    await clickText(teacher, 'Download PDF');
    const mapPdf = await waitForDownload(beforeMap);
    check(Boolean(mapPdf), 'reteach-map PDF did not download');
    evidence.mapPdf = mapPdf;

    // Full emitted-asset precache: visit once, then load an unvisited lazy route offline.
    const offline = await browser.newPage();
    await forceEnglish(offline);
    await offline.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await offline.goto(`${BASE}#/welcome`, { waitUntil: 'networkidle0', timeout: 30000 });
    const cacheKeys = await offline.evaluate(async () => { await navigator.serviceWorker.ready; return caches.keys(); });
    check(cacheKeys.some((key) => /^irk-[a-f0-9]{12}$/.test(key)), 'versioned service worker cache did not install');
    await offline.setOfflineMode(true);
    await offline.evaluate(() => { location.hash = '#/settings'; });
    await offline.waitForFunction(() => document.body.innerText.includes('Settings'), { timeout: 10000 });
    evidence.offline = await shot(offline, '11-mobile-offline-settings.png');
    check((await text(offline)).includes('Model provider'), 'an unvisited lazy route did not work offline');
    await offline.setOfflineMode(false);

    evidence.viewport = await page.evaluate(() => ({ innerWidth, outerWidth, scrollWidth: document.documentElement.scrollWidth }));
    check(evidence.viewport.innerWidth === 390, `mobile viewport measured ${evidence.viewport.innerWidth}, not 390`);
    check(evidence.viewport.scrollWidth <= 390, `mobile flow overflowed horizontally to ${evidence.viewport.scrollWidth}px`);
    check(pageErrors.length === 0, `browser page errors: ${pageErrors.join(' | ')}`);
  } catch (error) {
    failures.push(error.stack || error.message);
  } finally {
    await browser.close();
    rmSync(profile, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ base: BASE, evidence, failures }, null, 2));
  if (failures.length) process.exit(1);
  console.log('verify-e2e: cold start, no-key real artifact, 390px flow, teacher docs and offline install passed ✓');
})();
