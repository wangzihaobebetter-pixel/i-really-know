/** Behavioural checks for changed-angle returns and persisted follow-up evidence. */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const bundle = '.tmp-followup-logic.mjs';
execFileSync('npx', ['esbuild', 'src/lib/session-ops.ts', '--bundle', '--platform=node', '--format=esm', `--outfile=${bundle}`], { stdio: 'pipe' });
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true,
});
const { gradeTarget, localFollowupVariant } = await import(`./${bundle}?at=${Date.now()}`);
const failures = [];

const probe = {
  id: 'p1', dimensionId: 'mechanism', concept: 'Pointer-array allocation size', kind: 'why',
  anchor: { quote: 'malloc rows of pointers', placed: true, start: 0, end: 23 },
  question: 'Why allocate this amount?', whyThisProbe: 'Original angle',
  reference: { ownedLooksLike: 'Names the pointer-array size.', keyPoints: ['rows', 'sizeof pointer'] },
  timerSec: 90, difficulty: 'standard',
  variant: { question: 'What breaks if this allocation uses the element size?', whyThisProbe: 'Perturb the allocation.' },
};
const baseTarget = {
  id: 't1', sessionId: 's1', probeId: probe.id, dimensionId: probe.dimensionId,
  anchor: probe.anchor, packId: 'cs', stage: 1, dueAt: 0, passesInRow: 0, history: [], retired: false,
};
const first = localFollowupVariant(probe, baseTarget, 'en');
const secondTarget = { ...baseTarget, history: [{ at: 1, probeId: first.id, question: first.question, answer: 'First answer' }] };
const second = localFollowupVariant(probe, secondTarget, 'en');
const thirdTarget = { ...secondTarget, history: [...secondTarget.history, { at: 2, probeId: second.id, question: second.question, answer: 'Second answer' }] };
const third = localFollowupVariant(probe, thirdTarget, 'en');
const questions = [first.question, second.question, third.question];
if (new Set(questions).size !== 3) failures.push('1/3/7-day local follow-ups repeated an angle');
if (questions.includes(probe.question)) failures.push('a local follow-up reused the original question');
const chinese = localFollowupVariant(probe, baseTarget, 'zh-CN');
if (!/[\u3400-\u9fff]/.test(chinese.question) || chinese.question === probe.variant.question) failures.push('Chinese UI reused an English canned variant');
const chineseSecondTarget = { ...baseTarget, history: [{ at: 1, probeId: chinese.id, question: chinese.question, answer: '第一次' }] };
const chineseSecond = localFollowupVariant(probe, chineseSecondTarget, 'zh-CN');
const chineseThird = localFollowupVariant(probe, { ...chineseSecondTarget, history: [...chineseSecondTarget.history, { at: 2, probeId: chineseSecond.id, question: chineseSecond.question, answer: '第二次' }] }, 'zh-CN');
if (new Set([chinese.question, chineseSecond.question, chineseThird.question]).size !== 3) failures.push('Chinese 1/3/7-day follow-ups repeated an angle');

function firstThreeQuestions(sourceProbe) {
  let target = { ...baseTarget, probeId: sourceProbe.id, history: [] };
  const result = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = localFollowupVariant(sourceProbe, target, 'en');
    result.push(next.question);
    target = { ...target, history: [...target.history, { at: attempt + 1, probeId: next.id, question: next.question, answer: `Answer ${attempt + 1}` }] };
  }
  return result;
}

const cannedAngleZero = 'Take this part of your work from the other direction: what would have to change for its reasoning no longer to hold?';
const originalCollision = firstThreeQuestions({ ...probe, question: cannedAngleZero, variant: undefined });
if (originalCollision.includes(cannedAngleZero) || new Set(originalCollision).size !== 3) failures.push('a canned angle repeated an identical original question');
const suppliedCollision = firstThreeQuestions({ ...probe, variant: { question: cannedAngleZero, whyThisProbe: 'Same as canned angle zero.' } });
if (new Set(suppliedCollision).size !== 3) failures.push('a supplied variant repeated its matching canned angle');

const graded = gradeTarget({ ...baseTarget, draft: { prompt: first, answer: 'Saved words', selfGrade: 'shaky' } }, false, first.id, 1, 'shaky', 'Saved words', first.question);
if (graded.history?.[0]?.answer !== 'Saved words' || graded.history?.[0]?.question !== first.question) failures.push('graded attempt lost its answer or exact question');
if (graded.draft !== undefined) failures.push('completed attempt did not clear its saved draft');
if (graded.stage !== 1 || graded.passesInRow !== 0) failures.push('an unheld attempt did not restart the 1-day ladder');

const firstHold = gradeTarget(baseTarget, true, first.id, 3, 'owned', 'Held once', first.question);
const secondHold = gradeTarget({ ...baseTarget, ...firstHold }, true, second.id, 3, 'owned', 'Held twice', second.question);
if (firstHold.retired) failures.push('one held return retired the target too early');
if (!secondHold.retired) failures.push('two consecutive held returns did not settle the target');

rmSync(bundle, { force: true });
console.log('verify-followup-logic: checked three changed angles, language, saved words and two-hold settlement');
if (failures.length) {
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log('verify-followup-logic: follow-up evidence and variation hold ✓');
