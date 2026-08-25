/**
 * The one structural constraint the research says we must never break.
 *
 * Anki's manual is explicit that the machine does not judge how well you
 * remembered — "it's still up to you to decide" — and its four answer buttons
 * exist only on the answer face, after the student has committed
 * (docs.ankiweb.net/studying.html#answer-buttons,
 *  docs.ankiweb.net/templates/fields.html#checking-your-answer).
 *
 * The reason is not politeness. If the machine says right-or-wrong first, the
 * self-assessment that follows is no longer an assessment — it is the student
 * repeating the machine. The gap between what a student claims and what holds
 * is the only number this product produces, and showing a verdict early
 * destroys it at the source.
 *
 * So: every render of the verdict — the mark, the verdict line, the coloured
 * anchor on the source — must be gated on the revealed phase. This gate reads
 * the run screen and fails if any of them appears ungated.
 */
import { readFileSync } from 'node:fs';

const source = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const failures = [];

/* Every line that renders the verdict, and the guard each one must carry. */
const RENDERS = [
  { re: /<Mark\s+verdict=\{verdict\}/g, what: 'the verdict mark' },
  { re: /data-verdict=\{verdict\}/g, what: 'the verdict line' },
  { re: /\{\s*\.\.\.source\.anchor,\s*verdict\s*\}/g, what: 'the coloured source anchor' },
  { re: /is-\$\{verdict\}/g, what: 'the verdict tint on the source sheet' },
];

const lines = source.split('\n');
for (const { re, what } of RENDERS) {
  let hit = false;
  for (const [index, line] of lines.entries()) {
    re.lastIndex = 0;
    if (!re.test(line)) continue;
    hit = true;
    /* The guard may sit on this line, or open the block just above it — either
       as `phase === 'revealed'` around the render or an early
       `if (phase !== 'revealed') return null` before it. */
    const window = lines.slice(Math.max(0, index - 12), index + 1).join('\n');
    if (!/phase [=!]== 'revealed'/.test(window)) {
      failures.push(`${what} renders at line ${index + 1} without a 'revealed' phase guard`);
    }
  }
  if (!hit) failures.push(`${what} is gone — if it moved, this gate has to move with it`);
}

/* The self-grade must be reachable before scoring ever starts. */
const selfFirst = source.indexOf("setPhase('selfgrade')");
const scoreCall = source.indexOf('scoreProbe(');
if (selfFirst < 0 || scoreCall < 0 || scoreCall < selfFirst) {
  failures.push('the model is called before the student has been asked to self-assess');
}

/* Nothing may reveal a judgement during the wait. */
const scoring = source.slice(source.indexOf("phase === 'scoring'"), source.indexOf("phase === 'manualgrade'"));
if (/<Mark|data-verdict|verdictLine/.test(scoring)) {
  failures.push('the waiting state leaks a judgement before the student has seen one');
}

console.log(`verify-no-early-verdict: ${RENDERS.length} verdict renders checked, plus call order and the waiting state`);
if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('verify-no-early-verdict: no judgement is shown before the student has committed one ✓');
