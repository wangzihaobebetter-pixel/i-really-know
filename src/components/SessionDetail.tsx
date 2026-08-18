import { useStore } from '../store'

export default function SessionDetail({ sessionId }: { sessionId: string }) {
  const { sessions, setView } = useStore()
  const session = sessions.find((s) => s.id === sessionId)

  if (!session) {
    return (
      <div className="view">
        <p>找不到这次检验。</p>
        <button onClick={() => setView({ name: 'history' })}>回历史</button>
      </div>
    )
  }

  const fmt = (ts: number) => new Date(ts).toLocaleString('zh-CN')

  return (
    <div className="view detail">
      <header className="bar">
        <button className="ghost" onClick={() => setView({ name: 'history' })}>
          ← 历史
        </button>
        <div className="bar-title">{session.title}</div>
        <button
          className="ghost small"
          onClick={() => setView({ name: 'quiz', sessionId: session.id })}
        >
          继续答
        </button>
      </header>

      <div className="card">
        <div className="detail-meta">
          <div>{fmt(session.createdAt)}</div>
          <div>模型：{session.model}</div>
        </div>
        <details className="material">
          <summary>查看原始材料（{session.material.length.toLocaleString()} 字）</summary>
          <pre className="material-pre">{session.material}</pre>
        </details>
      </div>

      {session.summary && (
        <div className="card">
          <h3>AI 诊断</h3>
          <div className="summary">{session.summary}</div>
        </div>
      )}

      <div className="card">
        <h3>逐题回顾</h3>
        <ul className="review-list">
          {session.questions.map((q, i) => (
            <li key={q.id} className={`review-item ${q.rating || 'none'}`}>
              <div className="review-head">
                <span className="badge">{q.type}</span>
                <span className="point">{q.point}</span>
                <span className="review-rating">
                  {q.rating === 'real' ? '✓ 真懂' : q.rating === 'fuzzy' ? '~ 模糊' : q.rating === 'ai' ? '✗ AI 替懂' : '未答'}
                </span>
              </div>
              <div className="review-q">
                {i + 1}. {q.text}
              </div>
              {q.answer && <div className="review-a">我的回答：{q.answer}</div>}
              <details className="review-key">
                <summary>参考答案要点</summary>
                <div className="answerkey">{q.answerKey}</div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
