/** Mobile run-through gate: causal question, one hand, self-read before judgment. */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const source = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const css = readFileSync('src/styles/v5.css', 'utf8');
const speech = readFileSync('src/lib/speech.ts', 'utf8');
const failures = [];

if (!/probe\.question/.test(source) || !/v5-question-block/.test(source) || !/className="run-question"/.test(source)) failures.push('the one visible question lost its v5 hierarchy hook');
if ((source.match(/<textarea/g) || []).length !== 2) failures.push('expected one answer textarea plus one blank-plan textarea in mutually exclusive phases');
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
