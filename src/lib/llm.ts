// LLM 调用层：OpenAI 兼容 API，零后端，key 只存在用户浏览器 localStorage
import type { Question, Settings } from '../types'

export class ApiError extends Error {
  status?: number
  constructor(msg: string, status?: number) {
    super(msg)
    this.status = status
  }
}

export async function chat(
  settings: Settings,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { maxTokens?: number; temperature?: number; json?: boolean } = {}
): Promise<string> {
  if (!settings.apiKey.trim()) throw new ApiError('还没有填 API Key，去设置页填一下')
  const url = settings.apiBase.replace(/\/+$/, '') + '/chat/completions'
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 4000,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {})
      })
    })
  } catch (e) {
    throw new ApiError('网络请求失败：' + (e instanceof Error ? e.message : String(e)))
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let detail = ''
    try {
      const j = JSON.parse(body)
      detail = j?.error?.message || j?.message || body.slice(0, 300)
    } catch {
      detail = body.slice(0, 300)
    }
    if (res.status === 401) throw new ApiError('API Key 无效（401），去设置页检查', 401)
    if (res.status === 429) throw new ApiError('请求太频繁或额度用完（429）：' + detail, 429)
    throw new ApiError(`API 报错 ${res.status}：${detail}`, res.status)
  }
  const j = await res.json()
  const text = j?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new ApiError('API 返回格式异常：没有 content')
  return text
}

/** 从 LLM 输出里安全地抠出 JSON（容忍 markdown 代码围栏） */
export function extractJson(text: string): unknown {
  const t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fence ? fence[1] : t
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new ApiError('模型输出里没有找到 JSON')
  return JSON.parse(candidate.slice(start, end + 1))
}

// ---- 提示词（产品灵魂：生成"只有真懂才答得上"的检验题）----

export const SYSTEM_PROMPT = `你是一位严格的学习检验官。用户会提交一份学习材料（作业、报告、代码、笔记等）。

你的任务不是帮用户完成作业，而是检验用户是否真正理解了自己提交的材料。

生成检验题时必须遵守：
1. 题目必须针对这份材料的具体内容——引用它真实出现过的概念、方法、数字、结论。
2. 绝不能问"从材料里直接抄就能答上"的问题。要问的是：
   - 概念解释：用自己的话讲清楚材料里的核心概念，以及它和相近概念的边界；
   - 方法选择：为什么选这个方法而不是另一个？什么条件下该换方法？
   - 细节追问：材料里某个关键数字/结论是怎么来的？依据是什么？
   - 反事实：如果某个前提变了，结论会怎么变？
   - 盲点探测：材料里最经不起追问的地方在哪？
3. 题目要像口试老师那样层层追问，让"AI 代写但本人不懂"的人当场露馅。
4. 每道题给出答案要点 answerKey（简短，供答完对照），以及考察点 point（一句话）。
5. 如果材料是代码，追问设计选择、边界条件、复杂度、为什么不用别的写法。
6. 如果材料太短或无法判断，就基于它真实包含的内容出题，不要编造材料里没有的考点。

输出必须是 JSON 对象，格式：
{"questions":[{"type":"概念解释|方法选择|细节追问|反事实|盲点探测","point":"一句话考察点","question":"完整题目","answerKey":"答案要点"}]}
不要输出 JSON 以外的任何内容。`

export interface GeneratedQuestion {
  type: string
  point: string
  question: string
  answerKey: string
}

export async function generateQuestions(
  settings: Settings,
  material: string
): Promise<GeneratedQuestion[]> {
  const difficultyHint =
    settings.difficulty === 'basic'
      ? '难度偏基础：先检验概念是否清楚。'
      : settings.difficulty === 'spicy'
        ? '难度刁钻：专门挑材料里最经不起追问的地方，层层逼问。'
        : '难度标准：概念、方法、细节、反事实搭配。'
  const text = await chat(
    settings,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `请根据下面这份材料，生成 ${settings.count} 道检验题。${difficultyHint}\n\n材料如下（材料结束）：\n\n${material.slice(0, 30000)}`
      }
    ],
    { json: true, maxTokens: 4000, temperature: 0.7 }
  )
  const j = extractJson(text) as { questions?: GeneratedQuestion[] }
  const qs = Array.isArray(j?.questions) ? j.questions : []
  if (qs.length === 0) throw new ApiError('模型没有生成题目，换个模型或重试一次')
  return qs.slice(0, settings.count).map((q, i) => ({
    type: q.type || '概念解释',
    point: q.point || '未标注',
    question: q.question || '(空题)',
    answerKey: q.answerKey || '（无答案要点）',
    ...(i === 0 ? {} : {})
  }))
}

export async function generateSummary(
  settings: Settings,
  material: string,
  questions: Question[]
): Promise<string> {
  const answered = questions
    .map(
      (q, i) =>
        `${i + 1}. [考察点] ${q.point}\n[题目] ${q.text}\n[我的回答] ${q.answer || '（没答）'}\n[自评] ${q.rating === 'real' ? '我真懂' : q.rating === 'fuzzy' ? '有点模糊' : 'AI 替懂的/没懂'}\n[参考答案要点] ${q.answerKey}`
    )
    .join('\n\n')
  const text = await chat(
    settings,
    [
      {
        role: 'system',
        content:
          '你是一位学习诊断师。基于用户的学习材料和自评结果，写一段简短、具体、不客气的诊断：哪些是真懂了，哪些其实是 AI 替懂的（重点），下一步该补什么。用中文，200 字以内，直接给结论不要客套。'
      },
      {
        role: 'user',
        content: `材料开头 500 字：\n${material.slice(0, 500)}\n\n答题与自评记录：\n${answered}`
      }
    ],
    { maxTokens: 800, temperature: 0.4 }
  )
  return text.trim()
}

export async function testConnection(settings: Settings): Promise<string> {
  const t = await chat(
    settings,
    [{ role: 'user', content: '只回复两个字：连通' }],
    { maxTokens: 10, temperature: 0 }
  )
  return t.trim()
}
