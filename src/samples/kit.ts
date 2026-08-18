import type { Difficulty, PackId, ProbeKind, RunPreset } from '../types';

export interface SampleProbeDef {
  dimensionId: string;
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

export interface SampleDef {
  id: string;
  title: string;
  packId: PackId;
  /** Raw markdown, imported with Vite's `?raw`. */
  material: string;
  level: 'undergraduate' | 'masters' | 'professional';
  blurb: string;
  preset: RunPreset;
  difficulty: Difficulty;
  probes: SampleProbeDef[];
  fragilities: { quote: string; note: string }[];
}
