/**
 * One-shot migration from the v1 MVP store (spec §7.4).
 * v1 lived in localStorage under `ireallyknow-v1` (zustand persist envelope).
 * The v1 payload is never deleted — migration is additive and idempotent.
 */
import type {
  Difficulty, Probe, ProbeKind, SelfGrade, Session, Settings,
} from '../types';
import { detectMaterialKind } from './analysis';
import { id } from './ids';

export const V1_KEY = 'ireallyknow-v1';

type V1Rating = 'real' | 'fuzzy' | 'ai';
interface V1Question {
  id: string; text: string; point: string; type: string; answerKey: string;
  answer?: string; rating?: V1Rating;
}
interface V1Session {
  id: string; title: string; material: string; createdAt: number;
  questions: V1Question[]; summary?: string; model: string;
}
interface V1Settings {
  apiBase: string; apiKey: string; model: string; count: number;
  difficulty: 'basic' | 'standard' | 'spicy';
}

const TYPE_TO_DIMENSION: Record<string, ProbeKind> = {
  '概念解释': 'concept',
  '方法选择': 'method',
  '细节追问': 'provenance',
  '反事实': 'counterfactual',
  '盲点探测': 'blindspot',
};

const RATING_TO_SELF: Record<V1Rating, SelfGrade> = {
  real: 'owned',
  fuzzy: 'shaky',
  ai: 'notmine',
};

const DIFF_MAP: Record<V1Settings['difficulty'], Difficulty> = {
  basic: 'foundations',
  standard: 'standard',
  spicy: 'defense',
};

export interface V1MigrationResult {
  sessions: Session[];
  settings?: Partial<Settings>;
  count: number;
}

function readV1(): { sessions?: V1Session[]; settings?: V1Settings } | null {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parsed?.state ?? parsed;
    if (!state || typeof state !== 'object') return null;
    return state;
  } catch {
    return null;
  }
}

export function migrateV1(): V1MigrationResult | null {
  const state = readV1();
  if (!state) return null;

  const v1Sessions = Array.isArray(state.sessions) ? state.sessions : [];
  const difficulty = state.settings ? DIFF_MAP[state.settings.difficulty] ?? 'standard' : 'standard';

  const sessions: Session[] = v1Sessions.map((s) => {
    const probes: Probe[] = (s.questions ?? []).map((q) => {
      const kind = TYPE_TO_DIMENSION[q.type] ?? 'concept';
      return {
        id: q.id || id('p'),
        dimensionId: kind,
        kind,
        anchor: { quote: '', placed: false },
        question: q.text,
        whyThisProbe: q.point || '',
        reference: { keyPoints: q.answerKey ? [q.answerKey] : [], ownedLooksLike: '', surfaceLooksLike: '' },
        timerSec: 90,
        difficulty,
        answer: q.answer,
        answerMode: q.answer ? 'text' : undefined,
        selfGrade: q.rating ? RATING_TO_SELF[q.rating] : undefined,
      };
    });
    const allRated = probes.length > 0 && probes.every((p) => p.selfGrade);
    return {
      id: s.id || id('s'),
      title: s.title || 'Imported from v1',
      packId: 'general',
      material: s.material ?? '',
      materialKind: detectMaterialKind(s.material ?? ''),
      createdAt: s.createdAt || Date.now(),
      completedAt: allRated ? s.createdAt : undefined,
      status: allRated ? 'complete' : 'abandoned',
      mode: 'viva',
      preset: 'standard',
      difficulty,
      probes,
      fragilities: [],
      diagnosis: s.summary
        ? { headline: s.summary, owned: [], borrowed: [], illusions: [], nextActions: [], model: s.model || '', at: s.createdAt || Date.now() }
        : undefined,
      model: s.model,
    };
  });

  const settings: Partial<Settings> | undefined = state.settings
    ? {
        apiBase: state.settings.apiBase,
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        difficulty,
        provider: inferProvider(state.settings.apiBase),
        count: Math.max(4, Math.min(7, Number(state.settings.count) || 6)) as Settings['count'],
      }
    : undefined;

  return { sessions, settings, count: sessions.length };
}

function inferProvider(base: string): Settings['provider'] {
  const b = (base || '').toLowerCase();
  if (b.includes('deepseek')) return 'deepseek';
  if (b.includes('openrouter')) return 'openrouter';
  if (b.includes('moonshot')) return 'moonshot';
  if (b.includes('siliconflow')) return 'siliconflow';
  if (b.includes('api.openai.com')) return 'openai';
  return b ? 'custom' : 'openai';
}
