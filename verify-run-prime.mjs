/**
 * P28 — say it before they stumble, and say it once.
 *
 * Admitting you cannot explain something costs two separate things. The
 * operation: how big the button is, how far from the commit — fixed in
 * e381be3 and guarded by verify-honest-bar.mjs. And the anticipation: what
 * this product is going to think of you for pressing it. Nothing here ever
 * addressed the second, so a student met it for the first time at the moment
 * they were already stuck — the most expensive moment there is.
 *
 * Brilliant spends an entire onboarding screen on it, before the student has
 * seen one question ("I'm here to help if you ever get stuck." —
 * design/v7r2/OBSERVED-2.md §一, screenshot trace2/bri-3-step2.png). We spend
 * one screen too, and this file is what keeps it honest:
 *
 *   1. The prime screen exists and is reachable, with its own test id.
 *   2. It renders BEFORE the first probe — i.e. it returns early, above the
 *      point where a verdict is computed. A declaration that arrives after
 *      the first question is not a declaration, it is a consolation.
 *   3. It only fires on a run where nothing has been committed yet, and only
 *      until it has been acknowledged once (ui.stuckPrimeSeenAt). A screen
 *      that reappears every run is a toll, not a welcome.
 *   4. It names the stuck path in words — the screen is worthless if it is
 *      warm and vague.
 *   5. Its commit and its way out both clear the 44px floor, like every other
 *      tappable thing in the run (P29).
 */
import { readFileSync } from 'node:fs';

const MIN_PX = 44;
const failures = [];
const viva = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const css = readFileSync('src/styles/v5.css', 'utf8');
const strings = readFileSync('src/i18n/v5.ts', 'utf8');

/* 1 + 2. Present, and above the verdict — the reveal machinery starts at
   `const verdict = verdictOf(committed)`, so the prime block must come first. */
const primeAt = viva.indexOf('data-testid="run-prime"');
const verdictAt = viva.indexOf('const verdict = verdictOf(committed)');
if (primeAt < 0) failures.push('VivaScreen: no run-prime screen — the student meets "I am stuck" for the first time while stuck');
else if (verdictAt < 0) failures.push('VivaScreen: cannot find the verdict boundary this check is anchored to — re-anchor it, do not delete it');
else if (primeAt > verdictAt) failures.push('VivaScreen: the prime screen renders after the run has started — it must be an early return, before the first probe');

/* 3. Once, and only on a fresh run. */
if (!/ui\.stuckPrimeSeenAt/.test(viva)) failures.push('VivaScreen: the prime screen is not gated on ui.stuckPrimeSeenAt — it will reappear on every run-through');
if (!/setUi\(\{\s*stuckPrimeSeenAt:/.test(viva)) failures.push('VivaScreen: acknowledging the prime screen does not persist stuckPrimeSeenAt');
if (!/probes\.every\(\(item\) => !item\.committedAt\)/.test(viva)) failures.push('VivaScreen: the prime screen is not restricted to a run with nothing committed — it would interrupt a resumed run');
if (!/stuckPrimeSeenAt\?:\s*number/.test(readFileSync('src/types/index.ts', 'utf8'))) failures.push('types: UiState has no stuckPrimeSeenAt field');

/* 4. It has to say the thing, in both languages. */
for (const key of ['primeTitle', 'primeBody', 'primeStuck', 'primeGo', 'primeLater']) {
  const hits = strings.split('\n').filter((line) => new RegExp(`^\\s+${key}:`).test(line)).length;
  if (hits < 2) failures.push(`i18n v5: ${key} is missing from one of the two language tables (${hits} of 2)`);
}
const zhStuck = strings.match(/^\s+primeStuck: '([^']+)'/gm) ?? [];
if (!zhStuck.some((line) => /我卡住了/.test(line))) failures.push('i18n v5: the prime screen never names 「我卡住了」 — a warm, vague welcome is not the pattern');
if (!zhStuck.some((line) => /I am stuck/.test(line))) failures.push('i18n v5: the English prime screen never names "I am stuck"');

/* 5. The 44px floor, on both the commit and the way out. */
/* The commit itself: measured at 114x40 in the browser before this floor was
   added, because the shared .btn default is 40px. The one action on a screen
   about not being afraid to press things does not get to be the small one. */
const go = css.match(/\.run-prime-go\s*\{([^}]*)\}/);
if (!go) failures.push('v5.css: .run-prime-go has no rule — the commit falls back to the 40px .btn default, under the 44px floor');
else {
  const hit = go[1].match(/(?:^|;)\s*min-height\s*:\s*([\d.]+)px/);
  if (!hit) failures.push('v5.css: .run-prime-go declares no min-height floor');
  else if (Number(hit[1]) < MIN_PX) failures.push(`v5.css: .run-prime-go sets min-height: ${hit[1]}px — under the ${MIN_PX}px floor`);
}
if (!/className="run-prime-go"/.test(viva)) failures.push('VivaScreen: the prime commit no longer carries .run-prime-go, so the 44px floor does not reach it');

const later = css.match(/\.run-prime-later\s*\{([^}]*)\}/);
if (!later) failures.push('v5.css: .run-prime-later has no rule — the way out of the prime screen is unstyled');
else {
  for (const prop of ['min-height', 'min-width']) {
    const hit = later[1].match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([\\d.]+)px`));
    if (!hit) failures.push(`v5.css: .run-prime-later declares no ${prop} floor`);
    else if (Number(hit[1]) < MIN_PX) failures.push(`v5.css: .run-prime-later sets ${prop}: ${hit[1]}px — under the ${MIN_PX}px floor`);
  }
}
if (!/data-testid="run-prime-go"/.test(viva)) failures.push('VivaScreen: the prime screen commit has no test id, so nothing downstream can find it');
if (!/className="run-leave"/.test(viva.slice(primeAt < 0 ? 0 : primeAt, primeAt < 0 ? 0 : primeAt + 900))) {
  failures.push('VivaScreen: the prime screen does not carry the standing .run-leave escape (P29 — the way out is on every screen of the flow, in the same place)');
}

if (failures.length) {
  console.error('verify-run-prime: FAIL');
  for (const line of failures) console.error('  - ' + line);
  process.exit(1);
}
console.log('verify-run-prime: ok — the declaration lands before the first probe, once, at 44px');
