import { useState } from 'react'
import { useStore } from '../store'
import { generateQuestions } from '../lib/llm'

export default function Home() {
  const { settings, setView, createSession, setGenerating, generating, genError, setSettings } =
    useStore()
  const [title, setTitle] = useState('')
  const [material, setMaterial] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const canGenerate = material.trim().length >= 20

  const handleGenerate = async () => {
    if (!canGenerate || generating) return
    setErr(null)
    setGenerating(true, null)
    try {
      const qs = await generateQuestions(settings, material.trim())
      if (!qs.length) throw new Error('没有生成题目')
      const session = createSession(
        title || material.trim().slice(0, 40),
        material.trim(),
        qs.map((q, i) => ({ id: `${Date.now()}_${i}`, text: q.question, point: q.point, type: q.type, answerKey: q.answerKey })),
        settings.model
      )
      setMaterial('')
      setTitle('')
      setView({ name: 'quiz', sessionId: session.id })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="view home">
      <header className="hero">
        <h1>我真会</h1>
        <p className="tagline">I Really Know — 检验你是真懂，还是 AI 替你懂了</p>
        <p className="principle">
          它不帮你做。它根据你交的这份东西，生成一场只有你真懂才答得上来的检验。
        </p>
      </header>

      <div className="card">
        <label className="field">
          <span>给这份材料起个名字（可选）</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：ML 作业 2、统计期末报告"
            maxLength={60}
          />
        </label>

        <label className="field">
          <span>
            粘贴你的材料 <em>（作业 / 报告 / 代码 / 笔记，至少 20 字）</em>
          </span>
          <textarea
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder={'把你要被检验的内容贴进来。\n\n可以是：\n· 你交的作业全文\n· 一段代码\n· 你的报告/论文\n· 课堂笔记'}
            rows={8}
          />
          <div className={`field-meta ${material.trim().length < 20 && material.length > 0 ? 'warn' : ''}`}>
            {material.length.toLocaleString()} / 20 字
          </div>
        </label>

        <div className="row">
          <label className="field slim">
            <span>题数</span>
            <select
              value={settings.count}
              onChange={(e) => setSettings({ count: Number(e.target.value) })}
            >
              {[4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} 题
                </option>
              ))}
            </select>
          </label>
          <label className="field slim">
            <span>难度</span>
            <select
              value={settings.difficulty}
              onChange={(e) =>
                setSettings({ difficulty: e.target.value as 'basic' | 'standard' | 'spicy' })
              }
            >
              <option value="basic">基础</option>
              <option value="standard">标准</option>
              <option value="spicy">刁钻</option>
            </select>
          </label>
        </div>
        <p className="hint dim">
          难度说明：基础=先查概念清不清楚 · 标准=概念方法细节反事实 · 刁钻=专挑经不起追问的地方
        </p>

        {(err || genError) && <div className="error">{(err || genError) as string}</div>}

        <button
          className="primary"
          disabled={!canGenerate || generating}
          onClick={handleGenerate}
        >
          {generating ? '正在出题…' : `生成 ${settings.count} 道检验题`}
        </button>
        {!settings.apiKey && (
          <p className="hint">
            还没配置 API Key —— <a onClick={() => setView({ name: 'settings' })}>去设置</a>
            （Key 只存在你自己的浏览器里，不上传任何服务器）
          </p>
        )}
      </div>
    </div>
  )
}
