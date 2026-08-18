/**
 * Operations that span the store, the LLM layer and the retraining queue.
 * Screens call these instead of orchestrating the pieces themselves.
 */
import type { Probe, RetrainTarget, Session, Settings } from '../types';
import { useStore } from '../store';
import { PRESET_COUNTS } from '../store/presets';
import { detectPack } from '../packs';
import { detectMaterialKind, titleFromMaterial, verdictOf } from './analysis';
import { generate, type CallOpts } from './llm';
import { id, now } from './ids';

/** Spacing ladder for retraining (spec §7.1): new → 1d → 3d → 7d → 21d. */
export const STAGE_DAYS: Record<RetrainTarget['stage'], number> = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 21 };
const DAY_MS = 86_400_000;

export interface DraftInit {
  material: string;
  packId?: Session['packId'];
  preset?: Session['preset'];
  difficulty?: Session['difficulty'];
  title?: string;
}

/** Creates a session in `generating` state and returns it — no network yet. */
export function createDraft(init: DraftInit): Session {
  const detected = detectPack(init.material);
  const packId = init.packId ?? detected.packId;
  return useStore.getState().createSession({
    material: init.material,
    packId,
    detected: { packId: detected.packId, confidence: detected.confidence },
    title: init.title ?? titleFromMaterial(init.material),
    materialKind: detectMaterialKind(init.material),
    preset: init.preset,
    difficulty: init.difficulty,
    status: 'generating',
    mode: 'viva',
  });
}

/** Runs GENERATE and moves the session to `ready`, or marks it abandoned. */
export async function generateFor(
  session: Session, settings: Settings, uiLanguage: string, opts: CallOpts = {},
): Promise<Session> {
  const store = useStore.getState();
  const count = PRESET_COUNTS[session.preset] ?? settings.count;
  try {
    const result = await generate(settings, session, count, session.difficulty, uiLanguage, opts);
    const next: Session = {
      ...session,
      probes: result.probes,
      fragilities: result.fragilities,
      materialLanguage: result.materialLanguage,
      detected: result.detected ?? session.detected,
      status: 'ready',
      model: settings.model,
    };
    store.upsertSession(next);
    return next;
  } catch (err) {
    store.updateSession(session.id, { status: 'abandoned' });
    throw err;
  }
}

/** Weak probes from a finished run, as retraining targets. */
export function targetsFromSession(session: Session): RetrainTarget[] {
  return session.probes
    .filter((p) => {
      /* Axis A only. A span you could not fully defend comes back — including
         the ones you *had* claimed. `underclaimed` deliberately does NOT queue:
         you already defended it, and sending it back would teach the 46% who
         underestimate themselves that being right is a reason to be retested. */
      const v = verdictOf(p);
      return v === 'undefended' || v === 'partial';
    })
    .map((p) => ({
      id: id('t'),
      sessionId: session.id,
      probeId: p.id,
      dimensionId: p.dimensionId,
      anchor: p.anchor,
      packId: session.packId,
      stage: 0 as const,
      dueAt: now(),
      passesInRow: 0,
      history: [],
      retired: false,
    }));
}

/** Advances or resets a retraining target after an attempt. */
export function gradeTarget(target: RetrainTarget, held: boolean, probeId: string, score?: number): Partial<RetrainTarget> {
  const history = [...target.history, { at: now(), probeId, score }];
  if (!held) {
    return { history, passesInRow: 0, stage: 0, dueAt: now() + DAY_MS };
  }
  const stage = Math.min(4, target.stage + 1) as RetrainTarget['stage'];
  const passesInRow = target.passesInRow + 1;
  return {
    history,
    passesInRow,
    stage,
    dueAt: now() + STAGE_DAYS[stage] * DAY_MS,
    retired: stage === 4 && passesInRow >= 4,
  };
}

/** Finds the source probe for a retraining target. */
export function probeForTarget(target: RetrainTarget): { session?: Session; probe?: Probe } {
  const session = useStore.getState().sessions.find((s) => s.id === target.sessionId);
  return { session, probe: session?.probes.find((p) => p.id === target.probeId) };
}

export function relativeWhen(at: number, lang: 'en' | 'zh-CN'): string {
  const diff = at - now();
  const days = Math.round(diff / DAY_MS);
  if (diff <= 0) return lang === 'en' ? 'now' : '现在';
  if (days <= 1) return lang === 'en' ? 'tomorrow' : '明天';
  return lang === 'en' ? `in ${days} days` : `${days} 天后`;
}

export function formatDate(at: number, lang: 'en' | 'zh-CN'): string {
  return new Date(at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
