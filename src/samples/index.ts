/**
 * Sample runs — the reason this app is fully usable before you have an API key.
 * A sample is a real submission plus a hand-written probe set, turned into an
 * ordinary Session so every downstream screen treats it exactly like a real run.
 */
import type { Cohort, Probe, Session } from '../types';
import { id, now } from '../lib/ids';
import {
  calibration, detectMaterialKind, ownershipIndex, placeAllAnchors, withDivergence,
} from '../lib/analysis';
import type { SampleDef } from './kit';
import {
  antepartumSample, contraceptionSample, motorOilSample, plantCompetitionSample,
} from './defs-a';
import {
  gamblingSample, graphSample, planckSample, pubertySample, ssProofSample,
  tuberculosisSample, vicarSample,
} from './defs-b';

export type { SampleDef } from './kit';

/**
 * Ordered so the first entry is the one the home screen demonstrates.
 *
 * There is NO CHEMISTRY SAMPLE, on purpose. `research/ireallyknow/01` §7.1
 * searched for a genuine student-submitted chemistry lab report and found
 * none: the best candidate turned out to be an instructor-authored template
 * bylined "Joe Student", dated 2010, instructor "Dr. Know It All". Shipping it
 * would have been exactly the v2 error, so the gap is stated on every build
 * rather than filled with invention. The chemistry pack still works the moment
 * a student brings their own work — what is missing is the no-key
 * demonstration, not the capability.
 *
 * Mathematics WAS in that position and no longer is. MICUSP carries no
 * mathematics papers, but it does carry a graduate student reviewing somebody
 * else's optimality proof (IOE.G2.02.1), which is precisely the situation the
 * math pack's seven dimensions were written for — hypotheses, proof strategy,
 * step justification, provenance. A near-miss with a real artifact behind it
 * beats a perfect fabrication.
 */
export const SAMPLES: SampleDef[] = [
  antepartumSample, graphSample, tuberculosisSample, gamblingSample,
  contraceptionSample, motorOilSample, planckSample, plantCompetitionSample,
  vicarSample, pubertySample, ssProofSample,
];

/** The one cold-start sample is deliberately Marcus-shaped and localized. */
export const FEATURED_SAMPLE = graphSample;

export function buildFeaturedSampleSession(lang: 'en' | 'zh-CN'): Session {
  /* The one-off Chinese override for probe 1 is gone: every sample probe now
     carries its own `zh` block, so the builder localizes the whole set. */
  return buildSampleSession(FEATURED_SAMPLE, lang);
}

/** Samples carrying an illustrative worked run, used for the home demo. */
export const DEMO_SAMPLES = SAMPLES.filter((s) => s.worked?.length);

export function getSample(sampleId: string | undefined): SampleDef | undefined {
  return SAMPLES.find((s) => s.id === sampleId);
}

/** Deterministic per-sample id so re-opening a sample reuses its session. */
export const sampleSessionId = (sampleId: string) => `sample_${sampleId}`;

/** Builds a fresh, unanswered Session from a sample definition. */
export function buildSampleSession(def: SampleDef, lang: 'en' | 'zh-CN' = 'en'): Session {
  const zh = lang === 'zh-CN';
  const probes: Probe[] = def.probes.map((p, i) => ({
    id: `${def.id}_p${i + 1}`,
    dimensionId: p.dimensionId,
    concept: p.concept,
    kind: p.kind,
    anchor: { quote: p.quote, placed: false },
    question: zh ? p.zh.question : p.question,
    whyThisProbe: zh ? p.zh.whyThisProbe : p.whyThisProbe,
    reference: {
      keyPoints: zh ? p.zh.keyPoints : p.keyPoints,
      ownedLooksLike: zh ? p.zh.ownedLooksLike : p.ownedLooksLike,
      surfaceLooksLike: zh ? p.zh.surfaceLooksLike : p.surfaceLooksLike,
    },
    timerSec: p.timerSec ?? 90,
    difficulty: def.difficulty,
    variant: p.variant,
  }));

  const session: Session = {
    id: sampleSessionId(def.id),
    title: def.title,
    packId: def.packId,
    material: def.material,
    materialKind: detectMaterialKind(def.material),
    createdAt: now(),
    status: 'ready',
    mode: 'sample',
    preset: def.preset,
    difficulty: def.difficulty,
    probes,
    fragilities: def.fragilities.map((f) => ({
      anchor: { quote: f.quote, placed: false },
      note: f.note,
    })),
    sampleId: def.id,
  };

  return placeAllAnchors(session);
}

/**
 * The same session with its illustrative worked run applied, so the home
 * screen can open on a Painted Page that is ALREADY MOVING (F3) instead of on
 * philosophy and an API-key banner.
 *
 * The outcomes are the one part of this that is not sourced — no real student
 * sat this examination — so every surface that renders them says so. See
 * `WorkedOutcome` in kit.ts.
 */
export function buildWorkedSession(def: SampleDef, lang: 'en' | 'zh-CN' = 'en'): Session {
  const base = buildSampleSession(def, lang);
  if (!def.worked?.length) return base;
  const at = now();
  return withDivergenceApplied({
    ...base,
    id: `${base.id}_worked`,
    status: 'complete',
    completedAt: at,
    probes: base.probes.map((p, i) => {
      const w = def.worked![i];
      if (!w) return p;
      return {
        ...p,
        answer: '',
        committedAt: at,
        selfGrade: w.selfGrade,
        ai: {
          score: w.score,
          verdictLine: lang === 'zh-CN' ? w.zhVerdictLine : w.verdictLine,
          evidence: { present: [], missing: [] },
          parroting: false,
          confidence: 'med' as const,
          model: 'worked-example',
          at,
        },
      };
    }),
  });
}

function withDivergenceApplied(session: Session): Session {
  const probes = withDivergence(session.probes);
  return {
    ...session,
    probes,
    ownershipIndex: ownershipIndex(probes),
    calibration: calibration(probes),
  };
}

/** A fresh copy of a sample, for re-running one that has already been answered. */
export function forkSampleSession(def: SampleDef): Session {
  return { ...buildSampleSession(def), id: id('s'), createdAt: now() };
}

/** Every anchor must be a verbatim substring. Also gated by verify-samples. */
export function unplacedAnchors(): { sampleId: string; quote: string }[] {
  const bad: { sampleId: string; quote: string }[] = [];
  for (const def of SAMPLES) {
    for (const p of def.probes) {
      if (!def.material.includes(p.quote)) bad.push({ sampleId: def.id, quote: p.quote });
    }
    for (const f of def.fragilities) {
      if (!def.material.includes(f.quote)) bad.push({ sampleId: def.id, quote: f.quote });
    }
  }
  return bad;
}

/**
 * A cohort the instructor tier can be seen through without an API key.
 *
 * JUDGEMENT CALL, recorded in LOG 012. The evidence sheet and the reteach map
 * are the paid tier and the thing a professor would tell a colleague about, so
 * they must be reachable and reviewable before anyone spends a token. Building
 * them requires several graded submissions, and no real class has ever sat this
 * examination.
 *
 * What is real: the artifacts, their sources, and the probes.
 * What is illustrative: the outcomes, and the fact that these three artifacts
 * are treated as one class. Both are labelled wherever they render, and the
 * cohort is flagged `isDemo` so no surface can present it as a recorded class.
 */
/**
 * The demo cohort is the instructor tier's shop window — brief §6.6 makes the
 * teacher side the paying half — and its name and occasion were English string
 * literals, so a Chinese instructor's first screen read "Worked example cohort
 * · seminar discussion" over an otherwise Chinese page. §7 requires parity in
 * both directions, so the two strings come from the table like everything else.
 */
export function buildDemoCohort(name: string, occasion: string, lang: 'en' | 'zh-CN' = 'en'): { cohort: Cohort; sessions: Session[] } {
  const cohortId = 'cohort_demo';
  const built = DEMO_SAMPLES.map((def) => {
    const session = { ...buildWorkedSession(def, lang), id: `${cohortId}_${def.id}`, cohortId, mode: 'class' as const };
    return { def, session };
  });
  return {
    cohort: {
      id: cohortId,
      name,
      packId: built[0]?.def.packId ?? 'general',
      preset: 'standard',
      difficulty: 'standard',
      createdAt: now(),
      occasion,
      occasionAt: now() + 7 * 86_400_000,
      isDemo: true,
      submissions: built.map(({ def, session }) => ({
        id: `sub_${def.id}`,
        label: def.title,
        material: def.material,
        materialKind: session.materialKind,
        sessionId: session.id,
        status: 'ready' as const,
      })),
    },
    sessions: built.map((b) => ({ ...b.session, submissionId: `sub_${b.def.id}` })),
  };
}
