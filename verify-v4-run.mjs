/** Run-through contract: task brief §§5–6 and FABLE §4.3. */
import { readFileSync } from 'node:fs';
const source = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const failures = [];
const need = (re, message) => { if (!re.test(source)) failures.push(message); };
const forbid = (re, message) => { if (re.test(source)) failures.push(message); };

need(/type Phase[\s\S]*'answering'[\s\S]*'blankplan'[\s\S]*'selfgrade'[\s\S]*'manualgrade'[\s\S]*'revealed'/, 'phase model must include blank-plan, pre-verdict self-grade and honest keyless manual mark');
need(/setPhase\('selfgrade'\)/, 'committing an answer must enter self-grade before verdict');
need(/findIndex\(\(item\) => !item\.committedAt \|\| !item\.selfGrade \|\| \(!item\.ai && item\.manualScore === undefined\)\)/, 'resume must return to a committed probe whose self-read or judgement is unfinished');
need(/manualScore/, 'keyless path must store a post-rubric manual mark separate from the pre-verdict self read');
need(/reference[\s\S]*<details|<details[\s\S]*reference/, 'the rubric/explanation must live in a collapsed disclosure');
need(/blankplan/, '“I would blank” must become a plan for finding out, not a skip');
need(/nav\('result'/, 'the last question must end on the humane result/ending screen');
need(/hasJudgment[\s\S]*\{hasJudgment && \([\s\S]*onClick=\{next\}/, 'next/finish can bypass a failed model judgement before manual marking');

const selfAt = source.indexOf("setPhase('selfgrade')");
const scoreAt = source.indexOf('scoreProbe(');
if (selfAt < 0 || scoreAt < 0 || scoreAt < selfAt) failures.push('model scoring appears before self-grade is collected');

forbid(/ScorePip|TimerRing|DimensionLedger|probe\.kind|dimensionLabel|<Tag/, 'scores, timers or internal taxonomy leaked into the student run screen');
forbid(/evidence\.present\.map|evidence\.missing\.map/, 'immediate response still dumps evidence modules instead of one sentence + disclosure');
forbid(/notmine[^\n]*actually|actually[^\n]*notmine/i, 'author-identity confession language returned');

console.log('verify-v4-run: checked self-grade order, blank method, keyless honesty, disclosure density and ending route');
if (failures.length) {
  console.error(`verify-v4-run: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log('verify-v4-run: run-through contract holds ✓');
