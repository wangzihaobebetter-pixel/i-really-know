/**
 * "Never accuse", enforced as a build-time lint. P3 §5.2.
 *
 * The moat is not the ethic, it is the evidence. Detectors output "87%
 * AI-generated" — unfalsifiable and litigable. This product outputs "the
 * student could not defend line 23 of their own submission" — student present,
 * evidence-based, survives an appeal. That distinction stops being real the
 * moment one string on an instructor surface says "suspicious".
 *
 * SCOPE — this reads THE APP'S OWN STRINGS ONLY, never student-submitted
 * content. Linting submissions would flag a student who wrote the word
 * "plagiarism" in an essay about plagiarism, which is the same category error
 * the product exists to avoid.
 *
 * TWO CHECKS:
 *   1. DENYLIST, bilingual. No instructor-surface string may contain an
 *      accusation term or a probability/percentage of authorship.
 *   2. CLOSED VERB LIST. Any string that reports an OUTCOME must use one of
 *      the six permitted forms. This is the narrower check and it applies to
 *      the verdict vocabulary rather than to prose.
 *
 * COST, stated: a bilingual denylist has to be maintained, and it will
 * occasionally block a legitimate phrasing and need an explicit allow. The
 * allow list is at the bottom of this file and every entry needs a reason.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** i18n packages that render on an instructor surface. */
const INSTRUCTOR_PACKAGES = ['sheet', 'reteach'];

/** Screens whose literal JSX text is also instructor-facing. */
const INSTRUCTOR_SCREENS = [
  'src/screens/class/StudentSheetScreen.tsx',
  'src/screens/class/ReteachScreen.tsx',
];

/**
 * STUDENT PACKAGES — FABLE-REDESIGN §8 row M11 extends the never-accuse gate
 * to student surfaces too. The kill list (§1.1) calls out exactly the words
 * the owner rejected as 「极度冰冷和粗糙」: accuse, illusion, borrowed,
 * wrong about yourself, not yours. These cannot appear on any string the
 * student reads.
 *
 * Namespace mapping: the design renames the surfaces (#/today, #/result)
 * but the i18n keys still live under `home` (Today) and `map` (Result), with
 * `viva` covering the run-through.
 */
const STUDENT_PACKAGES = ['viva', 'map', 'home'];
const STUDENT_SCREENS = [
  'src/screens/today/TodayScreen.tsx',
  'src/screens/viva/VivaScreen.tsx',
  'src/screens/followups/FollowupsScreen.tsx',
];

/** Student-surface denylist. Each term maps to a reason. */
const STUDENT_DENY = [
  { re: /\baccuse[sd]?\b/i,                 why: 'student-facing accusation' },
  { re: /\baccusation[s]?\b/i,              why: 'student-facing accusation' },
  { re: /\billusion[s]?\b/i,                why: 'retired student-facing term' },
  { re: /\bborrowed\b/i,                    why: 'retired student-facing term' },
  { re: /wrong about yourself/i,             why: 'retired student-facing phrase' },
  { re: /\bnot\s+yours\b/i,                why: 'retired student-facing phrase' },
  // Chinese
  { re: /指控/,                               why: 'student-facing accusation' },
  { re: /幻觉/,                               why: 'retired student-facing term' },
  { re: /借用/,                               why: 'retired student-facing term' },
  { re: /不是你的/,                            why: 'retired student-facing phrase' },
  { re: /你自己.{0,4}判断错/,                  why: 'retired student-facing phrase' },
];

const DENY = [
  // English
  { re: /\bcheat(s|ed|ing|er)?\b/i,            why: 'accusation' },
  { re: /\bplagiaris(m|e|ed|ing|t)\b/i,        why: 'accusation' },
  { re: /\bAI[- ]generated\b/i,                why: 'authorship claim' },
  { re: /\bmachine[- ]generated\b/i,           why: 'authorship claim' },
  { re: /\bdishonest(y)?\b/i,                  why: 'accusation' },
  { re: /\bmisconduct\b/i,                     why: 'accusation' },
  { re: /\bsuspicious\b/i,                     why: 'accusation' },
  { re: /\bsuspect(ed|s)?\b/i,                 why: 'accusation' },
  { re: /\bfake\b/i,                           why: 'accusation' },
  { re: /\bfraud(ulent)?\b/i,                  why: 'accusation' },
  { re: /\bdetector\b/i,                       why: 'positions the product as a detector' },
  { re: /\bdetection\s+(score|rate|tool)\b/i,  why: 'positions the product as a detector' },
  { re: /\bdid\s+not\s+write\b/i,              why: 'authorship claim' },
  { re: /\bnot\s+(their|his|her)\s+own\s+work\b/i, why: 'authorship claim' },
  { re: /\bcopied\b/i,                         why: 'accusation' },
  // Chinese
  { re: /作弊/,                                 why: 'accusation' },
  { re: /抄袭/,                                 why: 'accusation' },
  { re: /代写/,                                 why: 'authorship claim' },
  { re: /AI\s*生成/,                            why: 'authorship claim' },
  { re: /机器生成/,                              why: 'authorship claim' },
  { re: /可疑/,                                 why: 'accusation' },
  { re: /造假/,                                 why: 'accusation' },
  { re: /检测器/,                                why: 'positions the product as a detector' },
  { re: /学术不端/,                              why: 'accusation' },
  { re: /不是.{0,4}本人写/,                       why: 'authorship claim' },
];

/**
 * P3 §5.1: no percentage anywhere on an instructor artefact. The stated reason
 * is that "a number is disputed on appeal; an evidence row is read" — which is
 * a rule about numbers describing THIS STUDENT.
 *
 * P3 §5.3.3 simultaneously REQUIRES a footnote carrying the Knof 2024
 * distribution (18.5% / 35.5% / 46.0%, N=426) so the instructor can read this
 * student's gap against a published baseline instead of against a hunch.
 *
 * Those two are only in conflict if the rule is read as "no % character".
 * Resolved here by enforcing what §5.1 actually protects: a percentage is
 * forbidden UNLESS the same string carries a literature citation, which makes
 * it a statement about a published population and not about the student in
 * front of you. A citation means an author-and-year plus a sample size.
 * Recorded as a judgement call in LOG 012.
 */
const PERCENT = /\d+(\.\d+)?\s*(%|％|percent|百分)/i;
const CITATION = /\b(19|20)\d{2}\b[\s\S]*\bN\s*=\s*\d+/i;

/**
 * Outcome vocabulary, closed. P3 §5.2. A string registered under one of these
 * keys must be one of the permitted forms and nothing else.
 */
const OUTCOME_KEYS = [
  'common.verdict.defended', 'common.verdict.partial', 'common.verdict.undefended',
  'common.verdict.underclaimed', 'common.verdict.none',
  'sheet.noAnswer', 'sheet.declined', 'sheet.notClaimed',
];
const ALLOWED_OUTCOMES = new Set([
  'Defended', 'Partly defended', 'Could not defend', 'Defended, not claimed',
  'Not examined', 'No response recorded', 'Declined to answer', 'Not claimed',
  '辩护住了', '辩护了一半', '没能辩护', '辩护住了但没认', '未考',
  '未记录到回答', '学生表示无法回答', '未自认掌握',
]);

/**
 * Explicit allows. Every entry needs a reason, and the reason has to be that
 * the string is REFUSING the accusation rather than making one.
 */
const ALLOW = [
  {
    key: 'sheet.method',
    why: 'The method statement must NAME what is not being measured in order to disclaim it. This sentence is the reason the sheet survives an appeal.',
  },
  {
    key: 'sheet.noPercentage',
    why: 'Explains why the document carries no percentage. Mentions the concept in order to refuse it.',
  },
];
const ALLOWED_KEYS = new Set(ALLOW.map((a) => a.key));

/* ---------- collect the strings ---------- */

const files = execSync("find src -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' })
  .trim().split('\n');

const strings = [];   // { key, lang, text, file }

for (const f of files.filter((x) => x.includes('/i18n/'))) {
  const src = readFileSync(f, 'utf8');
  for (const block of src.matchAll(/registerStrings\('([\w-]+)',\s*\{([\s\S]*?)\n\}\);/g)) {
    const pkg = block[1];
    const isInstructor = INSTRUCTOR_PACKAGES.includes(pkg);
    const isStudent = STUDENT_PACKAGES.includes(pkg);
    if (!isInstructor && !isStudent) continue;
    const surface = isInstructor ? 'instructor' : 'student';
    const body = block[2];
    const enStart = body.indexOf('en: {');
    const zhStart = body.indexOf("'zh-CN': {");
    for (const [lang, section] of [
      ['en', enStart >= 0 ? body.slice(enStart, zhStart > enStart ? zhStart : undefined) : ''],
      ['zh-CN', zhStart >= 0 ? body.slice(zhStart) : ''],
    ]) {
      for (const m of section.matchAll(/^\s{4}'?([\w.]+)'?:\s*'((?:[^'\\]|\\.)*)'/gm)) {
        strings.push({
          key: m[1].startsWith(`${pkg}.`) ? m[1] : `${pkg}.${m[1]}`,
          lang, text: m[2].replace(/\\'/g, "'"), file: f, surface,
        });
      }
    }
  }
  /* Outcome vocabulary lives in common.* but renders on the sheet. */
  for (const block of src.matchAll(/registerStrings\('common',\s*\{([\s\S]*?)\n\}\);/g)) {
    const body = block[1];
    const enStart = body.indexOf('en: {');
    const zhStart = body.indexOf("'zh-CN': {");
    for (const [lang, section] of [
      ['en', enStart >= 0 ? body.slice(enStart, zhStart > enStart ? zhStart : undefined) : ''],
      ['zh-CN', zhStart >= 0 ? body.slice(zhStart) : ''],
    ]) {
      for (const m of section.matchAll(/^\s{4}'?([\w.]+)'?:\s*'((?:[^'\\]|\\.)*)'/gm)) {
        const key = m[1].startsWith('common.') ? m[1] : `common.${m[1]}`;
        if (OUTCOME_KEYS.includes(key)) {
          strings.push({ key, lang, text: m[2].replace(/\\'/g, "'"), file: f, outcome: true, surface: 'instructor' });
        }
      }
    }
  }
}

/* Literal JSX text on the instructor screens, so a hard-coded English word
   cannot slip past the i18n layer. */
for (const f of INSTRUCTOR_SCREENS) {
  const src = readFileSync(f, 'utf8');
  const code = src.split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))   // comments explain the rules; they are not UI
    .join('\n');
  for (const m of code.matchAll(/>([^<>{}\n]{4,})</g)) {
    const text = m[1].trim();
    if (text) strings.push({ key: `${f}:jsx`, lang: 'literal', text, file: f, surface: 'instructor' });
  }
}

/* Student-surface literal JSX text — same gate as instructor screens,
   so a hard-coded English word cannot slip past the i18n layer on a Today,
   Viva or Followups row. */
for (const f of STUDENT_SCREENS) {
  const src = readFileSync(f, 'utf8');
  const code = src.split('\n')
    .filter((l) => !/^\s*(\*|\/|\/\*)/.test(l))
    .join('\n');
  for (const m of code.matchAll(/>([^<>{}\n]{4,})</g)) {
    const text = m[1].trim();
    if (text) strings.push({ key: `${f}:jsx`, lang: 'literal', text, file: f, surface: 'student' });
  }
}

/* ---------- check ---------- */

const failures = [];

for (const s of strings) {
  if (ALLOWED_KEYS.has(s.key)) continue;

  /* Pick the denylist for this surface. Instructor strings run DENY plus
     the closed outcome vocabulary; student strings run STUDENT_DENY. */
  const denylist = s.surface === 'student' ? STUDENT_DENY : DENY;
  for (const rule of denylist) {
    if (rule.re.test(s.text)) {
      failures.push(`${s.key} [${s.lang}] contains a forbidden term on a ${s.surface} surface (${rule.why})\n      → ${s.text.slice(0, 120)}`);
    }
  }
  if (PERCENT.test(s.text) && !CITATION.test(s.text)) {
    failures.push(`${s.key} [${s.lang}] carries a percentage with no literature citation. An instructor artefact reports evidence rows about this student, not numbers about them.\n      → ${s.text.slice(0, 120)}`);
  }
  if (s.outcome && !ALLOWED_OUTCOMES.has(s.text)) {
    failures.push(`${s.key} [${s.lang}] is an outcome string outside the closed vocabulary\n      → "${s.text}"`);
  }
}

/* The method statement is not optional: an evidence sheet without it is an
   assessment, and P3 §5.3.2 calls it the document's most important element. */
const hasMethod = strings.some((s) => s.key === 'sheet.method' && s.text.length > 120);
if (!hasMethod) failures.push('sheet.method is missing or too short to be a method statement');

const sheetSource = readFileSync('src/screens/class/StudentSheetScreen.tsx', 'utf8');
if (!sheetSource.includes("t('sheet.method')")) {
  failures.push('The evidence sheet does not render sheet.method. It must always be present.');
}
if (!sheetSource.includes("t('sheet.signTitle')")) {
  failures.push('The evidence sheet has no instructor sign-off block. The AI never publishes.');
}

const cited = strings.filter((s) => PERCENT.test(s.text) && CITATION.test(s.text));
const instCount = strings.filter((s) => s.surface === 'instructor').length;
const stuCount = strings.filter((s) => s.surface === 'student').length;
console.log(`verify-never-accuse: ${strings.length} strings checked (instructor ${instCount}, student ${stuCount}) against DENY ${DENY.length} + STUDENT_DENY ${STUDENT_DENY.length} denied terms`);
if (cited.length) {
  console.log(`  ${cited.length} string(s) carry a percentage WITH a citation, which is permitted:`);
  for (const c of cited) console.log(`    · ${c.key} [${c.lang}]`);
}
console.log(`  allow-list: ${ALLOW.length} explicit exception(s)`);
for (const a of ALLOW) console.log(`    · ${a.key} — ${a.why}`);

if (failures.length) {
  console.error(`\nverify-never-accuse: ${failures.length} FAILURE(S)`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-never-accuse: no instructor-surface string accuses anyone ✓');
