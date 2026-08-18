/**
 * Regression for P3 §2.2 / §9 item 3 — the verdict map split.
 *
 * The single change that fixed the 46% plurality (Knof 2024, N=426) being
 * silently painted green was the `undersold: 'underclaimed'` line in
 * `analysis.ts` + an Axis-A `Verdict` field called `underclaimed` + a CSS rule
 * `.anchor-underclaimed`. If any of those three ever regresses (or if the i18n
 * strings disappear), this file fails the build. It exists because:
 *
 *   1. `verify-divergence.mjs` tests the divergence classifier — it confirms
 *      that `classifyDivergence('shaky', 3)` returns `'undersold'`. It does NOT
 *      prove that `verdictOf` then maps `'undersold'` to `'underclaimed'` and
 *      NOT to `'defended'` or `'owned'`.
 *   2. `verify-i18n.mjs` catches missing keys in general — it does not assert
 *      that the bilingual `verdict.underclaimed` key exists in BOTH en and
 *      zh-CN (the strings it checks come from registered i18n tables).
 *   3. `verify-samples.mjs` checks anchors land — it does not assert that the
 *      paint on the Painted Page reads as `underclaimed` (not `defended`) for
 *      the canonical underclaim case.
 *
 * Three things must hold together:
 *   - analysis.ts: `undersold → underclaimed` in DIVERGENCE_VERDICT
 *   - types/index.ts: `Verdict` contains `'underclaimed'` (separate from
 *     `DivergenceClass`'s `'undersold'`)
 *   - ui/ui.css: `.anchor-underclaimed` with text-decoration-color and a caret
 *
 * This is the only verify-*.mjs that reads `ui/ui.css` textually — the rule is
 * "if you want to lock down a paint, lock down the paint rule".
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';

const fails = [];
const note = (m) => console.log('  ' + m);

/* ---- 1. Compile analysis.ts and assert the verdict mapping ---- */

mkdirSync('.tmp-verdict', { recursive: true });
try {
  execSync('npx esbuild src/lib/analysis.ts --format=esm --outfile=.tmp-verdict/analysis.mjs', { stdio: 'pipe' });
  const { classifyDivergence, verdictOf, countVerdicts } =
    await import('./.tmp-verdict/analysis.mjs');

  const SELF = { owned: 3, shaky: 1.5, notmine: 0 };
  const probe = (selfGrade, aiScore) => ({
    selfGrade,
    ai: aiScore === undefined ? undefined : { score: aiScore },
  });

  // Canonical underclaim cases (spec §4.4 — Undersold is self ≤ 1.5 AND ai == 3).
  const canonical = [
    probe('notmine', 3),
    probe('shaky', 3),
  ];
  for (const p of canonical) {
    const cls = classifyDivergence(p);
    if (cls !== 'undersold') fails.push(`classifyDivergence(self=${p.selfGrade}, ai=3) returned '${cls}', spec says 'undersold'`);
    const v = verdictOf(p);
    if (v !== 'underclaimed') {
      fails.push(`verdictOf for a ${cls} probe returned '${v}', this build says 'underclaimed' — ` +
        `if 'underclaimed' is folded back into 'defended' the 46% plurality loses its pixels again`);
    }
  }
  note(`canonical underclaim cases → classifyDivergence=undersold, verdictOf=underclaimed ✓`);

  // Negative control: a defended probe MUST still map to 'defended' (we are
  // not over-reaching the split — owned/undersold is the only branch that
  // changed).
  const defended = probe('owned', 3);
  if (verdictOf(defended) !== 'defended') {
    fails.push(`verdictOf(owned+ai3) returned '${verdictOf(defended)}', should still be 'defended' (defence split is intact)`);
  }
  note(`control: verdictOf(owned+ai3) = 'defended' (unchanged) ✓`);

  // countVerdicts must increment underclaimed, not defended, for underclaim
  // probes — this is the gate that prevented the bug from shipping originally.
  const mixed = [
    probe('owned', 3),    // defended
    probe('notmine', 3),  // underclaimed
    probe('shaky', 3),    // underclaimed
    probe('owned', 0),    // illusion → undefended
    probe('notmine', 0),  // borrowed → undefended
  ];
  const counts = countVerdicts(mixed);
  if (counts.underclaimed !== 2) {
    fails.push(`countVerdicts.underclaimed=${counts.underclaimed}, expected 2 — the 46% plurality would be invisible`);
  }
  if (counts.defended !== 1) {
    fails.push(`countVerdicts.defended=${counts.defended}, expected 1 — control regressed`);
  }
  if (counts.undefended !== 2) {
    fails.push(`countVerdicts.undefended=${counts.undefended}, expected 2 — control regressed`);
  }
  note(`countVerdicts: defended=1 underclaimed=2 undefended=2 (no double-count, no folding) ✓`);
} finally {
  rmSync('.tmp-verdict', { recursive: true, force: true });
}

/* ---- 2. Type system: 'underclaimed' is in Verdict, separate from 'undersold' ---- */

const types = readFileSync('src/types/index.ts', 'utf8');
const verdictMatch = types.match(/export\s+type\s+Verdict\s*=\s*([^;]+);/);
if (!verdictMatch) {
  fails.push("Verdict type not found in src/types/index.ts");
} else {
  const verdictBody = verdictMatch[1];
  if (!/underclaimed/.test(verdictBody)) {
    fails.push(`Verdict type does not contain 'underclaimed': ${verdictBody.trim()}`);
  }
  if (/\bundersold\b/.test(verdictBody)) {
    fails.push(`Verdict type contains 'undersold' — that belongs on DivergenceClass, not on Verdict`);
  }
  note(`types: Verdict contains 'underclaimed', not 'undersold' (axes separate) ✓`);
}

/* ---- 3. CSS paint rule for .anchor-underclaimed must exist ---- */

const css = readFileSync('src/ui/ui.css', 'utf8');
const anchorRule = /\.anchor-underclaimed\s*\{([^}]+)\}/.exec(css);
if (!anchorRule) {
  fails.push(".anchor-underclaimed rule missing from src/ui/ui.css — the Painted Page has no pixels for the 46%");
} else {
  const body = anchorRule[1];
  if (!/text-decoration-color/.test(body)) {
    fails.push(`.anchor-underclaimed rule has no text-decoration-color: ${body}`);
  }
  if (!/var\(--underclaimed\)/.test(body)) {
    fails.push(`.anchor-underclaimed rule does not reference --underclaimed token: ${body}`);
  }
  note(`CSS: .anchor-underclaimed with text-decoration-color: var(--underclaimed) ✓`);
}

const caretRule = /\.anchor-underclaimed::after\s*\{/.exec(css);
if (!caretRule) {
  fails.push('.anchor-underclaimed::after caret missing — the redundant non-colour cue for the 46% (isoluminant palette)');
} else {
  note(`CSS: .anchor-underclaimed::after caret present ✓`);
}

/* ---- 4. i18n: verdict.underclaimed registered in BOTH languages ---- */

const common = readFileSync('src/i18n/common.ts', 'utf8');
for (const lang of ['en', "'zh-CN'"]) {
  const re = new RegExp(`${lang}:\\s*\\{[\\s\\S]*?'verdict\\.underclaimed':\\s*'([^']+)'`);
  const m = re.exec(common);
  if (!m) {
    fails.push(`i18n/common.ts missing 'verdict.underclaimed' under ${lang}`);
  } else if (!m[1].trim()) {
    fails.push(`i18n/common.ts has empty 'verdict.underclaimed' under ${lang}`);
  }
}
note(`i18n: 'verdict.underclaimed' present in en and zh-CN ✓`);

/* ---- 5. Tokens: --underclaimed + --underclaimed-wash declared for both themes ---- */

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
for (const tok of ['--underclaimed:', '--underclaimed-wash:']) {
  let hits = (tokens.match(new RegExp(tok, 'g')) || []).length;
  if (hits < 2) {
    fails.push(`tokens.css declares ${tok} only ${hits} time(s); need ≥2 (one per theme)`);
  }
}
note(`tokens: --underclaimed and --underclaimed-wash declared per theme (≥2 each) ✓`);

/* ---- result ---- */

console.log(`\nverify-verdict-render: 5 sections checked (analysis · types · css · i18n · tokens)`);
if (fails.length) {
  console.error(`verify-verdict-render: ${fails.length} FAIL — the verdict split is at risk`);
  fails.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-verdict-render: the 46% plurality has pixels, the verdict split is locked ✓');
