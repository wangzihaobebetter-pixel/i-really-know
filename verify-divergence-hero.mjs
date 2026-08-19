/**
 * P3 §3 / §9 item 5 — the Divergence hero is wired correctly.
 *
 * v2 showed `自我认知准确度 56`, an unsigned 0–100 score, side by side with
 * `掌握度 56`. The eye had nothing to land on, the only metric no competitor
 * ships was buried, and "is 56 good?" was the question the product
 * deliberately refuses to answer (P1 corpus 05 §3.1, OralExam.ai).
 *
 * v3 inverts it. The screen shows ONE hero numeral — the SIGNED span count
 * `Δ = defended − claimed`, the unit the evidence sheet also uses — and
 * nothing else on that first screen is above body scale. The slopegraph is
 * below the fold deliberately, and the direction of the run (`over` /
 * `under` / `accurate`) is the result of `calibrationBand(Δ)`, not a re-typed
 * colour picker.
 *
 * If any of the following ever regresses, this file fails the build:
 *   1. `directionOf` semantics drift (>±0.5 changes the line colour).
 *   2. `calibrationBand` semantics drift (§3.4a's ±1 narrow band).
 *   3. `divergence()` returns a 0–100 score instead of a signed span count, or
 *      returns `delta: 0` for the 46% plurality branch.
 *   4. The i18n keys for the three states or the hero's claim line disappear
 *      from either language.
 *   5. The hero source uses `d.score` (a 0–3 unit) instead of `d.delta` (the
 *      signed span count from `divergence()`).
 *   6. The slopegraph moves ABOVE the hero in the screen source.
 *   7. The hero CSS loses its sign or one-per-screen wrapper.
 *
 * This is the only verify-*.mjs that reads `src/ui/Divergence.tsx` and
 * `src/screens/map/MapScreen.tsx` textually — "if you want to lock down a
 * screen, lock down the screen source".
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const fails = [];
const note = (m) => console.log('  ' + m);

/* ---- 1. Compile analysis.ts and assert the math ---- */

mkdirSync('.tmp-divhero', { recursive: true });
try {
  execSync('npx esbuild src/lib/analysis.ts --format=esm --outfile=.tmp-divhero/analysis.mjs', { stdio: 'pipe' });
  const { divergence, calibrationBand } =
    await import('./.tmp-divhero/analysis.mjs');

  /* calibrationBand: §3.4a's narrow ±1 band. */
  if (calibrationBand(-1) !== 'accurate' || calibrationBand(0) !== 'accurate' || calibrationBand(1) !== 'accurate') {
    fails.push(`calibrationBand(-1/0/+1) must read 'accurate' (§3.4a's narrow band) — got -1:${calibrationBand(-1)} 0:${calibrationBand(0)} 1:${calibrationBand(1)}`);
  }
  if (calibrationBand(-2) !== 'over' || calibrationBand(2) !== 'under'
      || calibrationBand(-5) !== 'over' || calibrationBand(5) !== 'under') {
    fails.push(`calibrationBand outside ±1 must read 'over' for negative, 'under' for positive — got -2:${calibrationBand(-2)} 2:${calibrationBand(2)} -5:${calibrationBand(-5)} 5:${calibrationBand(5)}`);
  }
  note(`calibrationBand: ±1 → accurate (§3.4a), >1 → under, <-1 → over ✓`);

  /* divergence(): SIGNED span count, NOT 0–100.
     The hero is `defended − claimed`. Each pair carries its own per-line
     direction (the slopegraph colors itself from it). */
  const probe = (self, ai) => ({
    selfGrade: self,
    ai: ai === undefined ? undefined : { score: ai },
  });

  /* Overclaim batch: 3 owned+0 → claimed=3, defended=0, delta=-3, direction='over'. */
  const over = [
    probe('owned', 0), probe('owned', 0), probe('owned', 0),
  ];
  const overDiv = divergence(over);
  if (!overDiv) {
    fails.push('divergence(over) returned undefined on a 3-probe both-tracks batch');
  } else {
    if (!Number.isInteger(overDiv.delta)) {
      fails.push(`divergence().delta must be an integer, got ${overDiv.delta}`);
    }
    if (Math.abs(overDiv.delta) > 50) {
      fails.push(`divergence().delta = ${overDiv.delta}, span-count ceiling exceeded (must be a count, not 0-100)`);
    }
    if (overDiv.delta !== -3 || overDiv.claimed !== 3 || overDiv.defended !== 0) {
      fails.push(`divergence(overclaim batch) → claimed=${overDiv.claimed} defended=${overDiv.defended} delta=${overDiv.delta}, expected 3/0/-3`);
    }
    if (overDiv.direction !== 'over') {
      fails.push(`overclaim batch must read direction='over' — got '${overDiv.direction}'`);
    }
    /* Per-line direction is observable via pairs[].direction. */
    if (overDiv.pairs.length !== 3 || overDiv.pairs.some((p) => p.direction !== 'over')) {
      fails.push(`overclaim per-line direction must all read 'over' — got ${overDiv.pairs.map((p) => p.direction).join(',')}`);
    }
    note(`divergence(overclaim): claimed=3 defended=0 delta=-3 direction=over, per-line all 'over' — SIGNED span count ✓`);
  }

  /* Underclaim batch: 4 notmine+3 → claimed=0, defended=4, delta=+4, direction='under'. */
  const under = [
    probe('notmine', 3), probe('notmine', 3), probe('notmine', 3), probe('notmine', 3),
  ];
  const underDiv = divergence(under);
  if (!underDiv || underDiv.delta !== 4 || underDiv.claimed !== 0 || underDiv.defended !== 4
      || underDiv.direction !== 'under'
      || !underDiv.pairs.every((p) => p.direction === 'under')) {
    fails.push(`divergence(underclaim batch) → claimed=${underDiv?.claimed} defended=${underDiv?.defended} delta=${underDiv?.delta} direction=${underDiv?.direction}; per-line ${underDiv?.pairs?.map((p) => p.direction).join(',')} — expected 0/4/+4/under, all 'under'`);
  } else {
    note(`divergence(underclaim): claimed=0 defended=4 delta=+4 direction=under, per-line all 'under' ✓`);
  }

  /* Mixed: claimed=5 defended=7 delta=+2 (§3.4c first-class 46% branch). */
  const mixed = [
    probe('owned', 3), probe('owned', 3), probe('owned', 3),
    probe('owned', 0), probe('owned', 0),
    probe('notmine', 3), probe('notmine', 3), probe('notmine', 3), probe('notmine', 3),
  ];
  const mixedDiv = divergence(mixed);
  if (mixedDiv && (mixedDiv.delta !== 2 || mixedDiv.direction !== 'under')) {
    fails.push(`mixed batch delta=${mixedDiv.delta} direction=${mixedDiv.direction}, expected +2/under`);
  } else {
    note(`divergence(mixed): claimed=5 defended=7 delta=+2 direction=under — SIGNED, not 0-100 ✓`);
  }

  /* The 46/35/18.5 distribution from Knof 2024 (corpus 03 §A2):
     a batch shaped like that MUST read direction='under' (plurality). */
  const shaped = [];
  for (let i = 0; i < 46; i++) shaped.push(probe('shaky', 3));    // 46% underclaim
  for (let i = 0; i < 35; i++) shaped.push(probe('owned', 0));    // 35.5% overclaim
  for (let i = 0; i < 18; i++) shaped.push(probe('shaky', 2));    // 18.5% calibrated
  const shapedDiv = divergence(shaped);
  if (shapedDiv && (shapedDiv.direction !== 'under' || shapedDiv.delta <= 0)) {
    fails.push(`Knof 46/35/18 batch → delta=${shapedDiv.delta} direction=${shapedDiv.direction}, expected positive 'under'`);
  } else {
    note(`Knof 46/35/18 batch → delta=+${shapedDiv.delta} direction='under' (the 46% plurality is first-class) ✓`);
  }

  /* Control: claimed===defended reads 'accurate' (Δ=0, narrow band). */
  const defended = [
    probe('owned', 3), probe('notmine', 0),
  ];
  const defDiv = divergence(defended);
  if (defDiv && (defDiv.direction !== 'accurate' || defDiv.delta !== 0)) {
    fails.push(`calibrated batch → delta=${defDiv.delta} direction=${defDiv.direction}, expected 0/accurate`);
  } else {
    note(`control: claimed=defended=1 batch → delta=0 direction='accurate' ✓`);
  }

  /* Boundary check: Δ=±1 still reads 'accurate' (§3.4a — narrow band). */
  const plusOne = [probe('owned', 3), probe('owned', 3), probe('owned', 0)];
  const plusOneDiv = divergence(plusOne);
  if (plusOneDiv && (plusOneDiv.direction !== 'accurate' || plusOneDiv.delta !== -1)) {
    fails.push(`delta=-1 boundary → delta=${plusOneDiv.delta} direction=${plusOneDiv.direction}, expected -1/accurate (§3.4a)`);
  } else {
    note(`boundary: Δ=-1 (owned+0 twice) still reads 'accurate' (§3.4a ±1 band) ✓`);
  }
} finally {
  rmSync('.tmp-divhero', { recursive: true, force: true });
}

/* ---- 2. i18n: every state key in BOTH languages ---- */

const v3i18n = readFileSync('src/i18n/v3.ts', 'utf8');
const mapBlock = (v3i18n.match(/registerStrings\('map',\s*\{([\s\S]*?)\n\}\);/m) || [])[1] || '';
if (!mapBlock) {
  fails.push("could not find registerStrings('map', ...) in src/i18n/v3.ts — map strings may have moved");
} else {
  for (const lang of ['en', "'zh-CN'"]) {
    const langBlock = (mapBlock.match(new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\n  \\}`)) || [])[1] || '';
    if (!langBlock) {
      fails.push(`could not find the ${lang} block of the map i18n table`);
      continue;
    }
    const required = [
      'divergenceClaim:',
      "'divergenceState.over':",
      "'divergenceState.under':",
      "'divergenceState.accurate':",
      "'divergenceLine.over':",
      "'divergenceLine.under':",
      "'divergenceLine.accurate':",
      'claimedOnly:',
      'claimedPending:',
      'noDivergenceAction:',
      'curveTitle:',
      'curveAria:',
      'curveLeft:',
      'curveRight:',
      'curveLegend:',
      'curveFolded:',
      'trendTitle:',
      'trendGoal:',
      'underclaimedTitle:',
      'underclaimedHint:',
      'keyDefended:',
      'keyUnderclaimed:',
    ];
    for (const k of required) {
      if (!langBlock.includes(k)) fails.push(`map i18n (${lang}) is missing key '${k}'`);
    }
  }
  if (!fails.some((f) => f.startsWith('map i18n'))) note(`i18n: 21 map keys present in BOTH en and zh-CN (three states + hero claim + half-object + slopegraph + trend + underclaimed) ✓`);
}

/* ---- 3. Hero source uses d.delta (span count), NOT d.score ---- */

const hero = readFileSync('src/ui/Divergence.tsx', 'utf8');
if (!/divergence:\s*Divergence/.test(hero)) {
  fails.push('DivergenceHero in src/ui/Divergence.tsx is no longer typed against the Divergence interface');
}
if (!/\bd\.delta\b/.test(hero) && !/\bdiv\.delta\b/.test(hero)) {
  fails.push('DivergenceHero no longer reads `d.delta` — the hero must show the SIGNED span count, not a 0–100 score');
}
if (/\bd\.score\b/.test(hero) && !/_noHeroScore_/.test(hero)) {
  fails.push('DivergenceHero references d.score — that is a 0..3 unit, NOT the headline metric');
}
if (!/DIRECTION_CLASS\[/.test(hero)) {
  fails.push('DivergenceHero no longer reads DIRECTION_CLASS[direction] — the colour wiring to calibrationBand is gone');
}
if (!/\bd\.direction\b/.test(hero)) {
  fails.push('DivergenceHero must consume d.direction which analysis.ts sets from calibrationBand(delta)');
}
note(`Divergence.tsx: d.delta (signed span count) + DIRECTION_CLASS[d.direction] wired ✓`);

/* ---- 4. CSS: hero wrapper + sign are present ---- */

const css = readFileSync('src/ui/ui.css', 'utf8');
for (const cls of ['.divergence-hero', '.divergence-numeral', '.divergence-sign', '.divergence-arrow']) {
  if (!css.includes(cls)) fails.push(`CSS missing rule for ${cls}`);
}
if (!fails.some((f) => f.startsWith('CSS missing'))) note(`ui.css: .divergence-hero + .divergence-numeral + .divergence-sign + .divergence-arrow present ✓`);

/* ---- 5. MapScreen: hero comes FIRST, slopegraph below the fold (P3 §3.3) ---- */

const map = readFileSync('src/screens/map/MapScreen.tsx', 'utf8');
const heroPos = map.indexOf('<DivergenceHero');
const slopePos = map.indexOf('<SlopeGraph');
const paintedPos = map.indexOf('painted');
if (heroPos < 0) fails.push('MapScreen.tsx no longer renders <DivergenceHero />');
if (slopePos < 0) fails.push('MapScreen.tsx no longer renders <SlopeGraph />');
if (heroPos >= 0 && slopePos >= 0 && heroPos >= slopePos) {
  fails.push(`SlopeGraph is rendered BEFORE DivergenceHero in MapScreen.tsx — §3.3 says the chart sits below the fold`);
}
if (heroPos >= 0 && paintedPos >= 0 && heroPos >= paintedPos) {
  fails.push('DivergenceHero appears AFTER the Painted Page header in MapScreen.tsx — the hero must own the first screen');
}
/* ClaimedHero must also be present, so the half-object (no ai track yet) still renders. */
if (!/<ClaimedHero/.test(map)) {
  fails.push('MapScreen.tsx no longer renders <ClaimedHero /> — keyless users would have no hero at all');
}
note(`MapScreen.tsx: <DivergenceHero /> first, <SlopeGraph /> below the fold, <ClaimedHero /> fallback ✓`);

/* ---- result ---- */

console.log(`\nverify-divergence-hero: 5 sections checked (math · i18n · hero source · css · screen)`);
if (fails.length) {
  console.error(`verify-divergence-hero: ${fails.length} FAIL — the headline metric is at risk`);
  fails.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-divergence-hero: Δ is signed, calibrated to direction, three states wired, one numeral on screen ✓');
