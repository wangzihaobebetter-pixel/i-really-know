/**
 * Derived analysis (spec §4.4, §7.3) — pure functions, no React, no store.
 * Divergence, Ownership Index, calibration, anchor placement.
 * WP0 owns this file; every screen reads it rather than recomputing.
 */
import type {
  Anchor, DivergenceClass, DivergenceDirection, Probe, SelfGrade, Session, Verdict, Score,
} from '../types';

/* ---------- self-grade ↔ score bridge ---------- */

const SELF_AS_SCORE: Record<SelfGrade, number> = { owned: 3, shaky: 1.5, notmine: 0 };

export function selfGradeAsScore(g: SelfGrade | undefined): number | undefined {
  return g ? SELF_AS_SCORE[g] : undefined;
}

/* ---------- divergence (§4.4) ---------- */

/**
 * The product's headline signal: what the student believed vs what they showed.
 * `illusion` (thought owned, wasn't) is the rare, loud one.
 */
export function classifyDivergence(probe: Probe): DivergenceClass {
  const ai = probe.ai?.score;
  const self = probe.selfGrade ? SELF_AS_SCORE[probe.selfGrade] : undefined;

  if (ai === undefined) {
    if (self === undefined) return 'unscored';
    // Keyless run: the self-grade alone carries the verdict.
    return self >= 2.5 ? 'owned' : self >= 1 ? 'halfheld' : 'borrowed';
  }
  if (self === undefined) return ai >= 2 ? 'owned' : ai === 1 ? 'halfheld' : 'borrowed';

  // Spec §4.4, in the spec's own order — Illusion wins, then Undersold, then the honest cases.
  if (self >= 2.5 && ai <= 1) return 'illusion';
  if (self <= 1.5 && ai === 3) return 'undersold';
  if (self >= 2 && ai >= 2) return 'owned';
  if (self <= 1 && ai <= 1) return 'borrowed';
  return 'halfheld';
}

/**
 * AXIS A — demonstrated (P3 §2.2, §9.3).
 *
 * v2 shipped `undersold: 'owned'` on this table. That one line is why the 46%
 * plurality who underestimate themselves (Knof 2024, N=426, corpus `03` §A2)
 * rendered in exactly the same green as the students who were right, and
 * learned nothing. `undersold` now has its own Axis-A state and its own mark
 * on the Painted Page.
 *
 * `illusion` maps to `undefended` here because Axis A answers ONLY "could you
 * defend it?". That they also claimed it is Axis B's job, and collapsing the
 * two axes into one is the mistake this table exists to fix.
 */
const DIVERGENCE_VERDICT: Record<DivergenceClass, Verdict> = {
  owned: 'defended',
  undersold: 'underclaimed',
  halfheld: 'partial',
  borrowed: 'undefended',
  illusion: 'undefended',
  unscored: 'none',
};

export function verdictOf(probe: Probe): Verdict {
  return DIVERGENCE_VERDICT[probe.divergence ?? classifyDivergence(probe)];
}

/** Non-mutating: returns probes with `divergence` filled in. */
export function withDivergence(probes: Probe[]): Probe[] {
  return probes.map((p) => ({ ...p, divergence: classifyDivergence(p) }));
}

/* ---------- ownership index & calibration ---------- */

export interface OwnershipCounts {
  defended: number; partial: number; undefended: number; underclaimed: number;
  none: number; total: number;
}

export function countVerdicts(probes: Probe[]): OwnershipCounts {
  const c: OwnershipCounts = {
    defended: 0, partial: 0, undefended: 0, underclaimed: 0, none: 0, total: probes.length,
  };
  for (const p of probes) c[verdictOf(p)]++;
  return c;
}

/* ---------- AXIS B · divergence, the headline metric (P3 §3) ---------- */

/** A span the student claimed: they self-graded it "I own this" (3/3). */
const CLAIMED_THRESHOLD = 2.5;
/** A span the student defended: the examiner scored it 2 or 3 out of 3. */
const DEFENDED_THRESHOLD = 2;

export interface SlopePair {
  probeId: string;
  dimensionId: string;
  /** 0–3, from the self-grade collected BEFORE any verdict. */
  claimed: number;
  /** 0–3, from the examiner. */
  demonstrated: number;
  /** demonstrated − claimed, for this one span. */
  delta: number;
  direction: DivergenceDirection;
}

export interface Divergence {
  /** Spans the student said they could defend. */
  claimed: number;
  /** Spans they actually defended. */
  defended: number;
  /** THE headline number. A signed count of spans: defended − claimed. */
  delta: number;
  /** Which of P3 §3.4's three states this run is in. */
  direction: DivergenceDirection;
  /** Probes carrying both tracks — the only ones Δ can be computed from. */
  scored: number;
  total: number;
  /** One line per probed span, for the paired-slope chart (P3 §3.3). */
  pairs: SlopePair[];
}

function directionOf(delta: number): DivergenceDirection {
  if (delta > 0.5) return 'under';
  if (delta < -0.5) return 'over';
  return 'accurate';
}

/**
 * P3 §3.4a: well calibrated is Δ ∈ {−1, 0, +1}. The band is deliberately
 * narrow — only 18.5% of students land in it (Knof 2024, N=426), and the
 * product's whole claim is that most people are outside it.
 */
export function calibrationBand(delta: number): DivergenceDirection {
  if (delta >= -1 && delta <= 1) return 'accurate';
  return delta > 0 ? 'under' : 'over';
}

/**
 * Δ = (spans defended) − (spans claimed), signed. P3 §3.1.
 *
 * NOT a percentage. v2 showed `自我认知准确度 56`, which is wrong twice:
 * unsigned erases direction — the entire finding of corpus `03` §A2 — and
 * score-shaped invites "is 56 good?", the question `05` §3.1 records
 * OralExam.ai deliberately refusing to answer by shipping no percentage at all.
 *
 * A span count is countable, auditable, and is the SAME UNIT the instructor's
 * evidence sheet uses, so the student's number and the professor's document are
 * the same object. A percentage invites disputing the number; a count invites
 * asking WHICH THREE — which is the action this product wants.
 *
 * Returns undefined when no probe carries both tracks. A keyless run has a
 * claimed count and no demonstrated count; inventing one would fake the only
 * signal this product has.
 */
export function divergence(probes: Probe[]): Divergence | undefined {
  const pairs: SlopePair[] = [];
  for (const p of probes) {
    const self = selfGradeAsScore(p.selfGrade);
    const ai = p.ai?.score;
    if (self === undefined || ai === undefined) continue;
    const delta = ai - self;
    pairs.push({
      probeId: p.id,
      dimensionId: p.dimensionId,
      claimed: self,
      demonstrated: ai,
      delta,
      direction: directionOf(delta),
    });
  }
  if (!pairs.length) return undefined;

  const claimed = pairs.filter((x) => x.claimed >= CLAIMED_THRESHOLD).length;
  const defended = pairs.filter((x) => x.demonstrated >= DEFENDED_THRESHOLD).length;
  const delta = defended - claimed;
  return {
    claimed, defended, delta,
    direction: calibrationBand(delta),
    scored: pairs.length,
    total: probes.length,
    pairs,
  };
}

/** Spans the student could not defend — the rows an evidence sheet is made of. */
export function undefendedProbes(probes: Probe[]): Probe[] {
  return probes.filter((p) => verdictOf(p) === 'undefended');
}

/** Spans they own more than they thought. The actionable output for the 46%. */
export function underclaimedProbes(probes: Probe[]): Probe[] {
  return probes.filter((p) => verdictOf(p) === 'underclaimed');
}

/**
 * 0–100. Uses AI scores where present, self-grades otherwise.
 * Returns undefined when nothing has been graded at all.
 */
export function ownershipIndex(probes: Probe[]): number | undefined {
  const vals: number[] = [];
  for (const p of probes) {
    if (p.ai) vals.push(p.ai.score);
    else {
      const s = selfGradeAsScore(p.selfGrade);
      if (s !== undefined) vals.push(s);
    }
  }
  if (!vals.length) return undefined;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((mean / 3) * 100);
}

/**
 * 0–100 agreement between what the student claimed and what they showed.
 * Only defined when both tracks exist for at least one probe.
 */
export function calibration(probes: Probe[]): number | undefined {
  const pairs = probes.filter((p) => p.ai && p.selfGrade);
  if (!pairs.length) return undefined;
  const err = pairs.reduce((acc, p) => acc + Math.abs(SELF_AS_SCORE[p.selfGrade!] - p.ai!.score), 0) / pairs.length;
  return Math.round((1 - err / 3) * 100);
}

/** Words before numbers — the map states the index in English/Chinese first (§5.6). */
export function ownershipInWords(index: number | undefined, lang: 'en' | 'zh-CN'): string {
  if (index === undefined) return lang === 'en' ? 'Nothing graded yet.' : '还没有评分。';
  const en = [
    [92, 'Nearly all of this is yours.'],
    [75, 'Most of this is yours.'],
    [58, 'About two-thirds of this is yours.'],
    [42, 'About half of this is yours.'],
    [25, 'A minority of this is yours.'],
    [0,  'Very little of this is yours yet.'],
  ] as const;
  const zh = [
    [92, '这里面几乎全是你的。'],
    [75, '这里面大部分是你的。'],
    [58, '这里面大约三分之二是你的。'],
    [42, '这里面大约一半是你的。'],
    [25, '这里面只有一小部分是你的。'],
    [0,  '这里面目前属于你的还很少。'],
  ] as const;
  const table = lang === 'en' ? en : zh;
  return (table.find(([floor]) => index >= floor) ?? table[table.length - 1])[1];
}

/* ---------- anchor placement ---------- */

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Locate an anchor quote inside the material.
 * Exact match first; then whitespace-normalised match; then a first-line prefix
 * match (models often truncate long quotes). Never throws — an unplaced anchor
 * is a legitimate state that the Painted Page lists in the margin.
 */
export function placeAnchor(material: string, anchor: Anchor): Anchor {
  const q = anchor.quote ?? '';
  if (!q.trim()) return { ...anchor, placed: false };

  const exact = material.indexOf(q);
  if (exact >= 0) return { ...anchor, start: exact, end: exact + q.length, placed: true };

  const nq = norm(q);
  const nm = norm(material);
  const ni = nm.indexOf(nq);
  if (ni >= 0) {
    // Walk the original string counting normalised characters to recover offsets.
    const span = mapNormalisedSpan(material, ni, nq.length);
    if (span) return { ...anchor, start: span[0], end: span[1], placed: true };
  }

  const firstLine = nq.split(/[.;\n]/)[0]?.trim();
  if (firstLine && firstLine.length >= 12) {
    const fi = nm.indexOf(firstLine);
    if (fi >= 0) {
      const span = mapNormalisedSpan(material, fi, firstLine.length);
      if (span) return { ...anchor, start: span[0], end: span[1], placed: true };
    }
  }
  return { ...anchor, placed: false };
}

function mapNormalisedSpan(material: string, normStart: number, normLen: number): [number, number] | null {
  let seen = -1, start = -1, prevWs = false;
  for (let i = 0; i < material.length; i++) {
    const ch = material[i];
    const isWs = /\s/.test(ch);
    if (isWs) {
      if (prevWs) continue;
      prevWs = true;
      seen++;
    } else {
      prevWs = false;
      seen++;
    }
    if (seen === normStart && start < 0) start = i;
    if (start >= 0 && seen === normStart + normLen - 1) return [start, i + 1];
  }
  return start >= 0 ? [start, material.length] : null;
}

export function placeAllAnchors(session: Session): Session {
  return {
    ...session,
    probes: session.probes.map((p) =>
      p.anchor.placed && p.anchor.start !== undefined
        ? p
        : { ...p, anchor: placeAnchor(session.material, p.anchor) },
    ),
  };
}

/* ---------- dimension ledger ---------- */

export interface LedgerRow { dimensionId: string; mean: number; selfMean?: number; n: number }

export function dimensionLedger(probes: Probe[]): LedgerRow[] {
  const byDim = new Map<string, Probe[]>();
  for (const p of probes) {
    const arr = byDim.get(p.dimensionId) ?? [];
    arr.push(p);
    byDim.set(p.dimensionId, arr);
  }
  return [...byDim.entries()].map(([dimensionId, ps]) => {
    const scores = ps.map((p) => (p.ai ? p.ai.score : selfGradeAsScore(p.selfGrade))).filter((v): v is number => v !== undefined);
    const selfs = ps.map((p) => selfGradeAsScore(p.selfGrade)).filter((v): v is number => v !== undefined);
    return {
      dimensionId,
      mean: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      selfMean: selfs.length ? selfs.reduce((a, b) => a + b, 0) / selfs.length : undefined,
      n: ps.length,
    };
  });
}

/* ---------- misc ---------- */

export function detectMaterialKind(material: string): 'code' | 'prose' | 'mixed' {
  const lines = material.split('\n');
  if (!lines.length) return 'prose';
  const codey = lines.filter((l) =>
    /^[\s]*(def |class |import |from |function |const |let |var |#include|public |private |return |if \(|for \(|while \(|<\/?[a-z]|SELECT |\}|\{)/.test(l),
  ).length;
  const ratio = codey / Math.max(1, lines.filter((l) => l.trim()).length);
  if (ratio > 0.35) return 'code';
  if (ratio > 0.12) return 'mixed';
  return 'prose';
}

export function titleFromMaterial(material: string): string {
  const line = material.split('\n').map((l) => l.replace(/^[#/*\s-]+/, '').trim()).find((l) => l.length > 3);
  const t = (line ?? 'Untitled submission').slice(0, 72);
  return t;
}

export const asScore = (n: number): Score => (Math.max(0, Math.min(3, Math.round(n))) as Score);
