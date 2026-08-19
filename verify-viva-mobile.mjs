/** Mobile run-through gate: one question, one hand, self-grade before judgment. */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const source = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');
const css = readFileSync('src/styles/v4.css', 'utf8');
const speech = readFileSync('src/lib/speech.ts', 'utf8');
const failures = [];

if (!/probe\.question/.test(source) || !/run-question t-question/.test(source)) failures.push('the one visible question lost its largest-text hook');
if ((source.match(/<textarea/g) || []).length !== 2) failures.push('expected one answer textarea plus one blank-plan textarea in mutually exclusive phases');
if (!/toggleDictation|startDictation|toggleVoice/.test(source) || !/voiceSupported|speechAvailable/.test(source)) failures.push('voice input or its text fallback is missing');
if (/TimerRing|timer-progress|timeLeft/.test(source)) failures.push('a countdown returned to the run-through');
const self = source.indexOf("setPhase('selfgrade')");
const score = source.indexOf('scoreProbe(');
if (self < 0 || score < self) failures.push('model judgment can begin before self-grade');
if (!/run-feedback-line/.test(source) || !/<details className="run-details"/.test(source)) failures.push('reply is not one sentence plus a disclosure');
if (!/min-height:\s*5[246]px/.test(css) && !/min-height:\s*64px/.test(css)) failures.push('mobile answer controls have no explicit thumb-sized target');
if (!/webkitSpeechRecognition|SpeechRecognition/.test(speech)) failures.push('Web Speech capability check is missing');

mkdirSync('.tmp-viva', { recursive: true });
try { execSync('npx esbuild src/screens/viva/VivaScreen.tsx --bundle --platform=browser --format=esm --outfile=.tmp-viva/viva.js', { stdio: 'pipe' }); }
catch { failures.push('VivaScreen no longer bundles independently'); }
rmSync('.tmp-viva', { recursive: true, force: true });

console.log('verify-viva-mobile: checked one-question hierarchy, voice fallback, order, density and touch targets');
if (failures.length) { failures.forEach((f) => console.error('  ✗ ' + f)); process.exit(1); }
console.log('verify-viva-mobile: 390px run-through contract holds ✓');
