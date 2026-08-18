/**
 * Pack construction kit (spec §3.2). Shared rubric, timing and difficulty mix
 * so each pack file carries only what is genuinely field-specific.
 */
import type { Difficulty, DisciplinePack, ProbeKind } from '../types';

/** The shared 0–3 Ownership Scale — identical in every pack (spec §3.2). */
export const SHARED_SCALE = [
  '0 Absent — cannot explain it, or contradicts their own submission.',
  '1 Surface — restates the submission or a textbook line; no mechanism; falls over on a perturbation.',
  '2 Working — correct mechanism for this case; gaps on why-not-the-alternative or on limits.',
  '3 Owned — mechanism, justification against alternatives, and the conditions under which it fails.',
];

export const DEFAULT_TIMING: Record<ProbeKind, number> = {
  concept: 90,
  method: 105,
  provenance: 75,
  counterfactual: 120,
  blindspot: 105,
  alternative: 120,
};

/** Difficulty ladder from spec §3.2 — percentages of the probe set. */
export const DEFAULT_MIX: Record<Difficulty, Partial<Record<ProbeKind, number>>> = {
  foundations: { concept: 40, provenance: 30, method: 30 },
  standard:    { concept: 20, method: 25, provenance: 25, counterfactual: 20, blindspot: 10 },
  defense:     { method: 20, provenance: 20, counterfactual: 30, blindspot: 20, alternative: 10 },
};

export const ALL_KINDS: ProbeKind[] = [
  'concept', 'method', 'provenance', 'counterfactual', 'blindspot', 'alternative',
];

type PackInit =
  Omit<DisciplinePack, 'rubric' | 'timing' | 'probeKinds'> &
  Partial<Pick<DisciplinePack, 'rubric' | 'timing' | 'probeKinds'>>;

/** Fills in the shared rubric/timing/mix so pack files stay field-specific. */
export function definePack(init: PackInit): DisciplinePack {
  return {
    ...init,
    probeKinds: init.probeKinds ?? { allowed: ALL_KINDS, mix: DEFAULT_MIX },
    timing: { ...DEFAULT_TIMING, ...(init.timing ?? {}) },
    rubric: init.rubric ?? { scale: SHARED_SCALE },
  };
}

/** Terse dimension builder — keeps pack files readable. */
export function dim(
  id: string, label: string, oneLine: string,
  examinerMoves: string[], ownedLooksLike: string, surfaceLooksLike: string,
) {
  return { id, label, oneLine, examinerMoves, ownedLooksLike, surfaceLooksLike };
}

export function detect(
  keywords: [string, number][],
  regexes: [string, number][] = [],
  fileExtensions: string[] = [],
  codeFenceLangs: string[] = [],
) {
  return {
    keywords: keywords.map(([term, weight]) => ({ term, weight })),
    regexes: regexes.map(([source, weight]) => ({ source, weight })),
    fileExtensions,
    codeFenceLangs,
  };
}
