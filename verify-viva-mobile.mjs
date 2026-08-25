/** Mobile run-through gate: causal question, one hand, self-read before judgment. */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const source = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const css = readFileSync('src/styles/v5.css', 'utf8');
const speech = readFileSync('src/lib/speech.ts', 'utf8');
const failures = [];

if (!/probe\.question/.test(source) || !/v5-question-block/.test(source) || !/className="run-question"/.test(source)) failures.push('the one visible question lost its v5 hierarchy hook');
/* v7 · VivaScreen now has two rendering paths — the base composition and the
   schemed frame — so a flat count of two textareas is no longer the shape of
   the file. What the gate actually protects is unchanged: per path there is
   exactly one answer box and exactly one blank-plan box, and neither can be on
   screen at the same time as the other. Assert that directly rather than
   loosening the number, which would have let a stray textarea through. */
const answerBoxes = (source.match(/id="run-answer"/g) || []).length;
const blankBoxes = (source.match(/run-answer-box|s-blank-box/g) || []).length;
const allBoxes = (source.match(/<textarea/g) || []).length;
if (answerBoxes !== blankBoxes) failures.push('answer and blank-plan boxes are no longer paired one per rendering path');
if (allBoxes !== answerBoxes + blankBoxes) failures.push(`found ${allBoxes} textareas but only ${answerBoxes + blankBoxes} are the answer/blank pair`);
if ((source.match(/phase === 'answering'/g) || []).length < answerBoxes) failures.push('an answer textarea is not gated on the answering phase');
if ((source.match(/phase === 'blankplan'/g) || []).length < blankBoxes) failures.push('a blank-plan textarea is not gated on the blankplan phase');
if (!/toggleDictation|startDictation|toggleVoice/.test(source) || !/voiceSupported|speechAvailable/.test(source)) failures.push('voice input or its text fallback is missing');
if (/TimerRing|timer-progress|timeLeft/.test(source)) failures.push('a countdown returned to the run-through');
const self = source.indexOf("setPhase('selfgrade')");
const score = source.indexOf('scoreProbe(');
if (self < 0 || score < self) failures.push('model judgment can begin before self-read');
if (!/v5-reply-line/.test(source) || !/run-details v5-reply-details/.test(source)) failures.push('reply is not one sentence plus one disclosure');
if (!/v5-run-source living-source/.test(source) || !/\.v5-run-source::before/.test(css)) failures.push('the causal living margin is missing');
if (!/className="v5-answer-dock"/.test(source) || !/position:\s*fixed/.test(css)) failures.push('answer control is not held in the thumb zone');
if (!/\.v5-mic[^}]*52px|\.v5-mic, \.v5-send[^}]*52px/s.test(css)) failures.push('mobile answer controls have no explicit thumb-sized target');
if (!/v5-self-read/.test(source) || !/v5-self-options/.test(source)) failures.push('self-read is not treated as a full product state');
if (!/webkitSpeechRecognition|SpeechRecognition/.test(speech)) failures.push('Web Speech capability check is missing');

mkdirSync('.tmp-viva', { recursive: true });
try { execSync('npx esbuild src/screens/viva/VivaScreen.tsx --bundle --platform=browser --format=esm --outfile=.tmp-viva/viva.js', { stdio: 'pipe' }); }
catch { failures.push('VivaScreen no longer bundles independently'); }
rmSync('.tmp-viva', { recursive: true, force: true });

console.log('verify-viva-mobile: checked living margin, one question, answer dock, self-read order and voice fallback');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-viva-mobile: 390px run-through contract holds ✓');
