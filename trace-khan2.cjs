const puppeteer = require('puppeteer-core');
const OUT = '/Users/zihaowang/.openclaw/workspace/memory/ireallyknow-v7r2/trace';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto('https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs/x2f8bb11595b61c86:slope/e/slope-from-two-points', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(3000);
  for (let i = 0; i < 6; i++) {
    const hit = await p.evaluate(() => {
      const w = /accept all|strictly necessary|got it|no thanks|close|dismiss|skip tour|^next$|^done$|maybe later/i;
      const el = [...document.querySelectorAll('button,[role=button],a[role=button]')]
        .find((x) => w.test((x.innerText || x.getAttribute('aria-label') || '').trim()));
      if (el) { el.click(); return (el.innerText || el.getAttribute('aria-label')).trim().slice(0, 24); }
      return null;
    });
    if (!hit) break;
    await wait(900);
  }
  await wait(1500);
  await p.screenshot({ path: `${OUT}/khan-4-clean.png` });
  // The exercise is multiple choice here: pick a choice, then Check.
  const picked = await p.evaluate(() => {
    const c = [...document.querySelectorAll('[role=radio], [class*=choice] input, [class*=Choice]')].filter((el) => el.getBoundingClientRect().width > 10);
    if (c.length) { c[0].click(); return c.length; }
    const el = document.querySelector('input[type=text],input[type=tel],[contenteditable=true],textarea');
    if (el) { el.focus(); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, '-8'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'typed'; }
    return 0;
  });
  await wait(1200);
  await p.screenshot({ path: `${OUT}/khan-5-picked.png` });
  const t0 = Date.now();
  await p.evaluate(() => { const btn = [...document.querySelectorAll('button')].find((x) => /^check$/i.test((x.innerText || '').trim())); if (btn) btn.click(); });
  await wait(500); await p.screenshot({ path: `${OUT}/khan-6-check-500ms.png` });
  await wait(2000); await p.screenshot({ path: `${OUT}/khan-7-check-2500ms.png` });
  const after = await p.evaluate(() => ({
    buttons: [...document.querySelectorAll('button')].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 20 && r.top < innerHeight && r.bottom > 0; })
      .map((x) => `${(x.innerText || x.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 26)}[${Math.round(x.getBoundingClientRect().width)}×${Math.round(x.getBoundingClientRect().height)}]`),
    banner: [...document.querySelectorAll('div,section,span')].filter((x) => /correct|incorrect|try again|nice|great|not quite|keep going/i.test(x.innerText || '') && (x.innerText || '').length < 90)
      .map((x) => x.innerText.trim().replace(/\s+/g, ' ')).slice(0, 5),
  }));
  console.log('picked:', picked, '| elapsed', Date.now() - t0, 'ms');
  console.log('buttons:', after.buttons.join(' | ').slice(0, 400));
  console.log('feedback:', JSON.stringify(after.banner));
  await b.close();
})();
