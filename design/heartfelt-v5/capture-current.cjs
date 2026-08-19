const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const puppeteer = require('puppeteer-core');

const root = process.cwd();
const out = join(root, 'artifacts', 'heartfelt-v5');
mkdirSync(out, { recursive: true });
const port = 6197;
const server = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', (chunk) => { log += chunk.toString(); });
server.stderr.on('data', (chunk) => { log += chunk.toString(); });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/`); if (response.ok) return; } catch {}
    await wait(100);
  }
  throw new Error(`Vite did not start\n${log}`);
}

(async () => {
  let browser;
  const errors = [];
  try {
    await ready();
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--lang=zh-CN'] });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'language', { get: () => 'zh-CN' });
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] });
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="welcome-screen"]');
    await page.screenshot({ path: join(out, '01-welcome.png') });

    await page.click('.welcome-v5-top > button');
    await page.waitForSelector('[data-testid="bring-screen"]');
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForSelector('[data-testid="today-screen"]');
    await page.screenshot({ path: join(out, '02-today-first.png') });

    await page.evaluate(() => { location.hash = '#/welcome'; });
    await page.waitForSelector('[data-testid="welcome-screen"]');
    await page.click('.welcome-primary');
    await wait(180);
    await page.screenshot({ path: join(out, '03-welcome-question.png') });
    await page.click('.welcome-primary');
    await page.waitForSelector('[data-testid="run-screen"]');
    await page.screenshot({ path: join(out, '04-run.png') });

    await page.type('.v5-answer-input', 'I chose it because dispersion is estimated across biological replicates, not because it is more popular.');
    await page.click('.v5-send');
    await page.waitForSelector('.v5-self-read');
    await page.screenshot({ path: join(out, '05-self-read.png') });
    await page.click('.v5-self-options button:nth-child(2)');
    await page.waitForSelector('.v5-manual-mark');
    await page.click('.manualgrade-opts button:nth-child(2)');
    await page.waitForSelector('.v5-reply-state');
    await page.screenshot({ path: join(out, '06-reply.png') });
    await page.click('.v5-reply-state .btn-primary');
    await page.waitForSelector('[data-testid="result-screen"]');
    await page.screenshot({ path: join(out, '07-result.png') });

    await page.evaluate(() => { location.hash = '#/bring'; });
    await page.waitForSelector('[data-testid="bring-screen"]');
    await page.screenshot({ path: join(out, '08-bring.png') });

    const seeded = await page.evaluate(async () => {
      const storeModule = await import('/src/store/index.ts');
      const sampleModule = await import('/src/samples/index.ts');
      const sessionOps = await import('/src/lib/session-ops.ts');
      const worked = sampleModule.buildWorkedSession(sampleModule.SAMPLES[1]);
      const at = Date.now();
      const real = {
        ...worked,
        id: `visual_real_${at}`,
        title: 'Course-prerequisite graph',
        sampleId: undefined,
        mode: 'viva',
        occasion: 'review',
        occasionAt: at + 6 * 86400000,
        probes: worked.probes.map((probe, index) => ({ ...probe, answer: [
          'A prerequisite cycle means there is no valid topological order, so the course plan cannot be completed as stated.',
          'I used a depth-first search because the recursion stack distinguishes an active dependency from one already finished.',
          'The complexity is linear in courses plus prerequisite edges because each vertex and edge is visited once.',
          'I would construct a case with a disconnected component and a self-loop, then check both the boolean result and visited state.',
        ][index] || 'I would trace the invariant through one small counterexample.' })),
      };
      storeModule.useStore.getState().upsertSession(real);
      storeModule.useStore.getState().setUi({ lastSessionId: real.id });
      storeModule.useStore.getState().addTargets(sessionOps.targetsFromSession(real).map((target) => ({ ...target, dueAt: at - 1 })));
      const demo = sampleModule.buildDemoCohort();
      demo.sessions.forEach((session) => storeModule.useStore.getState().upsertSession(session));
      storeModule.useStore.getState().upsertCohort(demo.cohort);
      return { cohortId: demo.cohort.id, submissionId: demo.cohort.submissions[0].id };
    });

    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForSelector('[data-testid="today-screen"]');
    await page.screenshot({ path: join(out, '09-today-returning.png') });
    await page.evaluate(() => { location.hash = '#/work'; });
    await page.waitForSelector('[data-testid="work-screen"]');
    await page.screenshot({ path: join(out, '10-work.png') });
    await page.evaluate(() => { location.hash = '#/you'; });
    await page.waitForSelector('[data-testid="you-screen"]');
    await page.screenshot({ path: join(out, '11-you.png') });
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForSelector('.settings-v5');
    await page.screenshot({ path: join(out, '12-settings.png') });
    await page.evaluate(() => { location.hash = '#/followups'; });
    await page.waitForSelector('[data-testid="followups-screen"]');
    await page.screenshot({ path: join(out, '13-followup-door.png') });
    await page.click('.followup-card-v5 .btn-primary');
    await page.waitForSelector('.followup-run-v5');
    await page.screenshot({ path: join(out, '14-followup-question.png') });
    await page.evaluate(({ cohortId, submissionId }) => { location.hash = `#/class/${cohortId}/s/${submissionId}`; }, seeded);
    await page.waitForSelector('.doc');
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.screenshot({ path: join(out, '15-teacher-sheet.png') });

    console.log(JSON.stringify({ out, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    await wait(150);
  }
})().catch((error) => { console.error(error); server.kill('SIGTERM'); process.exit(1); });
