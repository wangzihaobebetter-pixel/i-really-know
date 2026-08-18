/**
 * End-to-end check of the KEYED path against the mock provider: settings →
 * test connection → import own work → generate → answer → self-grade → AI score
 * → divergence → diagnosis. This is the half of the product that the keyless
 * sample runs never touch.
 */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:4177';
const MOCK = process.env.MOCK_URL || 'http://localhost:4188/v1';

const problems = [];
const note = (m) => console.log('  ' + m);

const MATERIAL = `# Rate limiter design note

I implemented a token bucket rate limiter for the public API. The bucket holds 100 tokens and
refills at 10 tokens per second. Each request takes one token; if the bucket is empty the request
is rejected with 429 and a Retry-After header.

I chose a token bucket over a fixed window because a fixed window allows a burst of 2x the limit
across a window boundary. The leaky bucket alternative smooths output but I wanted to allow short
bursts, which our clients rely on during page load.

State is kept in Redis with a Lua script so the read-modify-write is atomic. The key is the API key
id and the TTL is 60 seconds so idle clients do not accumulate keys forever.

I tested it with a synthetic load of 500 requests per second for 30 seconds and observed the
expected rejection rate. I did not test behaviour when Redis is unavailable.`;

async function typeInto(page, labels, value) {
  const labelText = Array.isArray(labels) ? labels[0] : labels;
  const wanted = Array.isArray(labels) ? labels : [labels];
  const ok = await page.evaluate((names, val) => {
    const fields = [...document.querySelectorAll('.field')];
    const field = fields.find((f) => names.includes(f.querySelector('.field-label')?.textContent.trim()));
    const el = field?.querySelector('input, textarea');
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, wanted, value);
  if (!ok) problems.push(`could not find field "${labelText}"`);
  return ok;
}

async function clickByText(page, texts) {
  const h = await page.evaluateHandle((wanted) => {
    const n = [...document.querySelectorAll('button')];
    return n.find((x) => wanted.some((w) => x.textContent.trim() === w)) || null;
  }, texts);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 1280, height: 1000 });

  /* ---- settings: point at the mock provider ---- */
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.field', { timeout: 10000 });
  await typeInto(page, ['API base URL', 'API 地址'], MOCK);
  await typeInto(page, ['API key'], 'sk-mock-not-a-real-key');
  await typeInto(page, ['Model', '模型'], 'mock-1');
  await new Promise((r) => setTimeout(r, 300));

  await clickByText(page, ['Test connection', '测试连接']);
  await page.waitForFunction(
    () => /Connection works|连接正常|rejected|失败/.test(document.body.innerText), { timeout: 15000 },
  ).catch(() => problems.push('Test connection never resolved'));
  const testOk = await page.evaluate(() => /Connection works|连接正常/.test(document.body.innerText));
  note(`settings: test connection ${testOk ? 'OK' : 'FAILED'}`);
  if (!testOk) problems.push('test connection did not report success');

  /* ---- import own work ---- */
  await page.goto(`${BASE}/#/import`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.evaluate((text) => {
    const el = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, MATERIAL);
  await new Promise((r) => setTimeout(r, 400));

  const detected = await page.evaluate(() => {
    const m = document.body.innerText.match(/(Detected discipline|识别到的学科)[\s\S]{0,80}/);
    return m ? m[0].replace(/\n+/g, ' ').slice(0, 70) : null;
  });
  note(`import: ${detected || 'no detection block'}`);

  await clickByText(page, ['Begin examination', '开始口试']);
  await page.waitForSelector('#viva-answer', { timeout: 25000 })
    .catch(() => problems.push('generation never produced a viva screen'));
  note('generate: probes returned and the viva screen rendered');

  /* ---- answer every probe; the AI score must appear AFTER self-grade ---- */
  let done = 0, sawScore = 0, orderingOk = true;
  for (let i = 0; i < 10; i++) {
    if (!(await page.$('#viva-answer'))) break;
    await page.type('#viva-answer', 'Because the alternative would cost more here, though I cannot say by how much.');
    if (!(await clickByText(page, ['Commit answer', '提交回答']))) break;
    await new Promise((r) => setTimeout(r, 250));

    // Before self-grading, no AI verdict may be on screen.
    const leaked = await page.evaluate(() =>
      /You gave the mechanism|You restated the submission/.test(document.body.innerText));
    if (leaked) orderingOk = false;

    if (!(await clickByText(page, ['Shaky', '有点虚']))) break;
    await page.waitForFunction(
      () => /You gave the mechanism|You restated the submission|Scoring|评分中/.test(document.body.innerText),
      { timeout: 15000 },
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 700));
    if (await page.evaluate(() => /You gave the mechanism|You restated the submission/.test(document.body.innerText))) sawScore++;

    done++;
    if (!(await clickByText(page, ['Next probe', 'Finish and see the map', '下一题', '结束，看地图']))) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  note(`viva: ${done} probes committed, ${sawScore} AI scores rendered`);
  if (done < 4) problems.push(`only ${done} probes completed`);
  if (sawScore < done) problems.push(`${done - sawScore} probes never showed an AI score`);
  if (!orderingOk) problems.push('AI verdict was visible BEFORE self-grading — the divergence signal is destroyed');
  else note('viva: self-grade is collected before the AI verdict is revealed ✓');

  /* ---- map: divergence + diagnosis ---- */
  await page.waitForSelector('.anchored', { timeout: 15000 }).catch(() => problems.push('map never rendered'));
  const calib = await page.evaluate(() => /Calibration|自我认知准确度/.test(document.body.innerText));
  note(`map: calibration section present = ${calib}`);
  if (!calib) problems.push('calibration missing — AI and self scores did not both land');

  const illusion = await page.evaluate(() =>
    /Where you thought you were solid|你以为自己稳的地方/.test(document.body.innerText));
  note(`map: illusion section present = ${illusion}`);

  await clickByText(page, ['Write the summary', '生成总评']);
  await page.waitForFunction(() => /borrowed|You own the data-structure/.test(document.body.innerText), { timeout: 15000 })
    .catch(() => problems.push('diagnosis never rendered'));
  const diag = await page.evaluate(() => /You own the data-structure choice/.test(document.body.innerText));
  note(`map: diagnosis rendered = ${diag}`);
  if (!diag) problems.push('DIAGNOSE output not shown');

  await page.screenshot({ path: 'shot-keyed-map.png' });

  /* ---- second run: self-grade everything "I own this" so the illusion
         class (claimed it, could not defend it) actually gets exercised ---- */
  await page.goto(`${BASE}/#/import`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.evaluate((text) => {
    const el = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, MATERIAL + '\n\nSecond pass for the illusion path.');
  await new Promise((r) => setTimeout(r, 400));
  await clickByText(page, ['Begin examination', '开始口试']);
  await page.waitForSelector('#viva-answer', { timeout: 25000 }).catch(() => problems.push('second run never generated'));

  let done2 = 0;
  for (let i = 0; i < 10; i++) {
    if (!(await page.$('#viva-answer'))) break;
    await page.type('#viva-answer', 'I am confident about this one.');
    if (!(await clickByText(page, ['Commit answer', '提交回答']))) break;
    await new Promise((r) => setTimeout(r, 250));
    if (!(await clickByText(page, ['I own this', '我掌握了']))) break;
    await new Promise((r) => setTimeout(r, 900));
    done2++;
    if (!(await clickByText(page, ['Next probe', 'Finish and see the map', '下一题', '结束，看地图']))) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.waitForSelector('.anchored', { timeout: 15000 }).catch(() => {});
  const illusion2 = await page.evaluate(() =>
    /Where you thought you were solid|你以为自己稳的地方/.test(document.body.innerText));
  const illusionMark = await page.$$eval('.anchor-illusion', (n) => n.length).catch(() => 0);
  note(`illusion run: ${done2} probes self-graded Owned → illusion section=${illusion2}, ${illusionMark} spans inked as illusion`);
  if (!illusion2) problems.push('illusion class never triggered even when Owned was claimed against a 0/1 score');
  if (!illusionMark) problems.push('no span inked with the illusion colour on the Painted Page');

  /* ---- retraining: VARIANT ---- */
  await clickByText(page, ['Add the weak ones to retraining', '把薄弱项加入重练']);
  await new Promise((r) => setTimeout(r, 400));
  await page.goto(`${BASE}/#/queue`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  const started = await clickByText(page, ['Start retraining', '开始重练']);
  if (!started) problems.push('retraining queue had nothing due after adding weak probes');
  else {
    await page.waitForFunction(() => /Mock variant|same target, different angle/.test(document.body.innerText), { timeout: 15000 })
      .catch(() => problems.push('VARIANT never rendered a fresh probe'));
    note('queue: VARIANT probe rendered ✓');
  }

  /* ---- class mode: batch GENERATE + AGGREGATE ---- */
  await page.goto(`${BASE}/#/class`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.field', { timeout: 10000 });
  await typeInto(page, ['Cohort name', '班级名称'], 'Mock cohort');
  await new Promise((r) => setTimeout(r, 200));
  await clickByText(page, ['New cohort', '新建班级']);
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate((text) => {
    const el = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, MATERIAL);
  await new Promise((r) => setTimeout(r, 300));
  await clickByText(page, ['Add a submission', '添加一份作业']);
  await new Promise((r) => setTimeout(r, 300));
  await clickByText(page, ['Generate examinations', '批量出题']);
  await page.waitForFunction(() => /ready/.test(document.body.innerText), { timeout: 25000 })
    .catch(() => problems.push('class batch generation never reached ready'));
  await clickByText(page, ['Summarise the cohort', '汇总整个班级']);
  await page.waitForFunction(() => /unpaid complexity claims|Where is each term/.test(document.body.innerText), { timeout: 20000 })
    .catch(() => problems.push('AGGREGATE never rendered'));
  note('class: batch generate + aggregate rendered ✓');
  await page.screenshot({ path: 'shot-keyed-class.png' });

  await browser.close();

  /* ---- contract violations recorded by the mock ---- */
  const seen = await (await fetch(MOCK.replace(/\/v1$/, '') + '/__seen')).json();
  const kinds = seen.reduce((a, s) => ({ ...a, [s.kind]: (a[s.kind] || 0) + 1 }), {});
  note(`provider saw: ${JSON.stringify(kinds)}`);
  const bad = seen.filter((s) => s.violations.length);
  bad.forEach((s) => problems.push(`${s.kind}: ${s.violations.join(', ')}`));
  if (kinds.UNKNOWN) problems.push(`${kinds.UNKNOWN} unclassifiable requests`);
  for (const required of ['PING', 'GENERATE', 'SCORE', 'DIAGNOSE', 'VARIANT', 'AGGREGATE']) {
    if (!kinds[required]) problems.push(`${required} was never called — that path is still unverified`);
  }

  const real = errors.filter((e) => !/favicon|manifest|sw\.js/i.test(e));
  real.slice(0, 5).forEach((e) => problems.push('console: ' + e.slice(0, 140)));

  console.log('');
  if (problems.length) {
    console.error(`verify-keyed FAILED (${problems.length}):`);
    problems.forEach((p) => console.error('  ✗ ' + p));
    process.exit(1);
  }
  console.log('verify-keyed: the whole keyed path works ✓');
})().catch((e) => { console.error('verify-keyed crashed:', e.message); process.exit(1); });
