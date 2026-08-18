/**
 * Sample runs — the reason this app is fully usable before you have an API key.
 * A sample is a real submission plus a hand-written probe set, turned into an
 * ordinary Session so every downstream screen treats it exactly like a real run.
 */
import type { Probe, Session } from '../types';
import { id, now } from '../lib/ids';
import { detectMaterialKind, placeAllAnchors } from '../lib/analysis';
import type { SampleDef } from './kit';
import { bioSample, csSample, medSample, statsSample } from './defs-a';
import { chemSample, econSample, mlSample, nursingSample } from './defs-b';

export type { SampleDef } from './kit';

export const SAMPLES: SampleDef[] = [
  csSample, medSample, bioSample, mlSample,
  statsSample, chemSample, econSample, nursingSample,
];

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

/** A fresh copy of a sample, for re-running one that has already been answered. */
export function forkSampleSession(def: SampleDef): Session {
  return { ...buildSampleSession(def), id: id('s'), createdAt: now() };
}

/** Dev-only integrity check: every anchor must be a verbatim substring. */
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
