/** Heartfelt v5 product gate — protects the redesign from regressing into a framework. */
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const welcome = read('src/screens/welcome/WelcomeScreen.tsx');
const today = read('src/screens/today/TodayScreen.tsx');
const bring = read('src/screens/bring/BringScreen.tsx');
const run = read('src/screens/viva/VivaScreen.tsx');
const result = read('src/screens/result/ResultScreen.tsx');
const work = read('src/screens/work/WorkScreen.tsx');
const workDetail = read('src/screens/work/WorkDetailScreen.tsx');
const you = read('src/screens/you/YouScreen.tsx');
const followups = read('src/screens/followups/FollowupsScreen.tsx');
const settings = read('src/screens/settings/SettingsScreen.tsx');
const shell = read('src/app/AppShell.tsx');
const nav = read('src/app/Nav.tsx');
const tokens = read('src/styles/tokens.css');
const css = read('src/styles/v5.css');
const store = read('src/store/index.ts');
const failures = [];
const need = (condition, message) => { if (!condition) failures.push(message); };

need(/welcomeFind/.test(welcome) && !/STEPS\s*=\s*6|welcome-progress/.test(welcome), 'cold start returned to a static multi-step tour');
need(/welcome-passage/.test(welcome) && /Not answerable by copying/.test(welcome), 'cold start no longer demonstrates the non-copyable mechanism');
need(/next-room-card|new-room-card/.test(today) && /occasionAt/.test(today), 'Today lost its room/date lead object');
need(/today-kept/.test(today) && /dueDifferent/.test(today), 'Today no longer remembers due returns');
need(/PRESET_DIFFICULTY\[pace\]/.test(bring) && /pace-v5/.test(bring), 'Bring no longer binds the chosen run length to the session');
need(/PRESET_COUNTS\[session\.preset\]/.test(read('src/screens/read/ReadScreen.tsx')), 'visible reading ignores the session’s chosen length');
need(/v5-run-source living-source/.test(run) && /v5-answer-dock/.test(run), 'run-through lost the causal margin or thumb answer dock');
need(/v5-self-read/.test(run) && run.indexOf("setPhase('selfgrade')") < run.indexOf('scoreProbe('), 'self-read is not a first-class state before judgment');
need(/addTargets\(targetsFromSession\(completed\)\)/.test(run) && run.indexOf('addTargets(targetsFromSession(completed))') < run.indexOf("nav('result'"), 'completion does not schedule returns before Result mounts');
need(/held-voice-card/.test(result) && /attempt-voice-card/.test(result), 'Result fails to preserve the user’s words across outcomes');
need(!/queue\.some\(\(target\) => target\.sessionId === session\.id\)/.test(result) && /addTargets\(targetsFromSession\(session\)\)/.test(result), 'Result suppresses missing weak-probe targets when only part of a session queue exists');
need(result.indexOf('held-voice-card') < result.indexOf('result-marked-v5'), 'Result puts evidence before the user’s words');
need(/ending-v5/.test(result) && /return-promise-v5/.test(result), 'Result lost its return promise or structural ending');
need(/heldWord/.test(work) && /work-piece-v5/.test(work), 'Work returned to a generic file list');
need(/parentSessionId \?\? session\.id/.test(work) && !/title\.trim\(\)\.toLocaleLowerCase/.test(work), 'Work still merges unrelated pieces by title');
need(/parentSessionId:\s*rootId/.test(workDetail) && /createSession/.test(workDetail), 'a piece cannot start another linked run-through');
need(/voice-bank-v5/.test(you) && you.indexOf('voice-bank-v5') < you.indexOf('read-yourself-v5'), 'You does not put the user’s own words first');
need(/followupWords/.test(you) && /attempt\.score/.test(you), 'held follow-up answers never enter the user’s words bank');
need(/followup-run-v5/.test(followups) && /v5-answer-dock/.test(followups), 'follow-ups no longer reuse the main run-through experience');
need(!/window\.confirm/.test(settings), 'data deletion regressed to a system confirm dialog');
need(!/settings\.count|settings\.preset|settings\.difficulty/.test(settings), 'developer run controls returned to Settings');
need(/const tabs: NavItem\[\] = ITEMS/.test(nav) && !/\.\.\.ITEMS, SETTINGS_ITEM/.test(nav), 'Settings returned as a fourth student tab');
const immersive = shell.match(/IMMERSIVE[^\n]*/)?.[0] ?? '';
for (const route of ['bring', 'run', 'read', 'result', 'followups', 'welcome']) need(immersive.includes(`'${route}'`), `${route} is not immersive`);
need(/theme: 'paper'/.test(store) && /theme === 'system'\) setSettings\(\{ theme: 'paper' \}\)/.test(read('src/app/theme.tsx')), 'light is no longer the real default');
need(/--counter-accent:\s*#3B63F3/i.test(tokens) && /--warm-signal:\s*#F5C84B/i.test(tokens), 'Living Margin palette tokens are missing');
need(/\.living-mark/.test(css) && /\.room-orbit/.test(css) && /\.held-voice-card/.test(css), 'ownable Living Margin objects are missing from the shipped CSS');
need(/:lang\(zh-CN\) \.v5-question-block \.run-question \{ font-size: 1\.65rem/.test(css), 'Chinese question cap is missing');
need(/:lang\(zh-CN\) \.result-takeaway h1 \{ font-size: 1\.8rem/.test(css), 'Chinese result-takeaway cap is missing');

console.log('verify-v5-product: checked cold start, room framing, living margin, own words, returns, IA and default theme');
if (failures.length) { failures.forEach((failure) => console.error(`  ✗ ${failure}`)); process.exit(1); }
console.log('verify-v5-product: heartfelt product contract holds ✓');
