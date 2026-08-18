import { useStore } from '../store'

export default function History() {
  const { sessions, setView, deleteSession } = useStore()

  const fmt = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const stats = (s: (typeof sessions)[number]) => {
    const total = s.questions.length
    const answered = s.questions.filter((q) => q.rating).length
    const real = s.questions.filter((q) => q.rating === 'real').length
    return { total, answered, real }
  }

  return (
    <div className="view history">
      <header className="bar">
        <button className="ghost" onClick={() => setView({ name: 'home' })}>
          ← 首页
        </button>
        <div className="bar-title">检验历史</div>
        <div className="progress">{sessions.length} 次</div>
      </header>

      {sessions.length === 0 ? (
        <div className="card empty">
          <p>还没有检验记录。</p>
          <button className="primary" onClick={() => setView({ name: 'home' })}>
            去检验第一份材料
          </button>
        </div>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const st = stats(s)
            return (
              <li key={s.id} className="session-item">
                <button
                  className="session-main"
                  onClick={() => setView({ name: 'session', sessionId: s.id })}
                >
                  <div className="session-title">{s.title}</div>
                  <div className="session-meta">
                    {fmt(s.createdAt)} · {st.total} 题 · 答 {st.answered} · 真懂 {st.real}
                  </div>
                  <div className="session-model">{s.model}</div>
                </button>
                <button
                  className="ghost small danger"
                  onClick={() => {
                    if (confirm('删除这次检验？')) deleteSession(s.id)
                  }}
                >
                  删
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
