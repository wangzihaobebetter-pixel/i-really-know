/** Result-page gate after FABLE: the person and their words are the hero, not a delta. */
import { readFileSync } from 'node:fs';
const result = readFileSync('src/screens/result/ResultScreen.tsx', 'utf8');
const today = readFileSync('src/screens/today/TodayScreen.tsx', 'utf8');
const css = readFileSync('src/styles/v4.css', 'utf8');
const failures = [];

if (!/result4\.title|result-sentence/.test(result)) failures.push('result sentence is missing');
if (/DivergenceHero|ClaimedHero|divergence-numeral|Math\.abs\([^)]*delta/i.test(result + today)) failures.push('a numeric divergence hero returned to the student surface');
const under = result.indexOf("verdict: 'underclaimed'");
const held = result.indexOf("verdict: 'defended'");
const slipped = result.indexOf("verdict: 'undefended'");
if (!(under >= 0 && under < held && under < slipped)) failures.push('“more steady than you thought” is not the first result group');
if (!/className="result-group-heading t-title"/.test(result)) failures.push('result groups do not share one equal heading style');
if (!/AnchoredText/.test(result) || !/marked-page/.test(result)) failures.push('the marked original page is missing');
if (!/occasionAt|occasion/.test(result)) failures.push('occasion/date framing is missing from the result');
if (!/followup-promise/.test(result) || !/ending-card/.test(result)) failures.push('scheduled return or structural ending is missing');
if (!/\.result-group-heading/.test(css) || !/\.ending-card/.test(css)) failures.push('result hierarchy styles are missing');

console.log('verify-divergence-hero: checked sentence hero, equal outcomes, marked page, occasion and ending');
if (failures.length) { failures.forEach((f) => console.error('  ✗ ' + f)); process.exit(1); }
console.log('verify-divergence-hero: no cold numeric hero remains ✓');
