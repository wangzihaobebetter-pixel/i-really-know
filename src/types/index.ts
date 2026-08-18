/* ============================================================
   I Really Know v2 — canonical data model (spec §7.1)
   WP0 owns this file. Every package codes against these types.
   ============================================================ */

export type PackId =
  | 'cs' | 'bio' | 'med' | 'math' | 'stats' | 'ml'
  | 'chem' | 'epi' | 'phys' | 'essay' | 'general';

export type ProbeKind =
  | 'concept' | 'method' | 'provenance' | 'counterfactual' | 'blindspot' | 'alternative';

export type Difficulty = 'foundations' | 'standard' | 'defense';
export type RunPreset = 'quick' | 'standard' | 'defense';
export type SelfGrade = 'owned' | 'shaky' | 'notmine';
export type Verdict = 'owned' | 'shaky' | 'borrowed' | 'illusion' | 'none';
export type DivergenceClass =
  | 'illusion' | 'undersold' | 'owned' | 'borrowed' | 'halfheld' | 'unscored';
export type SessionStatus = 'generating' | 'ready' | 'running' | 'complete' | 'abandoned';
export type SessionMode = 'viva' | 'retrain' | 'sample' | 'class';
export type MaterialKind = 'code' | 'prose' | 'mixed';
export type Score = 0 | 1 | 2 | 3;

export interface Anchor {
  /** Verbatim quote lifted from the user's own material. */
  quote: string;
  start?: number;
  end?: number;
  /** True once the quote has been located inside the material. */
  placed: boolean;
}

export interface Reference {
  keyPoints: string[];
  ownedLooksLike: string;
  surfaceLooksLike: string;
}

export interface AiScore {
  score: Score;
  verdictLine: string;
  evidence: { present: string[]; missing: string[] };
  parroting: boolean;
  confidence: 'low' | 'med' | 'high';
  examinerFollowUp?: string;
  model: string;
  at: number;
}

export interface Probe {
  id: string;
  dimensionId: string;
  kind: ProbeKind;
  anchor: Anchor;
  question: string;
  /** Examiner's private reason for asking — shown in the transcript, never before commit. */
  whyThisProbe: string;
  reference: Reference;
  timerSec: number;
  difficulty: Difficulty;

  answer?: string;
  answerMode?: 'text' | 'voice';
  committedAt?: number;
  timeUsedSec?: number;
  selfGrade?: SelfGrade;
  ai?: AiScore;
  divergence?: DivergenceClass;

  /** Pre-baked alternate phrasing used by keyless retraining. */
  variant?: { question: string; whyThisProbe: string };
}

export interface Fragility {
  anchor: Anchor;
  note: string;
}

export interface Diagnosis {
  headline: string;
  owned: string[];
  borrowed: string[];
  illusions: { probeId: string; line: string }[];
  nextActions: string[];
  model: string;
  at: number;
}

export interface Session {
  id: string;
  title: string;
  packId: PackId;
  detected?: { packId: PackId; confidence: number };
  material: string;
  materialKind: MaterialKind;
  materialLanguage?: string;
  createdAt: number;
  completedAt?: number;
  status: SessionStatus;
  mode: SessionMode;
  preset: RunPreset;
  difficulty: Difficulty;
  probes: Probe[];
  fragilities: Fragility[];
  diagnosis?: Diagnosis;
  /** Model used for generation. */
  model?: string;
  /** Cached derived values (recomputed on read; stored for list views). */
  ownershipIndex?: number;
  calibration?: number;

  sampleId?: string;
  cohortId?: string;
  submissionId?: string;
  parentSessionId?: string;
}

export interface RetrainTarget {
  id: string;
  sessionId: string;
  probeId: string;
  dimensionId: string;
  anchor: Anchor;
  packId: PackId;
  /** 0=new, 1=1d, 2=3d, 3=7d, 4=21d → retired after passing at 4. */
  stage: 0 | 1 | 2 | 3 | 4;
  dueAt: number;
  passesInRow: number;
  history: { at: number; probeId: string; score?: number; selfGrade?: SelfGrade }[];
  retired: boolean;
}

export interface Submission {
  id: string;
  label: string;
  material: string;
  materialKind: MaterialKind;
  /** The generated probe set lives as a Session with mode 'class'. */
  sessionId?: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
  error?: string;
  result?: ResultTicket;
}

export interface Cohort {
  id: string;
  name: string;
  packId: PackId;
  preset: RunPreset;
  difficulty: Difficulty;
  createdAt: number;
  submissions: Submission[];
  aggregate?: Aggregate;
  isDemo?: boolean;
}

export interface Aggregate {
  classWeakDimensions: { dimensionId: string; share: number }[];
  commonFragilities: { theme: string; submissionIds: string[] }[];
  suggestedInClassProbes: string[];
  perSubmissionFlags: Record<string, string>;
  at: number;
}

export interface ResultTicket {
  v: 2; kind: 'result';
  submissionId: string; cohortId: string;
  probes: Pick<Probe, 'id' | 'dimensionId' | 'selfGrade' | 'ai' | 'divergence'>[];
  ownershipIndex: number; calibration: number; at: number;
}

export interface StudentTicket {
  v: 2; kind: 'student';
  cohortId: string; submissionId: string; session: Session;
}

export interface CohortExport {
  v: 2; kind: 'cohort';
  cohort: Cohort; sessions: Session[];
}

export type ProviderId =
  | 'openai' | 'deepseek' | 'openrouter' | 'moonshot' | 'siliconflow' | 'custom';

export interface Settings {
  provider: ProviderId;
  apiBase: string;
  apiKey: string;
  model: string;
  count: 4 | 6 | 8 | 10 | 12;
  preset: RunPreset;
  difficulty: Difficulty;
  theme: 'paper' | 'slate' | 'system';
  language: 'en' | 'zh-CN' | 'auto';
  voiceEnabled: boolean;
  timersEnabled: boolean;
  /** false → score every probe at the end of the run instead of on commit. */
  scoreOnCommit: boolean;
}

export interface UiState {
  firstOpenSeen: boolean;
  lastRoute?: string;
  keyBannerDismissedAt?: number;
  migratedV1?: boolean;
}

export interface StoreV2 {
  v: 2;
  settings: Settings;
  sessions: Session[];
  cohorts: Cohort[];
  queue: RetrainTarget[];
  ui: UiState;
}

/* ---------- Discipline pack framework (spec §3.2) ---------- */

export interface ProbeDimension {
  id: string;
  label: string;
  oneLine: string;
  /** How a human examiner attacks this dimension. */
  examinerMoves: string[];
  ownedLooksLike: string;
  surfaceLooksLike: string;
}

export interface PackDetect {
  keywords: { term: string; weight: number }[];
  regexes: { source: string; weight: number }[];
  fileExtensions: string[];
  codeFenceLangs: string[];
}

export interface DisciplinePack {
  id: PackId;
  name: string;
  shortName: string;
  /** id of an inline SVG symbol in the pack glyph sprite. */
  glyph: string;
  tagline: string;
  detect: PackDetect;
  materialKinds: string[];
  dimensions: ProbeDimension[];
  probeKinds: { allowed: ProbeKind[]; mix: Record<Difficulty, Partial<Record<ProbeKind, number>>> };
  counterfactualLevers: string[];
  /** Field-specific ghostwriting tells — used ONLY to aim probes, never shown as accusations. */
  tells: string[];
  vocabularyTraps: string[];
  rubric: { scale: string[]; perDimension?: Record<string, string[]> };
  timing: Record<ProbeKind, number>;
  languageNote: string;
  sampleProbes: string[];
}

export interface DetectResult {
  packId: PackId;
  confidence: number;
  alternates: { packId: PackId; confidence: number }[];
}

/* ---------- LLM layer contracts (spec §4) ---------- */

export type LlmErrorKind = 'auth' | 'rate' | 'network' | 'parse' | 'refusal' | 'aborted';

export class LlmError extends Error {
  kind: LlmErrorKind;
  status?: number;
  constructor(kind: LlmErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
    this.status = status;
  }
}
