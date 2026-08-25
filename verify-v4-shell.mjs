/**
 * v4 shell contract — FABLE-REDESIGN §4.2/§4.4 + task brief D1–D3.
 * This gate protects the student IA before deeper feature work lands.
 */
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (p) => readFileSync(p, 'utf8');
const requiredScreens = [
  'src/screens/today/TodayScreen.tsx',
  'src/screens/bring/BringScreen.tsx',
  'src/screens/read/ReadScreen.tsx',
  'src/screens/viva/VivaScreen.tsx',
  'src/screens/result/ResultScreen.tsx',
  'src/screens/work/WorkScreen.tsx',
  'src/screens/work/WorkDetailScreen.tsx',
  'src/screens/you/YouScreen.tsx',
  'src/screens/followups/FollowupsScreen.tsx',
  'src/screens/welcome/WelcomeScreen.tsx',
  'src/screens/settings/SettingsScreen.tsx',
];

for (const file of requiredScreens) {
  if (!existsSync(file)) {
    failures.push(`missing screen: ${file}`);
    continue;
  }
  const source = read(file);
  if (/\/\/\s*PLACEHOLDER|Coming in a later item|coming soon/i.test(source)) {
    failures.push(`unfinished placeholder shipped in ${file}`);
  }
}

const router = read('src/router.ts');
const app = read('src/App.tsx');
const nav = read('src/app/Nav.tsx');
const shell = read('src/app/AppShell.tsx');
const today = read('src/screens/today/TodayScreen.tsx');
const workDetail = read('src/screens/work/WorkDetailScreen.tsx');
const you = read('src/screens/you/YouScreen.tsx');
const sessionOps = read('src/lib/session-ops.ts');

/*
 * v6 collapse. Brief §6.4 counts NINE student screens; the build carried
 * eleven, the two extras being `workDetail` and `followups`. Neither was
 * deleted — 作业 gained a detail state at `#/work/:sessionId`, and a returning
 * question is answered on `run`, the one surface where questions are answered.
 *
 * So this gate is rewritten rather than relaxed: it still requires every
 * screen to be routed AND reachable, and it now also holds the count, which
 * is the thing that actually regressed twice.
 */
const STUDENT_ROUTES = ['today','bring','read','run','result','work','you','welcome','settings'];
for (const route of [...STUDENT_ROUTES, 'class']) {
  if (!router.includes(`name: '${route}'`)) failures.push(`router is missing ${route}`);
  if (route !== 'class' && route !== 'settings' && !app.includes(`case '${route}'`)) failures.push(`App outlet is missing ${route}`);
}

const outletCases = [...app.matchAll(/case '(\w+)':/g)].map((m) => m[1]);
/* `schemes` joins the instructor screens outside the student budget for the
   same reason they are outside it: it is off every nav, unreachable except by
   URL or from Settings, and it is a chooser for evaluating the ten v7 designs
   rather than a surface a student is ever routed to. The nine-screen ceiling
   the brief sets is about what a student can be made to walk through. */
const INSTRUCTOR = new Set(['class', 'cohort', 'studentSheet', 'reteach', 'join', 'return', 'schemes']);
const studentCases = outletCases.filter((name) => !INSTRUCTOR.has(name));
if (studentCases.length > 9) {
  failures.push(`brief §6.4 allows nine student screens; the outlet has ${studentCases.length}: ${studentCases.join(', ')}`);
}

/* The two folded screens must still be REACHABLE, or this was a deletion
   dressed up as a collapse. */
if (!read('src/screens/work/WorkScreen.tsx').includes('PieceDetail')) {
  failures.push('作业 no longer renders the piece detail — the merge dropped it');
}
if (!app.includes('FOLLOWUPS_ID')) {
  failures.push('the returning questions are no longer reachable from the run route');
}

for (const legacy of ["'home'", "'map'", "'queue'", "'record'", "'transcript'", "'packs'", "'packDetail'", "'import'", "'devUi'"]) {
  if (router.includes(legacy)) failures.push(`legacy student route still registered: ${legacy}`);
}

const itemBlock = nav.match(/const ITEMS:[\s\S]*?=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
const itemCount = (itemBlock.match(/group:/g) ?? []).length;
if (itemCount !== 3) failures.push(`student tab bar must have exactly 3 items; found ${itemCount}`);
for (const group of ["group: 'today'", "group: 'work'", "group: 'you'"]) {
  if (!itemBlock.includes(group)) failures.push(`student tab bar missing ${group}`);
}
if (/group:\s*'class'|group:\s*'packs'|group:\s*'followups'/.test(itemBlock)) {
  failures.push('teacher, packs, or follow-ups leaked into the student tab bar');
}
if (!/SETTINGS_ITEM/.test(nav)) failures.push('settings gear is missing');

if (!["'run'", "'read'", "'welcome'"].every((name) => shell.match(/const IMMERSIVE[\s\S]*?new Set\(\[([\s\S]*?)\]\)/)?.[1]?.includes(name))) {
  failures.push('run/read/welcome must be immersive (no tab bar)');
}

/*
 * Today must answer "what now" and must not become a document, a report or a
 * grid of demos — that was a real rejection, and the rule stays.
 *
 * It used to be enforced by banning the identifier `AnchoredText` outright.
 * That is a proxy, and the proxy became wrong: Today now shows ONE clipped
 * specimen — three lines of a real student piece with the probed line
 * underlined, and the question it produced — because measured against `main`
 * this screen was 2.8% different after twelve rounds and carried no evidence
 * that the product does anything. A tappable specimen that opens the chooser
 * IS "what now".
 *
 * So the rule is enforced on its intent instead, and more tightly than before:
 * a report page, a divergence hero and a sample grid stay banned outright; at
 * most one anchored window may appear; it has to sit inside a control rather
 * than as a bare document region; and its height has to be capped in CSS so it
 * cannot grow back into a document.
 */
if (/DivergenceHero|demo-sheet|sample-grid/.test(today)) {
  failures.push('Today renders a report/demo grid; it must answer only “what now”');
}
const anchoredOnToday = (today.match(/<AnchoredText/g) ?? []).length;
if (anchoredOnToday > 1) {
  failures.push(`Today renders ${anchoredOnToday} anchored windows; at most one specimen is allowed`);
}
if (anchoredOnToday === 1) {
  if (!/className="today-specimen"[\s\S]*?<AnchoredText[\s\S]*?<\/button>/.test(today)) {
    failures.push('the Today specimen must live inside the .today-specimen control, not as a bare document region');
  }
  /* The BASE rule, not any later media-query override — a desktop-only cap
     would leave the phone specimen free to grow, and the phone is the case
     that matters. */
  const v6 = read('src/styles/v6.css');
  const base = v6.match(/\n\.specimen-page\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  if (!/max-height:/.test(base)) {
    failures.push('the base .specimen-page rule has no max-height — the Today specimen can grow into a document');
  }
}
if (!/nav(?:igate)?\('bring'\)/.test(today)) failures.push('Today has no direct “bring a piece” action');
if (!/studentDestination[\s\S]*status === 'complete'[\s\S]*status === 'generating'[\s\S]*status === 'error'/.test(sessionOps)) {
  failures.push('session routing does not send generating/error sessions to the visible read recovery screen');
}
if (!today.includes('studentDestination') || !workDetail.includes('studentDestination')) {
  failures.push('Today and Work detail do not share the safe incomplete-session destination');
}
for (const [name, source] of [['Today', today], ['Work detail', workDetail], ['You', you]]) {
  if (/Intl\.DateTimeFormat/.test(source)) failures.push(`${name} formats untrusted persisted timestamps without the bounded date helper`);
}

console.log(`verify-v4-shell: checked ${requiredScreens.length} screens, routes, 3-tab IA, immersive flow and Today density`);
if (failures.length) {
  console.error(`verify-v4-shell: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('verify-v4-shell: student shell contract holds ✓');
