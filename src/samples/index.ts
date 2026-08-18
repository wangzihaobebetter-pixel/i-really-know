/**
 * Sample runs — the reason this app is fully usable before you have an API key.
 * A sample is a real submission plus a hand-written probe set, turned into an
 * ordinary Session so every downstream screen treats it exactly like a real run.
 */
import type { Probe, Session } from '../types';
import { id, now } from '../lib/ids';
import {
  calibration, detectMaterialKind, ownershipIndex, placeAllAnchors, withDivergence,
} from '../lib/analysis';
import type { SampleDef } from './kit';
import {
  antepartumSample, contraceptionSample, motorOilSample, plantCompetitionSample,
} from './defs-a';
import {
  gamblingSample, graphSample, planckSample, tuberculosisSample,
} from './defs-b';

export type { SampleDef } from './kit';

/**
 * Ordered so the first entry is the one the home screen demonstrates.
 *
 * There is NO CHEMISTRY SAMPLE, on purpose. `research/ireallyknow/01` §7.1
 * searched for a genuine student-submitted chemistry lab report and found
 * none: the best candidate turned out to be an instructor-authored template
 * bylined "Joe Student", dated 2010, instructor "Dr. Know It All". Shipping it
 * would have been exactly the v2 error. The gap is stated rather than filled
 * with invention, and `verify-samples` prints it on every build.
 */
export const SAMPLES: SampleDef[] = [
  antepartumSample, graphSample, tuberculosisSample, gamblingSample,
  contraceptionSample, motorOilSample, planckSample, plantCompetitionSample,
];

/** Samples carrying an illustrative worked run, used for the home demo. */
export const DEMO_SAMPLES = SAMPLES.filter((s) => s.worked?.length);

export function getSample(sampleId: string | undefined): SampleDef | undefined {
  return SAMPLES.find((s) => s.id === sampleId);
}

/** Deterministic per-sample id so re-opening a sample reuses its session. */
export const sampleSessionId = (sampleId: string) => `sample_${sampleId}`;

/** Builds a fresh, unanswered Session from a sample definition. */
export function buildSampleSession(def: SampleDef): Session {
  const probes: Probe[] = def.probes.map((p, i) => ({
    id: `${def.id}_p${i + 1}`,
    dimensionId: p.dimensionId,
    kind: p.kind,
    anchor: { quote: p.quote, placed: false },
    question: p.question,
    whyThisProbe: p.whyThisProbe,
    reference: {
      keyPoints: p.keyPoints,
      ownedLooksLike: p.ownedLooksLike,
      surfaceLooksLike: p.surfaceLooksLike,
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
export function buildWorkedSession(def: SampleDef): Session {
  const base = buildSampleSession(def);
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
          verdictLine: w.verdictLine,
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
