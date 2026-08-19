/**
 * Operations that span the store, the LLM layer and the retraining queue.
 * Screens call these instead of orchestrating the pieces themselves.
 */
import type { Probe, RetrainTarget, SelfGrade, Session, Settings } from '../types';
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
      stage: 1 as const,
      dueAt: now() + DAY_MS,
      passesInRow: 0,
      history: [],
      retired: false,
    }));
}

/** A deterministic changed-angle fallback for offline/keyless returns. */
export function localFollowupVariant(probe: Probe, target: RetrainTarget, lang: 'en' | 'zh-CN'): Probe {
  const en = [
    'Take this part of your work from the other direction: what would have to change for its reasoning no longer to hold?',
    'Explain the mechanism behind this part without repeating its wording. Where is the nearest boundary case?',
    'State the claim in different words, then name one weakness or exception it does not cover.',
  ];
  const zh = [
    '从相反方向看这部分：什么条件一变，这里的推理就不再成立？',
    '不要复述原句，说明这部分背后的机制；离它最近的边界情况是什么？',
    '换一种说法讲出这里的主张，再指出它没有覆盖的一个弱点或例外。',
  ];
  const attempt = target.history.length;
  const supplied = attempt === 0 && probe.variant?.question.trim() && probe.variant.question.trim() !== probe.question.trim()
    ? probe.variant
    : undefined;
  const fallbackIndex = probe.variant ? Math.max(0, attempt - 1) % en.length : attempt % en.length;
  return {
    ...probe,
    id: `${probe.id}_again_${attempt}`,
    question: supplied?.question ?? (lang === 'zh-CN' ? zh : en)[fallbackIndex],
    whyThisProbe: supplied?.whyThisProbe ?? (lang === 'zh-CN'
      ? '同一概念，换一个机制、扰动或边界角度再问。'
      : 'The same concept, returned through a mechanism, perturbation, or boundary angle.'),
  };
}

/** Advances or resets a retraining target after an attempt. */
export function gradeTarget(
  target: RetrainTarget, held: boolean, probeId: string, score?: number, selfGrade?: SelfGrade,
  answer?: string, question?: string,
): Partial<RetrainTarget> {
  const history = [...target.history, {
    at: now(), probeId, question: question?.slice(0, 2_000), answer: answer?.slice(0, 20_000), score, selfGrade,
  }];
  if (!held) {
    return { history, draft: undefined, passesInRow: 0, stage: 1, dueAt: now() + DAY_MS };
  }
  const stage = Math.min(3, target.stage + 1) as RetrainTarget['stage'];
  const passesInRow = target.passesInRow + 1;
  return {
    history,
    draft: undefined,
    passesInRow,
    stage,
    dueAt: now() + STAGE_DAYS[stage] * DAY_MS,
    retired: target.stage >= 3 && passesInRow >= 3,
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

/** Keeps interrupted work on a recoverable screen instead of opening an empty viva. */
export function studentDestination(session: Session): 'read' | 'run' | 'result' {
  if (session.status === 'complete') return 'result';
  if (session.status === 'generating' || session.status === 'error' || session.status === 'abandoned' || session.probes.length === 0) return 'read';
  return 'run';
}

export function formatDate(at: number, lang: 'en' | 'zh-CN'): string {
  if (!Number.isFinite(at) || Math.abs(at) > 8_640_000_000_000_000) return '—';
  try {
    return new Date(at).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '—';
  }
}
