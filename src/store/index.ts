/**
 * The single application store (spec §7.2). WP0 owns this file.
 * Persisted to IndexedDB under `irk-v2` (version 2) with a one-shot v1 import.
 * Other packages import `useStore` and the selectors here; nobody redefines state.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Cohort, Probe, RetrainTarget, Session, Settings, StoreV2, Submission, UiState,
} from '../types';
import { idbStorage, writeUiSlice } from '../lib/storage';
import { migrateV1 } from '../lib/migrate-v1';
import { calibration, ownershipIndex, placeAllAnchors, withDivergence } from '../lib/analysis';
import { id, now } from '../lib/ids';
import { PROVIDER_PRESETS } from './presets';

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  apiBase: PROVIDER_PRESETS[0].apiBase,
  apiKey: '',
  model: PROVIDER_PRESETS[0].model,
  count: 6,
  preset: 'standard',
  difficulty: 'standard',
  theme: 'system',
  language: 'auto',
  voiceEnabled: true,
  /* P3 §6 and corpus 05 §2.1: silence is thinking time. v2 shipped a visible
     countdown at 1:30 on the viva screen; a student watching a ring drain is
     being pressured, not examined. The timer stays available in Settings for
     anyone rehearsing a real timed viva, but it is OFF by default. */
  timersEnabled: false,
  scoreOnCommit: true,
};

const DEFAULT_UI: UiState = { firstOpenSeen: false };

interface Actions {
  /* settings */
  setSettings: (patch: Partial<Settings>) => void;
  applyProviderPreset: (providerId: Settings['provider']) => void;

  /* sessions */
  createSession: (init: Partial<Session> & Pick<Session, 'material' | 'packId'>) => Session;
  upsertSession: (session: Session) => void;
  updateSession: (sessionId: string, patch: Partial<Session>) => void;
  deleteSession: (sessionId: string) => void;
  updateProbe: (sessionId: string, probeId: string, patch: Partial<Probe>) => void;
  /** Recomputes divergence + cached index/calibration and stamps completion. */
  finalizeSession: (sessionId: string) => Session | undefined;

  /* retraining queue */
  addTargets: (targets: RetrainTarget[]) => void;
  updateTarget: (targetId: string, patch: Partial<RetrainTarget>) => void;
  removeTarget: (targetId: string) => void;

  /* cohorts */
  upsertCohort: (cohort: Cohort) => void;
  updateCohort: (cohortId: string, patch: Partial<Cohort>) => void;
  deleteCohort: (cohortId: string) => void;
  updateSubmission: (cohortId: string, submissionId: string, patch: Partial<Submission>) => void;

  /* ui + data */
  setUi: (patch: Partial<UiState>) => void;
  exportAll: () => StoreV2;
  importAll: (data: Partial<StoreV2>, mode?: 'merge' | 'replace') => { sessions: number; cohorts: number };
  wipeAll: () => void;
  runV1Migration: () => number;
}

export type Store = StoreV2 & Actions;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      v: 2,
      settings: { ...DEFAULT_SETTINGS },
      sessions: [],
      cohorts: [],
      queue: [],
      ui: { ...DEFAULT_UI },

      setSettings: (patch) => {
        set({ settings: { ...get().settings, ...patch } });
        if (patch.theme || patch.language) {
          writeUiSlice({ theme: patch.theme ?? get().settings.theme, language: patch.language ?? get().settings.language });
        }
      },

      applyProviderPreset: (providerId) => {
        const p = PROVIDER_PRESETS.find((x) => x.id === providerId);
        if (!p) return;
        const keepCustom = providerId === 'custom';
        set({
          settings: {
            ...get().settings,
            provider: providerId,
            apiBase: keepCustom ? get().settings.apiBase : p.apiBase,
            model: keepCustom ? get().settings.model : p.model,
          },
        });
      },

      createSession: (init) => {
        const session: Session = {
          id: init.id ?? id('s'),
          title: init.title ?? 'Untitled submission',
          packId: init.packId,
          detected: init.detected,
          material: init.material,
          materialKind: init.materialKind ?? 'prose',
          materialLanguage: init.materialLanguage,
          createdAt: init.createdAt ?? now(),
          status: init.status ?? 'generating',
          mode: init.mode ?? 'viva',
          preset: init.preset ?? get().settings.preset,
          difficulty: init.difficulty ?? get().settings.difficulty,
          probes: init.probes ?? [],
          fragilities: init.fragilities ?? [],
          diagnosis: init.diagnosis,
          model: init.model,
          sampleId: init.sampleId,
          cohortId: init.cohortId,
          submissionId: init.submissionId,
          parentSessionId: init.parentSessionId,
        };
        const placed = placeAllAnchors(session);
        set({ sessions: [placed, ...get().sessions] });
        return placed;
      },

      upsertSession: (session) => {
        const exists = get().sessions.some((s) => s.id === session.id);
        set({
          sessions: exists
            ? get().sessions.map((s) => (s.id === session.id ? session : s))
            : [session, ...get().sessions],
        });
      },

      updateSession: (sessionId, patch) =>
        set({ sessions: get().sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)) }),

      deleteSession: (sessionId) =>
        set({
          sessions: get().sessions.filter((s) => s.id !== sessionId),
          queue: get().queue.filter((t) => t.sessionId !== sessionId),
        }),

      updateProbe: (sessionId, probeId, patch) =>
        set({
          sessions: get().sessions.map((s) =>
            s.id === sessionId
              ? { ...s, probes: s.probes.map((p) => (p.id === probeId ? { ...p, ...patch } : p)) }
              : s,
          ),
        }),

      finalizeSession: (sessionId) => {
        const s = get().sessions.find((x) => x.id === sessionId);
        if (!s) return undefined;
        const probes = withDivergence(s.probes);
        const next: Session = {
          ...s,
          probes,
          status: 'complete',
          completedAt: s.completedAt ?? now(),
          ownershipIndex: ownershipIndex(probes),
          calibration: calibration(probes),
        };
        set({ sessions: get().sessions.map((x) => (x.id === sessionId ? next : x)) });
        return next;
      },

      addTargets: (targets) => {
        const existing = new Set(get().queue.map((t) => `${t.sessionId}:${t.probeId}`));
        const fresh = targets.filter((t) => !existing.has(`${t.sessionId}:${t.probeId}`));
        if (fresh.length) set({ queue: [...get().queue, ...fresh] });
      },

      updateTarget: (targetId, patch) =>
        set({ queue: get().queue.map((t) => (t.id === targetId ? { ...t, ...patch } : t)) }),

      removeTarget: (targetId) => set({ queue: get().queue.filter((t) => t.id !== targetId) }),

      upsertCohort: (cohort) => {
        const exists = get().cohorts.some((c) => c.id === cohort.id);
        set({
          cohorts: exists
            ? get().cohorts.map((c) => (c.id === cohort.id ? cohort : c))
            : [cohort, ...get().cohorts],
        });
      },

      updateCohort: (cohortId, patch) =>
        set({ cohorts: get().cohorts.map((c) => (c.id === cohortId ? { ...c, ...patch } : c)) }),

      deleteCohort: (cohortId) => set({ cohorts: get().cohorts.filter((c) => c.id !== cohortId) }),

      updateSubmission: (cohortId, submissionId, patch) =>
        set({
          cohorts: get().cohorts.map((c) =>
            c.id === cohortId
              ? { ...c, submissions: c.submissions.map((s) => (s.id === submissionId ? { ...s, ...patch } : s)) }
              : c,
          ),
        }),

      setUi: (patch) => set({ ui: { ...get().ui, ...patch } }),

      exportAll: () => {
        const { v, settings, sessions, cohorts, queue, ui } = get();
        // The key never leaves the browser in an export.
        return { v, settings: { ...settings, apiKey: '' }, sessions, cohorts, queue, ui };
      },

      importAll: (data, mode = 'merge') => {
        const incomingSessions = data.sessions ?? [];
        const incomingCohorts = data.cohorts ?? [];
        if (mode === 'replace') {
          set({
            sessions: incomingSessions,
            cohorts: incomingCohorts,
            queue: data.queue ?? [],
            settings: { ...get().settings, ...(data.settings ?? {}), apiKey: get().settings.apiKey },
          });
          return { sessions: incomingSessions.length, cohorts: incomingCohorts.length };
        }
        const haveS = new Set(get().sessions.map((s) => s.id));
        const haveC = new Set(get().cohorts.map((c) => c.id));
        const addS = incomingSessions.filter((s) => !haveS.has(s.id));
        const addC = incomingCohorts.filter((c) => !haveC.has(c.id));
        set({
          sessions: [...addS, ...get().sessions],
          cohorts: [...addC, ...get().cohorts],
          queue: [...get().queue, ...(data.queue ?? []).filter((t) => !get().queue.some((x) => x.id === t.id))],
        });
        return { sessions: addS.length, cohorts: addC.length };
      },

      wipeAll: () =>
        set({ sessions: [], cohorts: [], queue: [], ui: { ...DEFAULT_UI, firstOpenSeen: true } }),

      runV1Migration: () => {
        if (get().ui.migratedV1) return 0;
        const result = migrateV1();
        set({ ui: { ...get().ui, migratedV1: true } });
        if (!result || !result.count) return 0;
        const have = new Set(get().sessions.map((s) => s.id));
        const add = result.sessions.filter((s) => !have.has(s.id));
        set({
          sessions: [...add, ...get().sessions],
          settings: {
            ...get().settings,
            ...(result.settings ?? {}),
          },
        });
        return add.length;
      },
    }),
    {
      name: 'irk-v2',
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        v: s.v, settings: s.settings, sessions: s.sessions,
        cohorts: s.cohorts, queue: s.queue, ui: s.ui,
      }) as unknown as Store,
    },
  ),
);

/* ---------- selectors (import these; do not recompute in screens) ---------- */

export const selectSession = (sessionId: string | undefined) => (s: Store) =>
  sessionId ? s.sessions.find((x) => x.id === sessionId) : undefined;

export const selectCohort = (cohortId: string | undefined) => (s: Store) =>
  cohortId ? s.cohorts.find((x) => x.id === cohortId) : undefined;

export const selectDueTargets = (at = Date.now()) => (s: Store) =>
  s.queue.filter((t) => !t.retired && t.dueAt <= at);

export const selectHasKey = (s: Store) => Boolean(s.settings.apiKey.trim());

export const selectRealSessions = (s: Store) => s.sessions.filter((x) => x.mode !== 'class');
