import type { Difficulty, PackId, ProbeKind, RunPreset, SelfGrade, Score } from '../types';

export interface SampleProbeDef {
  dimensionId: string;
  /** Specific course concept for the instructor reteach map. */
  concept?: string;
  kind: ProbeKind;
  quote: string;
  question: string;
  whyThisProbe: string;
  keyPoints: string[];
  ownedLooksLike: string;
  surfaceLooksLike: string;
  timerSec?: number;
  /** Pre-baked second angle, used by keyless retraining (spec §7.1). */
  variant?: { question: string; whyThisProbe: string };
}

/**
 * Where this artifact actually came from. F8, and the whole reason v3 exists:
 * v2's eight samples were written by an LLM to be examinable, and Wang was
 * right to reject that. Real student work hedges, mis-formats, asserts without
 * warrant, names a method and then does not use it, and submits `Project23.cpp`
 * when the spec said `courses_graph.c`.
 *
 * Every field here is checked by `npm run verify:samples`, which fails the
 * build if a sample has no source URL.
 */
export interface SampleSource {
  /** Where the artifact lives. Always a real, fetchable URL. */
  url: string;
  /** Corpus, institution or repository the artifact was published by. */
  corpus: string;
  /** Level and paper type, as recorded by the source's own metadata. */
  who: string;
  /**
   * Why this artifact is worth examining — the specific realism markers that
   * identify it as genuine student work rather than a polished template.
   */
  markers: string;
  /**
   * Reuse terms, stated because they constrain what ships. MICUSP text is
   * copyright the Regents of the University of Michigan under a Fair Use
   * statement, so the app carries a short excerpt for analysis and links out
   * for the full artifact — it never redistributes a paper.
   */
  terms: string;
  /** Length of the ORIGINAL artifact, so the excerpt is never mistaken for it. */
  originalLength: string;
}

/**
 * An illustrative run over a real artifact.
 *
 * JUDGEMENT CALL, recorded in LOG 012. The home screen must open on a Painted
 * Page that is already moving (F3), and Δ cannot be computed without both
 * tracks — a self-estimate and an examiner's verdict. No real student ever sat
 * this examination, so these outcomes are the one thing on the screen that is
 * not sourced. They are therefore labelled as illustrative in the UI wherever
 * they appear, rather than being passed off as a recorded result. The artifact
 * and the probes remain real and cited.
 */
export interface WorkedOutcome { selfGrade: SelfGrade; score: Score; verdictLine: string }

export interface SampleDef {
  id: string;
  title: string;
  packId: PackId;
  /** Raw markdown, imported with Vite's `?raw`. A verbatim excerpt. */
  material: string;
  level: 'undergraduate' | 'masters' | 'professional' | 'graduate';
  blurb: string;
  preset: RunPreset;
  difficulty: Difficulty;
  source: SampleSource;
  probes: SampleProbeDef[];
  fragilities: { quote: string; note: string }[];
  /** Indexed to `probes`. Present only on the samples used for the demo. */
  worked?: WorkedOutcome[];
}
