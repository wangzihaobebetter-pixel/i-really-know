import { useMemo } from 'react'
import { useStore } from '../store'

export default function Map({ sessionId }: { sessionId: string }) {
  const { sessions, setView, settings, setSummary, setSettings } = useStore()
  const session = sessions.find((s) => s.id === sessionId)

  const groups = useMemo(() => {
    if (!session) return { real: [], fuzzy: [], ai: [] }
    const real = session.questions.filter((q) => q.rating === 'real')
    const fuzzy = session.questions.filter((q) => q.rating === 'fuzzy')
    const ai = session.questions.filter((q) => q.rating === 'ai')
    return { real, fuzzy, ai }
  }, [session])

  if (!session) {
    return (
      <div className="view">
        <p>找不到这次检验。</p>
        <button onClick={() => setView({ name: 'home' })}>回首页</button>
      </div>
    )
  }

  const pct = (n: number) =>
    session.questions.length ? Math.round((n / session.questions.length) * 100) : 0
  const unanswered = session.questions.filter((q) => !q.rating).length

  const renderGroup = (
    title: string,
    items: typeof groups.real,
    cls: 'real' | 'fuzzy' | 'ai',
    desc: string
  ) => (
    <div className={`map-group ${cls}`}>
      <div className="map-group-head">
        <span className="map-dot" />
        <strong>{title}</strong>
        <span className="map-count">
          {items.length} 题 · {pct(items.length)}%
        </span>
      </div>
      <p className="map-desc">{desc}</p>
      {items.length === 0 ? (
        <p className="map-empty">（无）</p>
      ) : (
        <ul className="map-list">
          {items.map((q) => (
            <li key={q.id}>
              <span className="map-point">{q.point}</span>
              <span className="map-type">{q.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="view map">
      <header className="bar">
        <button className="ghost" onClick={() => setView({ name: 'history' })}>
          ← 历史
        </button>
        <div className="bar-title" title={session.title}>
          {session.title}
        </div>
        <div className="progress">地图</div>
      </header>

      <div className="map-overview">
        <div className="map-big real">{pct(groups.real.length)}%</div>
        <div className="map-big-label">真懂</div>
        <div className="map-meter">
          <div className="m-real" style={{ width: `${pct(groups.real.length)}%` }} />
          <div className="m-fuzzy" style={{ width: `${pct(groups.fuzzy.length)}%` }} />
          <div className="m-ai" style={{ width: `${pct(groups.ai.length)}%` }} />
        </div>
        <div className="map-legend">
          <span>✓ 真懂 {groups.real.length}</span>
          <span>~ 模糊 {groups.fuzzy.length}</span>
          <span>✗ AI 替懂 {groups.ai.length}</span>
          {unanswered > 0 && <span>未答 {unanswered}</span>}
        </div>
      </div>

      {renderGroup(
        '真懂',
        groups.real,
        'real',
        '这些你可以放心：被追问到细节也站得住。'
      )}
      {renderGroup(
        '有点模糊',
        groups.fuzzy,
        'fuzzy',
        '知道个大概，但经不起追问。复习时优先补这里。'
      )}
      {renderGroup(
        'AI 替懂的',
        groups.ai,
        'ai',
        '这些是"看起来会了"的部分——真正危险的地方。考试和面试会在这里露馅。'
      )}

      <div className="card actions">
        <button className="primary" onClick={() => setView({ name: 'home' })}>
          再检验一份材料
        </button>
        {session.summary && <div className="summary">{session.summary}</div>}
      </div>
    </div>
  )
}
