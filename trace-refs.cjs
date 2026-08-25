/**
 * v7 R2 · Interaction traces from live products.
 *
 * The measurement pass gives numbers. This one gives the state machine: what
 * is on screen before an action, what the action does, what appears, and how
 * long it takes. That is the part Wang said was missing — 交互逻辑, not looks.
 *
 * Public surfaces only. Consent dialogs are dismissed; nothing is logged in to.
 */
const puppeteer = require('puppeteer-core');
const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/zihaowang/.openclaw/workspace/memory/ireallyknow-v7r2/trace';

const dismiss = async (page) => {
  for (let i = 0; i < 4; i++) {
    const hit = await page.evaluate(() => {
      const words = /accept all|accept cookies|agree|got it|strictly necessary|no thanks|close|dismiss|maybe later|not now/i;
      const nodes = [...document.querySelectorAll('button, a[role=button], [role=button]')];
      const btn = nodes.find((b) => words.test((b.innerText || b.getAttribute('aria-label') || '').trim()));
      if (btn) { btn.click(); return (btn.innerText || btn.getAttribute('aria-label') || '').trim().slice(0, 30); }
      return null;
    });
    if (!hit) break;
    await new Promise((r) => setTimeout(r, 900));
  }
};

const snap = (page, label) => page.evaluate((l) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0; };
  const text = [...document.querySelectorAll('h1,h2,h3,p,span,div,label,li')]
    .filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
    .map((el) => el.innerText.trim().replace(/\s+/g, ' ').slice(0, 90))
    .filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 26);
  const buttons = [...document.querySelectorAll('button,[role=button],a[role=button]')].filter(vis)
    .map((b) => { const r = b.getBoundingClientRect(); return `${(b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28)} [${Math.round(r.width)}×${Math.round(r.height)}]`; })
    .filter((t) => t.length > 6).slice(0, 14);
  const inputs = [...document.querySelectorAll('input,textarea,[contenteditable=true]')].filter(vis)
    .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute('placeholder') || el.getAttribute('aria-label') || ''}`.trim().slice(0, 50));
  return { label: l, text, buttons, inputs };
}, label);

(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--lang=en-US'] });
  const traces = [];

  // ── Khan Academy: a public exercise with a real commit → check → feedback loop
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const steps = [];
    try {
      await page.goto('https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs/x2f8bb11595b61c86:slope/e/slope-from-two-points', { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 3000));
      await dismiss(page);
      await new Promise((r) => setTimeout(r, 2500));
      steps.push(await snap(page, 'A · exercise loaded'));
      await page.screenshot({ path: `${OUT}/khan-1-loaded.png` });

      const typed = await page.evaluate(() => {
        const el = document.querySelector('input[type=text], input[type=tel], input:not([type=hidden]):not([type=checkbox]), [contenteditable=true], textarea');
        if (!el) return false;
        el.focus();
        if (el.isContentEditable) { el.textContent = '2'; el.dispatchEvent(new InputEvent('input', { bubbles: true })); return true; }
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, '2');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      });
      await new Promise((r) => setTimeout(r, 1200));
      steps.push(await snap(page, `B · answer entered (${typed ? 'ok' : 'no input found'})`));
      await page.screenshot({ path: `${OUT}/khan-2-answered.png` });

      const t0 = Date.now();
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^check|check answer|submit/i.test((x.innerText || '').trim()));
        if (b) b.click();
      });
      await new Promise((r) => setTimeout(r, 2200));
      steps.push(await snap(page, `C · after Check (+${Date.now() - t0}ms)`));
      await page.screenshot({ path: `${OUT}/khan-3-checked.png` });
    } catch (e) { steps.push({ label: 'ERROR', text: [String(e.message).slice(0, 160)], buttons: [], inputs: [] }); }
    traces.push({ id: 'khan-exercise', steps });
    await page.close();
  }

  // ── Quizlet: a public set, flashcard flip
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const steps = [];
    try {
      await page.goto('https://quizlet.com/us/560091745/biology-chapter-1-flash-cards/', { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise((r) => setTimeout(r, 3000));
      await dismiss(page);
      await new Promise((r) => setTimeout(r, 2500));
      steps.push(await snap(page, 'A · set page'));
      await page.screenshot({ path: `${OUT}/quizlet-1-set.png` });
      await page.evaluate(() => {
        const card = document.querySelector('[class*=FlashcardsCard], [class*=SetPageTerms], [aria-label*=lashcard], [class*=Flashcard]');
        if (card) card.click();
      });
      await new Promise((r) => setTimeout(r, 1800));
      steps.push(await snap(page, 'B · after tapping the card'));
      await page.screenshot({ path: `${OUT}/quizlet-2-flipped.png` });
    } catch (e) { steps.push({ label: 'ERROR', text: [String(e.message).slice(0, 160)], buttons: [], inputs: [] }); }
    traces.push({ id: 'quizlet-flashcards', steps });
    await page.close();
  }

  writeFileSync(`${OUT}/traces.json`, JSON.stringify(traces, null, 2));
  for (const t of traces) {
    console.log(`\n=== ${t.id}`);
    for (const s of t.steps) {
      console.log(`  -- ${s.label}`);
      console.log(`     text: ${s.text.slice(0, 8).join(' | ').slice(0, 400)}`);
      console.log(`     btns: ${s.buttons.join(' | ').slice(0, 300)}`);
      if (s.inputs.length) console.log(`     inputs: ${s.inputs.join(' | ').slice(0, 160)}`);
    }
  }
  await browser.close();
})();
