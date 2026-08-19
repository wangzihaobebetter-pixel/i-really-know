/**
 * P3 §9 item 7 — Instructor evidence sheet and reteach map are
 * print-register documents, with the vocabulary lint that locks
 * the "never accuse" moat.
 *
 * The two instructor surfaces are the only artefacts a professor
 * actually takes away: the per-student evidence sheet and the class
 * reteach map. They are institutional documents, not app screens:
 *
 *   - print-register: .col-doc + .doc + .doc-masthead + .doc-method,
 *     with .no-print stripping chrome in the @media print block so
 *     the professor prints to PDF and ships it.
 *   - fixed 5-section shape on the sheet (masthead / method /
 *     calibration / passage rows / sign-off) and fixed 2-panel
 *     shape on the reteach map (panel 1 ranks concepts, panel 2
 *     separates over- and under-confident) — the shape is the
 *     thing an instructor recognises.
 *   - i18n symmetry: every sheet.* and reteach.* key the screens
 *     read is present in BOTH en and zh-CN, because a missing
 *     string ships as literal `sheet.method` on a professor's PDF
 *     and that is the failure this verifier exists to prevent.
 *   - never-accuse lint reaches sheet and reteach: verify-never-
 *     accuse.mjs declares INSTRUCTOR_PACKAGES = ['sheet', 'reteach']
 *     AND INSTRUCTOR_SCREENS = [StudentSheet, Reteach]. Any drift
 *     back to a denylisted word OR a removed screen from that
 *     list fails this build.
 *
 * If any of the following regresses, this file fails the build:
 *   1. Either screen drops the .doc / .doc-masthead / .doc-method
 *      wrapper — the print-register invariant is gone.
 *   2. Either screen loses the @media print + .no-print coupling —
 *      a professor prints it and the back button is on the page.
 *   3. Either screen loses one of the five sheet sections or one
 *      of the two reteach panels — the document shape collapses.
 *   4. Any required sheet.* or reteach.* key is missing from en
 *      or zh-CN — the screen falls back to the raw key on a
 *      professor's PDF.
 *   5. verify-never-accuse.mjs stops covering sheet + reteach
 *      strings or stops covering the two screens — the moat is
 *      gone and the build still passes.
 *   6. The reteach panel 1 row loses the .reteach-row / .reteach-
 *      track / .reteach-bar triplet — the row collapses into a
 *      bare list and the ranking stops reading as a map.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const fails = [];
const note = (m) => console.log('  ' + m);

/* ---- 1. source: sheet has the five sections ---- */

const sheet = readFileSync('src/screens/class/StudentSheetScreen.tsx', 'utf8');

const sheetShape = [
  { cls: 'doc-masthead', label: 'masthead (.doc-masthead)' },
  { cls: 'doc-method',   label: 'method statement (.doc-method)' },
  { cls: 'calibrationTitle', label: 'calibration section (sheet.calibrationTitle)' },
  { cls: 'rowsTitle',    label: 'passage rows section (sheet.rowsTitle)' },
  { cls: 'signTitle',    label: 'sign-off (sheet.signTitle)' },
];
for (const s of sheetShape) {
  if (!sheet.includes(s.cls)) {
    fails.push(`StudentSheetScreen.tsx is missing the ${s.label} section — the print-register shape collapsed`);
  }
}
if (!sheet.includes('<article className="doc">')) {
  fails.push('StudentSheetScreen.tsx is missing <article className="doc"> — the print-register wrapper is gone');
}
if (!sheet.includes('col-doc')) {
  fails.push('StudentSheetScreen.tsx is missing .col-doc — the document is no longer constrained to the print column');
}
if (!sheet.includes('no-print')) {
  fails.push('StudentSheetScreen.tsx is missing a .no-print affordance — chrome ships on the printed PDF');
}
note('sheet: 5-section shape + print wrapper present');

/* ---- 2. source: reteach has the two panels ---- */

const reteach = readFileSync('src/screens/class/ReteachScreen.tsx', 'utf8');

const reteachShape = [
  { cls: 'panel1', label: 'panel 1 (reteach.panel1, concepts ranked)' },
  { cls: 'panel2', label: 'panel 2 (reteach.panel2, over/under split)' },
];
for (const s of reteachShape) {
  if (!reteach.includes(s.cls)) {
    fails.push(`ReteachScreen.tsx is missing the ${s.label} — the two-panel shape collapsed`);
  }
}
if (!reteach.includes('<article className="doc">')) {
  fails.push('ReteachScreen.tsx is missing <article className="doc"> — the print-register wrapper is gone');
}
if (!reteach.includes('col-doc')) {
  fails.push('ReteachScreen.tsx is missing .col-doc — the document is no longer constrained to the print column');
}
if (!reteach.includes('no-print')) {
  fails.push('ReteachScreen.tsx is missing a .no-print affordance — chrome ships on the printed PDF');
}
if (!reteach.includes('reteach-row') || !reteach.includes('reteach-track') || !reteach.includes('reteach-bar')) {
  fails.push('ReteachScreen.tsx panel 1 row lost the .reteach-row / .reteach-track / .reteach-bar triplet — the ranking no longer reads as a map');
}
note('reteach: 2-panel shape + row triplet + print wrapper present');

/* ---- 3. css: @media print + .no-print + reteach row primitives ---- */

const base = readFileSync('src/styles/base.css', 'utf8');
if (!/@media\s+print[\s\S]*?\.no-print\s*\{\s*display:\s*none\s*!important/.test(base)) {
  fails.push('base.css @media print block no longer hides .no-print — chrome ships on every printed PDF');
} else {
  note('css: @media print hides .no-print');
}

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
if (!/--col-doc:\s*\d+px/.test(tokens)) {
  fails.push('tokens.css is missing the --col-doc token — the document column width is undeclared');
} else {
  note('css: --col-doc token declared');
}

/* ---- 4. i18n: every sheet.* and reteach.* key the screens read is in BOTH en and zh-CN ---- */

const v3 = readFileSync('src/i18n/v3.ts', 'utf8');

function extractLangBlock(src, pkg, lang) {
  /* Find the package registerStrings block. The package's outer object is
     `{ en: {...}, 'zh-CN': {...} }`. To avoid the brace walker tripping on
     template-literal `{name}` placeholders inside string values, we locate
     each language key by string-search, then take the substring between
     that language key and the NEXT top-level `,` followed by either
     `\n  'zh-CN':` or the closing `}`. */
  const pkgIdx = src.indexOf("registerStrings('" + pkg + "'");
  if (pkgIdx < 0) return '';
  /* Find the OUTER brace of the package argument object. The signature is
     `registerStrings('pkg', {` so the first `{` after pkgIdx is that brace. */
  const outerOpen = src.indexOf('{', pkgIdx);
  /* Find the matching close by scanning forward, tracking nesting but
     SKIPPING braces that sit inside string literals (single-quoted). The
     package block in v3.ts has no other quote styles; apostrophes inside
     English values are fine because they only open/close within one line. */
  let depth = 1;
  let i = outerOpen + 1;
  let inStr = false;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (inStr) {
      if (c === "'") inStr = false;
    } else {
      if (c === "'") inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
    }
    i++;
  }
  const pkgBlock = src.slice(outerOpen, i);

  /* Within pkgBlock, find the start of this language's table. `en` is bare,
     `zh-CN` is quoted. Use indexOf on the literal header. */
  const enHeader = '\n  en: {';
  const zhHeader = "\n  'zh-CN': {";
  const start = lang === 'en' ? enHeader : zhHeader;
  const startIdx = pkgBlock.indexOf(start);
  if (startIdx < 0) return '';
  const bodyStart = startIdx + start.length;
  /* The body ends at the matching `}` of the language's opening brace.
     Walk forward from bodyStart. */
  let d2 = 1;
  let j = bodyStart;
  let inStr2 = false;
  while (j < pkgBlock.length && d2 > 0) {
    const c = pkgBlock[j];
    if (inStr2) {
      if (c === "'") inStr2 = false;
    } else {
      if (c === "'") inStr2 = true;
      else if (c === '{') d2++;
      else if (c === '}') d2--;
    }
    j++;
  }
  return pkgBlock.slice(bodyStart, j - 1);
}

const REQUIRED_SHEET_KEYS = [
  'title','course','student','date','methodTitle','method',
  'calibrationTitle','calibrationLine','rowsTitle',
  'rowSpan','rowProbe','rowAnswer','rowOutcome','rowClaim',
  'noAnswer','declined','notClaimed','keyTitle',
  'signTitle','signName','signDate','signNote','print',
];
const REQUIRED_RETEACH_KEYS = [
  'title','subtitle','panel1','countLine','expand','collapse',
  'deidentified','showNames','hideNames','panel2','panel2Hint',
  'axisOver','axisUnder','axisZero','empty','noPeople','students',
];

for (const lang of ['en', 'zh-CN']) {
  const sheetBlock = extractLangBlock(v3, 'sheet', lang);
  for (const k of REQUIRED_SHEET_KEYS) {
    if (sheetBlock.indexOf('\n    ' + k + ':') < 0) {
      fails.push('i18n sheet.' + lang + ' is missing key `' + k + '` — professor PDF would print literal "sheet.' + k + '"');
    }
  }
  const reteachBlock = extractLangBlock(v3, 'reteach', lang);
  for (const k of REQUIRED_RETEACH_KEYS) {
    if (reteachBlock.indexOf('\n    ' + k + ':') < 0) {
      fails.push('i18n reteach.' + lang + ' is missing key `' + k + '` — professor PDF would print literal "reteach.' + k + '"');
    }
  }
}
note('i18n: ' + REQUIRED_SHEET_KEYS.length + ' sheet keys + ' + REQUIRED_RETEACH_KEYS.length + ' reteach keys present in en + zh-CN');

/* ---- 5. lint: verify-never-accuse covers sheet/reteach strings AND the two screens ---- */

const never = readFileSync('verify-never-accuse.mjs', 'utf8');
if (!/INSTRUCTOR_PACKAGES\s*=\s*\[[\s\S]*?'sheet'[\s\S]*?'reteach'[\s\S]*?\]/.test(never)) {
  fails.push('verify-never-accuse.mjs INSTRUCTOR_PACKAGES no longer lists both \'sheet\' and \'reteach\' — the instructor surface is no longer linted');
} else {
  note('lint: never-accuse INSTRUCTOR_PACKAGES = [sheet, reteach]');
}
if (!never.includes('StudentSheetScreen.tsx') || !never.includes('ReteachScreen.tsx')) {
  fails.push('verify-never-accuse.mjs no longer references StudentSheetScreen.tsx and ReteachScreen.tsx — the screen-literal lint is gone');
} else {
  note('lint: never-accuse INSTRUCTOR_SCREENS references both class screens');
}

/* ---- 6. compile the two screens via esbuild ---- */

try {
  execSync(
    'npx esbuild src/screens/class/StudentSheetScreen.tsx src/screens/class/ReteachScreen.tsx --format=esm --outdir=/tmp/_vprk-class --jsx=automatic --loader:.tsx=tsx --loader:.ts=ts --bundle=false',
    { stdio: 'pipe' }
  );
  note('compile: StudentSheetScreen.tsx + ReteachScreen.tsx build via esbuild');
} catch (e) {
  fails.push('StudentSheetScreen.tsx or ReteachScreen.tsx failed to compile via esbuild: ' + (e.stderr || e.message).slice(0, 300));
}

/* ---- report ---- */

if (fails.length) {
  console.error('\nFAIL — verify-class-print-register.mjs:');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\n  ✓ 6/6 sections pass — instructor evidence sheet + reteach map locked as print-register documents with the never-accuse lint');
