/**
 * v7 R2 · Interaction traces, round 2 — widening the first-hand evidence base.
 *
 * Round 1 walked Khan and Quizlet. Wang's standing note on this round is that
 * the research must reach the interaction layer of phone products, not stop at
 * a first screenful. So this pass records, per product: what is on screen, what
 * an action changes, how long the change takes, and what the product does with
 * a WRONG answer — the last one being the moment our own product lives or dies.
 *
 * Public surfaces only. Nothing is logged into. A gated product is recorded as
 * gated; that is evidence too, and it is not the same thing as no attempt.
 */
const puppeteer = require('puppeteer-core');
const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/zihaowang/.openclaw/workspace/memory/ireallyknow-v7r2/trace2';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dismiss = async (page) => {
  for (let i = 0; i < 4; i++) {
    const hit = await page.evaluate(() => {
      const words = /accept all|accept cookies|agree|got it|no thanks|close|dismiss|maybe later|not now|continue/i;
      const btn = [...document.querySelectorAll('button, a[role=button], [role=button]')]
        .find((b) => words.test((b.innerText || b.getAttribute('aria-label') || '').trim()));
      if (btn) { btn.click(); return true; }
      return null;
    }).catch(() => null);
    if (!hit) break;
    await wait(900);
  }
};

/** What is on screen, with real hit sizes — the same probe round 1 used. */
const snap = (page, label) => page.evaluate((l) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0; };
  const text = [...document.querySelectorAll('h1,h2,h3,p,span,div,label,li')]
    .filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
    .map((el) => el.innerText.trim().replace(/\s+/g, ' ').slice(0, 90))
    .filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 24);
  const buttons = [...document.querySelectorAll('button,[role=button],a[role=button]')].filter(vis)
    .map((b) => { const r = b.getBoundingClientRect(); return `${(b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28)} [${Math.round(r.width)}×${Math.round(r.height)}]`; })
    .filter((t) => t.length > 6).slice(0, 14);
  return { label: l, text, buttons };
}, label);

/**
 * The number that decides a scheme's personality (GAP.md §4): declared
 * transition durations actually in force on visible elements, not the ones in
 * a design doc. Serious study products sit at 120–150ms; Duolingo at 300–400.
 */
const motion = (page) => page.evaluate(() => {
  const seen = new Map();
  for (const el of [...document.querySelectorAll('*')].slice(0, 2500)) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const cs = getComputedStyle(el);
    const d = cs.transitionDuration, f = cs.transitionTimingFunction;
    if (!d || d === '0s') continue;
    const key = `${d} ${f}`.slice(0, 60);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ×${n}`);
});

const PRODUCTS = [
  ...(process.env.SKIP_DUO ? [] : [{
    id: 'duolingo-placement',
    url: 'https://www.duolingo.com/',
    /* The canonical answer-check state machine, and the one product that is
       allowed to be loud about a wrong answer. Ours must not copy the loudness,
       but it has to know exactly what it is declining to copy. */
    walk: async (page, steps, shot) => {
      steps.push(await snap(page, 'A · landing'));
      await shot('duo-1-landing');
      const started = await page.evaluate(() => {
        const b = [...document.querySelectorAll('a,button,[role=button]')]
          .find((x) => /get started|start now|try (it|a) (free|lesson)/i.test((x.innerText || '').trim()));
        if (b) { b.click(); return (b.innerText || '').trim().slice(0, 40); }
        return null;
      });
      steps.push({ label: 'B · clicked start', text: [started ? `clicked: ${started}` : 'no public start control found'], buttons: [] });
      if (started) { await wait(4500); await dismiss(page); await wait(1500); steps.push(await snap(page, 'C · after start')); await shot('duo-2-after-start'); }
    },
  }]),
  {
    id: 'brilliant-daily',
    url: 'https://brilliant.org/daily-problems/',
    /* Brilliant is the closest reference for "one hard question at a time,
       reasoning over recall" — the shape our run screen is actually in. */
    walk: async (page, steps, shot) => {
      steps.push(await snap(page, 'A · daily problems index'));
      await shot('bri-1-index');
      const opened = await page.evaluate(() => {
        const b = [...document.querySelectorAll('a,button,[role=button]')]
          .find((x) => /solve|start|today|open/i.test((x.innerText || '').trim()) && (x.innerText || '').trim().length < 40);
        if (b) { b.click(); return (b.innerText || '').trim().slice(0, 40); }
        return null;
      });
      if (!opened) { steps.push({ label: 'B · no public entry control', text: ['index exposes no clickable problem without an account'], buttons: [] }); return; }
      await wait(4000); await dismiss(page); await wait(1200);
      steps.push(await snap(page, `B · opened via "${opened}"`)); await shot('bri-2-onboarding');
      /* Walk the onboarding by always taking the first offered option, then
         Continue. Stop the moment a sign-in wall appears — nothing is logged
         into, and a wall is a finding, not a failure. */
      for (let step = 0; step < 6; step += 1) {
        const walled = await page.evaluate(() => /sign up|sign in|create (a |your )?account|log in/i.test(document.body.innerText.slice(0, 1200)));
        const moved = await page.evaluate(() => {
          const opts = [...document.querySelectorAll('button,[role=button],[role=radio],label')]
            .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 120 && r.height > 60 && r.top < innerHeight && r.bottom > 0; });
          if (opts[0]) opts[0].click();
          const cont = [...document.querySelectorAll('button,[role=button]')]
            .find((b) => /^(continue|next|start|got it)$/i.test((b.innerText || '').trim()));
          if (cont) { cont.click(); return 'continue'; }
          return opts[0] ? 'option-only' : null;
        }).catch(() => null);
        if (!moved) break;
        await wait(2600);
        steps.push(await snap(page, `C${step + 1} · onboarding step (${moved}${walled ? ', wall visible' : ''})`));
        await shot(`bri-3-step${step + 1}`);
        if (walled) { steps.push({ label: 'STOP · sign-in wall reached; not logging in', text: [], buttons: [] }); break; }
      }
    },
  },
  {
    id: 'notion-public-page',
    url: 'https://www.notion.com/templates',
    /* Scheme 09's reference. DECISION.md §1 argues 09 degrades on a phone
       because Notion itself degrades on a phone. That claim was made from
       screenshots; this is the attempt to see it first-hand. */
    walk: async (page, steps, shot) => {
      steps.push(await snap(page, 'A · loaded on 390px'));
      await shot('notion-1-page');
      const fonts = await page.evaluate(() => {
        const out = [];
        for (const el of [...document.querySelectorAll('h1,h2,p,li')].slice(0, 400)) {
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 8) continue;
          const cs = getComputedStyle(el);
          out.push(`${el.tagName.toLowerCase()} ${cs.fontFamily.split(',')[0].replace(/["']/g, '')} ${cs.fontSize}/${cs.lineHeight} ${cs.fontWeight}`);
        }
        return [...new Set(out)].slice(0, 10);
      });
      steps.push({ label: 'B · type on a phone viewport', text: fonts, buttons: [] });
    },
  },
];

(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const traces = [];

  for (const product of PRODUCTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const steps = [];
    const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
    let note = 'ok';
    try {
      await page.goto(product.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(2500);
      await dismiss(page);
      await wait(1500);
      await product.walk(page, steps, shot);
      steps.push({ label: 'Z · declared transitions in force', text: await motion(page), buttons: [] });
    } catch (error) {
      note = `FAILED: ${String(error.message || error).slice(0, 160)}`;
    }
    traces.push({ id: product.id, url: product.url, note, steps });
    await page.close().catch(() => {});
    console.log(`\n=== ${product.id} (${note})`);
    for (const s of steps) {
      console.log(`  -- ${s.label}`);
      if (s.text?.length) console.log(`     text: ${s.text.slice(0, 10).join(' | ').slice(0, 460)}`);
      if (s.buttons?.length) console.log(`     btns: ${s.buttons.join(' | ').slice(0, 340)}`);
    }
  }

  writeFileSync(`${OUT}/traces2.json`, JSON.stringify(traces, null, 2));
  await browser.close();
})();
