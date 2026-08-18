import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Question, Session, Settings, View } from './types'
import { DEFAULT_SETTINGS } from './types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

interface State {
  settings: Settings
  sessions: Session[]
  view: View
  // 生成中的状态
  generating: boolean
  genError: string | null
  // 当前正在答的题索引（答题页用）
  setSettings: (s: Partial<Settings>) => void
  setView: (v: View) => void
  createSession: (title: string, material: string, questions: Question[], model: string) => Session
  deleteSession: (id: string) => void
  updateAnswer: (sessionId: string, qIndex: number, patch: Partial<Question>) => void
  setSummary: (sessionId: string, summary: string) => void
  setGenerating: (g: boolean, err?: string | null) => void
  importSessions: (s: Session[]) => number
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      sessions: [],
      view: { name: 'home' },
      generating: false,
      genError: null,
      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setView: (v) => set({ view: v }),
      createSession: (title, material, questions, model) => {
        const session: Session = {
          id: uid(),
          title: title.trim() || '未命名检验',
          material,
          createdAt: Date.now(),
          questions,
          model
        }
        set({ sessions: [session, ...get().sessions] })
        return session
      },
      deleteSession: (id) =>
        set({ sessions: get().sessions.filter((s) => s.id !== id) }),
      updateAnswer: (sessionId, qIndex, patch) =>
        set({
          sessions: get().sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  questions: s.questions.map((q, i) => (i === qIndex ? { ...q, ...patch } : q))
                }
              : s
          )
        }),
      setSummary: (sessionId, summary) =>
        set({
          sessions: get().sessions.map((s) => (s.id === sessionId ? { ...s, summary } : s))
        }),
      setGenerating: (g, err = null) => set({ generating: g, genError: err }),
      importSessions: (sessions) => {
        const existing = new Set(get().sessions.map((s) => s.id))
        const fresh = sessions.filter((s) => !existing.has(s.id))
        if (fresh.length) set({ sessions: [...fresh, ...get().sessions] })
        return fresh.length
      }
    }),
    {
      name: 'ireallyknow-v1',
      version: 1
    }
  )
)
