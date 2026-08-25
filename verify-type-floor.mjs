/**
 * A floor under the type scale, and a ceiling on weight at that floor.
 *
 * Measured against the references (memory/ireallyknow-v7r2/MEASURED.md): the
 * smallest secondary text in shipped products is Khan 13.1px, Quizlet 12px/600,
 * Headspace 12px/500, Notion 14px. Our own build was running 11px at weight 760
 * — the size retreating while the weight shouts, which is what a type scale
 * looks like when the hierarchy was never decided.
 *
 * Rule: no shipped rule may set a font-size below 12px, and nothing at 12px may
 * carry a weight above 600. Icon-only and visually-hidden text is exempt because
 * it is never read.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FLOOR_PX = 12;
const MAX_WEIGHT_AT_FLOOR = 600;
/* The printable instructor document sets its own smaller sizes; on paper 9px is
   a masthead, not body text, and it is never rendered at phone scale. */
const EXEMPT = /visually-hidden|sr-only|\.s-daily-cell small|@media print|^\s*\.doc\b|\.doc::before|\.doc-masthead|\.doc-row|\.doc \.margin-note/m;

const files = execSync("find src -name '*.css'", { encoding: 'utf8' }).trim().split('\n');
const failures = [];
let checked = 0;

for (const file of files) {
  const css = readFileSync(file, 'utf8');
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  for (const [, selector, body] of blocks) {
    if (EXEMPT.test(selector)) continue;
    const size = body.match(/font-size:\s*([\d.]+)(px|rem)/);
    if (!size) continue;
    checked += 1;
    const px = size[2] === 'rem' ? parseFloat(size[1]) * 16 : parseFloat(size[1]);
    const line = css.slice(0, css.indexOf(selector)).split('\n').length;
    if (px < FLOOR_PX) {
      failures.push(`${file}:${line} ${selector.trim().slice(0, 60)} — ${px}px is below the ${FLOOR_PX}px floor`);
      continue;
    }
    if (px <= FLOOR_PX) {
      const weight = body.match(/font-weight:\s*(\d+)/);
      if (weight && Number(weight[1]) > MAX_WEIGHT_AT_FLOOR) {
        failures.push(`${file}:${line} ${selector.trim().slice(0, 60)} — ${px}px at weight ${weight[1]} (max ${MAX_WEIGHT_AT_FLOOR} at the floor)`);
      }
    }
  }
}

/* The token that most of the app's small text resolves through. */
const tokens = readFileSync('src/styles/tokens.css', 'utf8');
for (const [, name, value, unit] of tokens.matchAll(/(--t-[\w-]+):\s*([\d.]+)(rem|px)/g)) {
  const px = unit === 'rem' ? parseFloat(value) * 16 : parseFloat(value);
  if (px < FLOOR_PX) failures.push(`src/styles/tokens.css ${name}: ${px}px is below the ${FLOOR_PX}px floor`);
}

console.log(`verify-type-floor: ${checked} font-size declarations checked across ${files.length} stylesheets`);
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`verify-type-floor: nothing ships below ${FLOOR_PX}px, and the floor is never shouted ✓`);
