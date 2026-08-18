// 我真会 · I Really Know — 核心类型

/** 自评三档：真懂 / 有点模糊 / 其实是 AI 替懂的 */
export type Rating = 'real' | 'fuzzy' | 'ai'

export interface Question {
  id: string
  /** 题目文本 */
  text: string
  /** 考察点（如：梯度下降原理 / 为什么选线性回归） */
  point: string
  /** 题型：概念解释 / 方法选择 / 细节追问 / 反事实 / 盲点探测 */
  type: string
  /** 参考答案要点（答完才展开，用来对照） */
  answerKey: string
  /** 用户输入的回答 */
  answer?: string
  /** 自评 */
  rating?: Rating
}

export interface Session {
  id: string
  /** 用户给材料起的名字，如 "ML 作业2" */
  title: string
  material: string
  createdAt: number
  questions: Question[]
  /** 可选：LLM 生成的针对性总结 */
  summary?: string
  model: string
}

export interface Settings {
  /** OpenAI 兼容 base URL，如 https://api.openai.com/v1 或 https://api.deepseek.com/v1 */
  apiBase: string
  apiKey: string
  model: string
  /** 每次生成的题数 */
  count: number
  /** 难度：基础 / 标准 / 刁钻 */
  difficulty: 'basic' | 'standard' | 'spicy'
}

export type View =
  | { name: 'home' }
  | { name: 'quiz'; sessionId: string }
  | { name: 'map'; sessionId: string }
  | { name: 'history' }
  | { name: 'session'; sessionId: string }
  | { name: 'settings' }

export const DEFAULT_SETTINGS: Settings = {
  apiBase: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  count: 8,
  difficulty: 'standard'
}
