import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { generateSummary } from '../lib/llm'
import type { Rating } from '../types'

export default function Quiz({ sessionId }: { sessionId: string }) {
  const { sessions, updateAnswer, setView, setSummary, settings } = useStore()
  const session = sessions.find((s) => s.id === sessionId)
  const [idx, setIdx] = useState(0)
  const [showKey, setShowKey] = useState<Record<number, boolean>>({})
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryErr, setSummaryErr] = useState<string | null>(null)

  const q = session?.questions?.[idx]

  const stats = useMemo(() => {
    if (!session) return { real: 0, fuzzy: 0, ai: 0, total: 0, answered: 0 }
    const total = session.questions.length
    const answered = session.questions.filter((x) => x.rating).length
    return {
      real: session.questions.filter((x) => x.rating === 'real').length,
      fuzzy: session.questions.filter((x) => x.rating === 'fuzzy').length,
      ai: session.questions.filter((x) => x.rating === 'ai').length,
      total,
      answered
    }
  }, [session])

  if (!session || !q) {
    return (
      <div className="view">
        <p>找不到这次检验。</p>
        <button onClick={() => setView({ name: 'home' })}>回首页</button>
      </div>
    )
  }

  const allRated = stats.answered === stats.total

  const rate = (r: Rating) => {
    updateAnswer(sessionId, idx, { rating: r })
    if (idx < stats.total - 1) setIdx(idx + 1)
  }

  const handleSummary = async () => {
    setSummaryLoading(true)
    setSummaryErr(null)
    try {
      const s = await generateSummary(settings, session.material, session.questions)
      setSummary(sessionId, s)
    } catch (e) {
      setSummaryErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="view quiz">
      <header className="bar">
        <button className="ghost" onClick={() => setView({ name: 'history' })}>
          ← 历史
        </button>
        <div className="bar-title" title={session.title}>
          {session.title}
        </div>
        <div className="progress">
          {stats.answered}/{stats.total}
        </div>
      </header>

      {/* 进度条 */}
      <div className="segments">
        {session.questions.map((qq, i) => (
          <button
            key={qq.id}
            className={`seg ${i === idx ? 'cur' : ''} ${qq.rating ? 'rated ' + qq.rating : ''}`}
            onClick={() => setIdx(i)}
            aria-label={`第 ${i + 1} 题`}
          />
        ))}
      </div>

      <div className="card qcard">
        <div className="qmeta">
          <span className="badge">{q.type}</span>
          <span className="point">考察点：{q.point}</span>
        </div>
        <div className="qtext">{q.text}</div>

        <textarea
          className="qanswer"
          rows={4}
          placeholder="把你的回答写在这里（或先在脑子里/嘴上答一遍，再写要点）"
          value={q.answer ?? ''}
          onChange={(e) => updateAnswer(sessionId, idx, { answer: e.target.value })}
        />

        <button
          className="ghost small"
          onClick={() => setShowKey((m) => ({ ...m, [idx]: !m[idx] }))}
        >
          {showKey[idx] ? '收起参考答案' : '答完了，看参考答案对照'}
        </button>
        {showKey[idx] && <div className="answerkey">{q.answerKey}</div>}

        <div className="rate-row">
          <button className="rate real" onClick={() => rate('real')} disabled={!!q.rating && q.rating === 'real'}>
            ✓ 我真懂
          </button>
          <button className="rate fuzzy" onClick={() => rate('fuzzy')} disabled={!!q.rating && q.rating === 'fuzzy'}>
            ~ 有点模糊
          </button>
          <button className="rate ai" onClick={() => rate('ai')} disabled={!!q.rating && q.rating === 'ai'}>
            ✗ 其实是 AI 替懂的
          </button>
        </div>
        {q.rating && <div className="rated-note">已标记：{q.rating === 'real' ? '我真懂' : q.rating === 'fuzzy' ? '有点模糊' : 'AI 替懂的'}</div>}
      </div>

      {allRated && (
        <div className="done-card">
          <div className="done-title">全部答完</div>
          <div className="done-stats">
            <span className="d real">真懂 {stats.real}</span>
            <span className="d fuzzy">模糊 {stats.fuzzy}</span>
            <span className="d ai">AI 替懂 {stats.ai}</span>
          </div>
          <button className="primary" onClick={() => setView({ name: 'map', sessionId })}>
            看我的真懂地图 →
          </button>
          <button
            className="ghost"
            disabled={summaryLoading}
            onClick={handleSummary}
          >
            {summaryLoading ? '生成中…' : session.summary ? '重新生成诊断' : '让 AI 给我一段诊断'}
          </button>
          {summaryErr && <div className="error">{summaryErr}</div>}
          {session.summary && <div className="summary">{session.summary}</div>}
        </div>
      )}
    </div>
  )
}
