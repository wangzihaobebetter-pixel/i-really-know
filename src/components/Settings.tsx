import { useState } from 'react'
import { useStore } from '../store'
import { testConnection } from '../lib/llm'

const PRESETS = [
  { name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { name: 'Moonshot', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'SiliconFlow', base: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' }
]

export default function Settings() {
  const { settings, setSettings, sessions, importSessions } = useStore()
  const [testing, setTesting] = useState(false)
  const [testRes, setTestRes] = useState<string | null>(null)
  const [file, setFile] = useState<string | null>(null)

  const runTest = async () => {
    setTesting(true)
    setTestRes(null)
    try {
      const t = await testConnection(settings)
      setTestRes('✓ 连通成功，模型回复：' + t)
    } catch (e) {
      setTestRes('✗ ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setTesting(false)
    }
  }

  const exportData = () => {
    const data = JSON.stringify({ sessions, settings }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ireallyknow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (text: string) => {
    try {
      const j = JSON.parse(text)
      if (Array.isArray(j.sessions)) {
        const n = importSessions(j.sessions)
        alert(`导入完成：新增 ${n} 次检验，重复 ${j.sessions.length - n} 次已跳过。`)
      } else if (Array.isArray(j)) {
        const n = importSessions(j)
        alert(`导入完成：新增 ${n} 次检验。`)
      } else {
        alert('格式不对：没找到 sessions 数组。')
      }
    } catch {
      alert('解析失败：不是有效的 JSON。')
    }
  }

  return (
    <div className="view settings">
      <header className="bar">
        <button className="ghost" onClick={() => setViewHome()}>
          ← 首页
        </button>
        <div className="bar-title">设置</div>
        <div className="progress" />
      </header>

      <div className="card">
        <h2>模型（LLM 生成检验题用）</h2>
        <p className="hint">
          Key 只保存在你自己的浏览器 localStorage 里。请求直接从你的浏览器发往模型服务商，
          不经过任何中转服务器。
        </p>

        <div className="presets">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className={`chip ${settings.apiBase === p.base ? 'on' : ''}`}
              onClick={() => setSettings({ apiBase: p.base, model: p.model })}
            >
              {p.name}
            </button>
          ))}
        </div>

        <label className="field">
          <span>API Base URL</span>
          <input
            value={settings.apiBase}
            onChange={(e) => setSettings({ apiBase: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="field">
          <span>API Key</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings({ apiKey: e.target.value })}
            placeholder="sk-..."
          />
        </label>
        <label className="field">
          <span>模型名</span>
          <input
            value={settings.model}
            onChange={(e) => setSettings({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </label>

        <button className="ghost" disabled={testing} onClick={runTest}>
          {testing ? '测试中…' : '测试连接'}
        </button>
        {testRes && <div className={testRes.startsWith('✓') ? 'ok' : 'error'}>{testRes}</div>}
      </div>

      <div className="card">
        <h2>数据</h2>
        <p className="hint">
          所有数据都存在这个浏览器里（localStorage）。换浏览器/换手机不会自动同步——
          用导出/导入手动搬。
        </p>
        <div className="row">
          <button className="ghost" onClick={exportData}>
            导出全部数据（JSON）
          </button>
          <label className="ghost file-import">
            导入数据
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => setFile(String(reader.result))
                reader.readAsText(f)
              }}
            />
          </label>
        </div>
        {file && (
          <div className="import-confirm">
            <p>已读取文件，确认导入？</p>
            <button className="primary small" onClick={() => importData(file)}>
              确认导入
            </button>
          </div>
        )}
        <p className="hint dim">当前共 {sessions.length} 次检验记录</p>
      </div>
    </div>
  )

  function setViewHome() {
    // 避免循环依赖：直接调用 store
    useStore.getState().setView({ name: 'home' })
  }
}
