/**
 * Truth table for classifyDivergence — the product's core classification.
 * Every row is taken directly from spec §4.4:
 *   Illusion  self >= 2.5 and AI <= 1
 *   Undersold self <= 1.5 and AI == 3
 *   Owned     both >= 2
 *   Borrowed  both <= 1
 *   Half-held everything else
 * Self-grade maps Holds=3, Not sure=1.5, Wouldn't hold=0. A pre-judgment
 * self-grade alone is never promoted into a verdict; a model or explicit
 * post-rubric manual mark is required.
 *
 * This exists because that function was rewritten once by an unattended agent.
 * A commit message claiming "verified" is not verification.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Compile the real module rather than reimplementing it: this must test the
// code that actually ships. esbuild comes with vite.
mkdirSync('.tmp-divergence', { recursive: true });
execSync('npx esbuild src/lib/analysis.ts --format=esm --outfile=.tmp-divergence/analysis.mjs', { stdio: 'pipe' });
const { classifyDivergence, divergence, calibration } = await import('./.tmp-divergence/analysis.mjs');

const SELF = { owned: 3, shaky: 1.5, notmine: 0 };
const probe = (selfGrade, aiScore) => ({
  selfGrade,
  ai: aiScore === undefined ? undefined : { score: aiScore },
});

function expected(selfGrade, ai) {
  const self = selfGrade === undefined ? undefined : SELF[selfGrade];
  if (ai === undefined) {
    return 'unscored';
  }
  if (self === undefined) return ai >= 2 ? 'owned' : ai === 1 ? 'halfheld' : 'borrowed';
  if (self >= 2.5 && ai <= 1) return 'illusion';
  if (self <= 1.5 && ai === 3) return 'undersold';
  if (self >= 2 && ai >= 2) return 'owned';
  if (self <= 1 && ai <= 1) return 'borrowed';
  return 'halfheld';
}

const fails = [];
let n = 0;
for (const selfGrade of [undefined, 'owned', 'shaky', 'notmine']) {
  for (const ai of [undefined, 0, 1, 2, 3]) {
    n++;
    const got = classifyDivergence(probe(selfGrade, ai));
    const want = expected(selfGrade, ai);
    if (got !== want) fails.push(`self=${selfGrade ?? '-'} ai=${ai ?? '-'} → got ${got}, spec says ${want}`);
  }
}

// The classifications the product exists to produce must be reachable.
const reachable = {
  illusion: classifyDivergence(probe('owned', 0)),
  undersold: classifyDivergence(probe('notmine', 3)),
  owned: classifyDivergence(probe('owned', 3)),
  borrowed: classifyDivergence(probe('notmine', 0)),
  halfheld: classifyDivergence(probe('shaky', 1)),
};
for (const [want, got] of Object.entries(reachable)) {
  if (got !== want) fails.push(`headline class "${want}" is unreachable — its canonical case returns ${got}`);
}

const manualProbe = { id: 'manual', dimensionId: 'reason', selfGrade: 'shaky', manualScore: 3 };
if (classifyDivergence(manualProbe) !== 'undersold') fails.push('post-rubric manual mark does not produce the honest before/after class');
if (divergence([manualProbe])?.delta !== 1) fails.push('post-rubric manual mark is missing from the signed before/after count');
if (calibration([manualProbe]) === undefined) fails.push('post-rubric manual mark is missing from calibration');

rmSync('.tmp-divergence', { recursive: true, force: true });

console.log(`verify-divergence: ${n} combinations checked against spec §4.4`);
if (fails.length) {
  console.error(`verify-divergence: ${fails.length} MISMATCH`);
  fails.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-divergence: every self × AI combination matches the spec ✓');
