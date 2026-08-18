/** P4 verification shots. Usage: node shot-p4.cjs <baseUrl> <outDir> */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.argv[2] || 'http://localhost:4178';
const OUT = process.argv[3] || '.';

const SHOTS = [
  ['home',        '#/',                                          'paper'],
  ['home-dark',   '#/',                                          'slate'],
  ['map',         null,                                          'paper'],
  ['viva',        null,                                          'paper'],
  ['sheet',       '#/class/cohort_demo/s/sub_nur-antepartum',    'paper'],
  ['reteach',     '#/class/cohort_demo/reteach',                 'paper'],
  ['gallery',     '#/dev/ui',                                    'paper'],
];

const WIDTHS = [[390, 844, 'm'], [1280, 1000, 'd']];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

  for (const [w, h, tag] of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });

    // Seed: load the demo cohort and open a worked sample so map/viva have data.
    await page.goto(`${BASE}/#/class`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')]
        .find((x) => /demo|演示班级|示例班级/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 700));

    for (const [name, hash, theme] of SHOTS) {
      let target = hash;
      if (name === 'map')  target = '#/map/cohort_demo_nur-antepartum';
      if (name === 'viva') {
        await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' });
        await new Promise((r) => setTimeout(r, 400));
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')]
            .find((x) => /Try it with a real sample|拿一份真作业试试/i.test(x.textContent || ''));
          if (b) b.click();
        });
        await new Promise((r) => setTimeout(r, 900));
        target = null;
      }
      if (target) await page.goto(`${BASE}/${target}`, { waitUntil: 'networkidle0' });
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await new Promise((r) => setTimeout(r, 1400));   // let the ink and the hero settle
      const path = `${OUT}/p4-${name}-${tag}.png`;
      await page.screenshot({ path, fullPage: name !== 'gallery' });
      console.log('wrote', path, await page.evaluate(() => location.hash));
    }
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error('crashed:', e.message); process.exit(1); });
