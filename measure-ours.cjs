/** Same probe as measure-refs.cjs, run against our own product after seeding a
 *  real session — so "them vs us" is a number-to-number comparison, not a vibe. */
const puppeteer = require('puppeteer-core');
const { writeFileSync } = require('node:fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:4174';
const OUT = '/Users/zihaowang/.openclaw/workspace/memory/ireallyknow-v7r2/measure';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = require('./probe-shared.cjs');

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(`${BASE}/?ui=off#/`, { waitUntil: 'networkidle0' });
  await wait(1500);
  if (await p.evaluate(() => location.hash.includes('welcome'))) {
    await p.evaluate(() => {
      const s = [...document.querySelectorAll('button')].find((x) => /直接带我自己的来|Bring my own/.test(x.textContent || ''));
      (s || document.querySelector('.welcome-primary')).click();
    });
    await wait(1200);
  }
  await p.goto(`${BASE}/?ui=off#/`, { waitUntil: 'networkidle0' });
  await wait(1200);
  await p.evaluate(() => document.querySelector('.today-specimen, .sample-invitation')?.click());
  await wait(700);
  await p.evaluate(() => document.querySelector('.sample-option')?.click());
  await wait(1400);
  const sid = await p.evaluate(() => (location.hash.match(/#\/(?:read|run)\/([^/?]+)/) || [])[1] || null);
  const out = [];
  for (const [id, hash] of [['ours-today', '#/'], ['ours-run', `#/run/${sid}`], ['ours-work', '#/work'], ['ours-you', '#/you']]) {
    await p.goto(`${BASE}/?ui=off${hash}`, { waitUntil: 'networkidle0' });
    await wait(1500);
    out.push({ id, name: id, url: hash, data: await p.evaluate(PROBE) });
    await p.screenshot({ path: `${OUT}/${id}.png` });
  }
  writeFileSync(`${OUT}/ours.json`, JSON.stringify(out, null, 2));
  for (const r of out) {
    const d = r.data;
    console.log(`\n## ${r.id}  targets ${d.targetCount} h=${d.targetHeight ? [d.targetHeight.min, d.targetHeight.median, d.targetHeight.max].join('/') : '-'}  fixed ${d.fixed.length}`);
    console.log('  TYPE  ' + d.type.slice(0, 5).map((t) => t.k).join(' || '));
    console.log('  FIXED ' + d.fixed.map((f) => `${f.tag} ${f.pos} top${f.top} bot${f.bottom} h${f.h}`).join(' ; '));
    console.log('  BIG   ' + d.biggestTargets.slice(0, 5).map((t) => `"${t.text}" ${t.w}x${t.h}`).join(' | '));
  }
  await b.close();
})();
