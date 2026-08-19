/** Spaced follow-up contract — care, changed angle, same measurement order. */
import { readFileSync } from 'node:fs';
const source = readFileSync('src/screens/followups/FollowupsScreen.tsx', 'utf8');
const ops = readFileSync('src/lib/session-ops.ts', 'utf8');
const types = readFileSync('src/types/index.ts', 'utf8');
const prompts = readFileSync('src/lib/prompts.ts', 'utf8');
const failures = [];
const need = (re, message) => { if (!re.test(source)) failures.push(message); };
const forbid = (re, message) => { if (re.test(source)) failures.push(message); };
need(/type Phase[\s\S]*'answering'[\s\S]*'selfgrade'[\s\S]*'manualgrade'[\s\S]*'revealed'/, 'follow-up must use answer → self-grade → mark → reveal phases');
need(/variant as makeVariant|makeVariant/, 'the same target must return from a genuinely different angle when a model is connected');
need(/gradeTarget/, 'the existing 1/3/7-day target must advance instead of creating a duplicate queue');
need(/localFollowupVariant[\s\S]*history\.length/, 'keyless follow-ups must rotate through changed angles instead of repeating one static variant');
need(/priorQuestions|history\.map\([^)]*question/, 'model follow-ups must receive prior questions so later attempts cannot repeat them');
need(/gradeTarget\([^)]*answer\.trim\(\)[^)]*prompt\.question/, 'completed follow-ups must persist the student answer and exact changed question');
need(/mark !== null[\s\S]*onClick=\{closeAttempt\}/, 'a model failure must not allow follow-up completion before manual marking');
if (!/history:[^\n]*question\?: string; answer\?: string/.test(types) || !/draft\?:[^\n]*prompt: Probe; answer: string/.test(types)) failures.push('follow-up attempts and interrupted drafts are not persisted');
if (!/gradeTarget[\s\S]*question[\s\S]*answer[\s\S]*draft: undefined/.test(ops)) failures.push('grading does not move the saved draft into history');
if (!/PREVIOUS RETRAINING QUESTIONS|priorQuestions/.test(prompts)) failures.push('variant prompt does not forbid earlier follow-up questions');
need(/nav\('today'\)/, 'follow-up must have a humane return to Today');
const selfAt = source.indexOf("setPhase('selfgrade')");
const scoreAt = source.indexOf('scoreProbe(');
if (selfAt < 0 || scoreAt < 0 || scoreAt < selfAt) failures.push('follow-up verdict appears before the student reads themself');
forbid(/Segmented|dimensionLabel|<Tag|getPack\(/, 'internal taxonomy or the old pass/fail control leaked into follow-ups');
forbid(/failed|debt|overdue|streak/i, 'follow-up language treats care as debt, failure or a streak');
console.log('verify-v4-followups: checked changed angle, self-grade order, schedule advance and calm return');
if (failures.length) {
  console.error(`verify-v4-followups: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log('verify-v4-followups: care contract holds ✓');
