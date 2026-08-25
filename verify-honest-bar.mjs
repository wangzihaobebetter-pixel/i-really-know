/**
 * The escape must stay the size of the commit, and taking it must stay a result.
 *
 * Measured on our own build (memory/ireallyknow-v7r2/GAP.md §1): "这题我会卡住"
 * rendered 78×19px next to a 52×52 submit — the smallest hit target on a screen
 * whose entire purpose is to make admitting a gap cheaper than inventing an
 * answer. Khan Academy (110,169 ratings) ships [Skip 44×40] beside
 * [Check 130×40]; Elevate (539,777) ships [Skip][Submit] at equal width. Two
 * independent products, 650k ratings, same decision.
 *
 * This defect reached production once without anyone noticing, because nothing
 * was watching it. Now something is. Four invariants:
 *   1. `.s-stuck` declares min-height and min-width of at least 44px.
 *   2. No later rule shrinks `.s-stuck` back under 44px.
 *   3. The blank-plan step writes `blankPlan` as its own field, not only as a
 *      prefix inside the answer text.
 *   4. The result screen renders the stuck-but-planned column.
 *   5. `.run-leave` — the way out of the whole run-through — is also >=44px,
 *      and the bar holding it is sticky. Brilliant holds [Go back 44x44] in
 *      one place across every onboarding screen; ours used to scroll away on
 *      exactly the long questions a student most wants out of (P29).
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MIN_PX = 44;
const failures = [];

const cssFiles = execSync("find src -name '*.css'", { encoding: 'utf8' }).trim().split('\n');
let sawFloor = false;

for (const file of cssFiles) {
  const css = readFileSync(file, 'utf8');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/(^|[\s,>])\.s-stuck\b/.test(selector)) continue;
    for (const prop of ['min-height', 'min-width', 'height', 'width']) {
      const hit = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([\\d.]+)px`));
      if (!hit) continue;
      const px = Number(hit[1]);
      if (px < MIN_PX) {
        failures.push(`${file}: "${selector.trim()}" sets ${prop}: ${px}px — the escape may not go under ${MIN_PX}px`);
      } else if (prop === 'min-height' || prop === 'min-width') {
        sawFloor = true;
      }
    }
  }
}
if (!sawFloor) failures.push('no rule declares a min-height/min-width floor on .s-stuck');

let leaveFloor = false;
let leaveSticky = false;
for (const file of cssFiles) {
  const css = readFileSync(file, 'utf8');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (/(^|[\s,>])\.run-leave\b/.test(selector)) {
      const hit = body.match(/(?:^|;)\s*min-height\s*:\s*([\d.]+)px/);
      if (hit) {
        if (Number(hit[1]) < MIN_PX) failures.push(`${file}: ".run-leave" sets min-height: ${hit[1]}px — the way out of the run may not go under ${MIN_PX}px`);
        else leaveFloor = true;
      }
    }
    if (/(^|[\s,>])\.v5-run-top\b/.test(selector) && /position\s*:\s*sticky/.test(body)) leaveSticky = true;
  }
}
if (!leaveFloor) failures.push('no rule declares a min-height floor on .run-leave');
if (!leaveSticky) failures.push('.v5-run-top is no longer sticky — the way out scrolls away on a long question');

const viva = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
if (!/saveAnswer\([^)]*\{\s*blankPlan:/.test(viva)) {
  failures.push('VivaScreen: the blank step no longer stores blankPlan as its own field');
}

const analysis = readFileSync('src/lib/analysis.ts', 'utf8');
if (!/export function stuckButPlanned/.test(analysis)) {
  failures.push('analysis.ts: stuckButPlanned() is gone — the escape can no longer be counted as a result');
}

const result = readFileSync('src/screens/result/ResultScreen.tsx', 'utf8');
if (!/result-stuck-v5/.test(result) || !/stuckButPlanned/.test(result)) {
  failures.push('ResultScreen: the stuck-but-planned column is missing — taking the escape reads as a blank again');
}

if (failures.length) {
  console.error('verify-honest-bar: FAILED');
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`verify-honest-bar: both escapes ≥${MIN_PX}px and standing, plan stored, column rendered ✓`);
