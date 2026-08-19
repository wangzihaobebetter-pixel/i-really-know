/** Result gate: useful takeaway and the student's words lead; evidence stays available. */
import { readFileSync } from 'node:fs';
const result = readFileSync('src/screens/result/ResultScreen.tsx', 'utf8');
const today = readFileSync('src/screens/today/TodayScreen.tsx', 'utf8');
const shell = readFileSync('src/app/AppShell.tsx', 'utf8');
const css = readFileSync('src/styles/v5.css', 'utf8');
const failures = [];

if (!/result-takeaway/.test(result) || !/v5\.result(AllHeld|Mixed|None)/.test(result)) failures.push('human takeaway is missing');
if (/DivergenceHero|ClaimedHero|divergence-numeral|Math\.abs\([^)]*delta/i.test(result + today)) failures.push('a numeric divergence hero returned to the student surface');
const under = result.indexOf("verdict: 'underclaimed'");
const held = result.indexOf("verdict: 'defended'");
const slipped = result.indexOf("verdict: 'undefended'");
if (!(under >= 0 && under < held && under < slipped)) failures.push('“more steady than you thought” is not the first detailed result group');
if (!/className="result-group-heading t-title"/.test(result)) failures.push('detailed result groups do not share one equal heading style');
if (!/held-voice-card/.test(result) || !/attempt-voice-card/.test(result)) failures.push('the user’s words are not preserved for both held and slipped outcomes');
const voice = result.indexOf('held-voice-card');
const marked = result.indexOf('result-marked-v5');
if (!(voice >= 0 && marked > voice)) failures.push('the user’s words do not precede the evidence document');
if (!/AnchoredText/.test(result) || !/result-marked-v5/.test(result)) failures.push('the marked original page is missing');
if (!/occasionAt|occasion/.test(result)) failures.push('occasion/date framing is missing from the result');
if (!/return-promise-v5/.test(result) || !/ending-v5/.test(result)) failures.push('scheduled return or structural ending is missing');
if (!/['"]result['"]/.test(shell.match(/IMMERSIVE[^\n]*/)?.[0] ?? '')) failures.push('result has not been made immersive');
if (!/\.result-takeaway/.test(css) || !/\.held-voice-card/.test(css) || !/\.ending-v5/.test(css)) failures.push('v5 result hierarchy styles are missing');

console.log('verify-divergence-hero: checked takeaway, own words, marked page, occasion, return and ending');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-divergence-hero: no cold numeric hero remains ✓');
