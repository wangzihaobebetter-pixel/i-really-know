import type { ProviderId, RunPreset, Difficulty } from '../types';

export interface ProviderPreset {
  id: ProviderId; label: string; apiBase: string; model: string; note?: string;
}

/** Spec §7.1 — defaults only; every field stays user-editable. */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'openai',      label: 'OpenAI',      apiBase: 'https://api.openai.com/v1',    model: 'gpt-4o-mini' },
  { id: 'deepseek',    label: 'DeepSeek',    apiBase: 'https://api.deepseek.com/v1',  model: 'deepseek-chat' },
  { id: 'openrouter',  label: 'OpenRouter',  apiBase: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { id: 'moonshot',    label: 'Moonshot',    apiBase: 'https://api.moonshot.cn/v1',   model: 'kimi-k2-0711-preview' },
  { id: 'siliconflow', label: 'SiliconFlow', apiBase: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'custom',      label: 'Custom',      apiBase: '',                              model: '' },
];

export const PRESET_COUNTS: Record<RunPreset, 4 | 6 | 7> = { quick: 4, standard: 6, defense: 7 };
export const PRESET_MINUTES: Record<RunPreset, number> = { quick: 3, standard: 6, defense: 12 };
export const PRESET_DIFFICULTY: Record<RunPreset, Difficulty> = {
  quick: 'foundations', standard: 'standard', defense: 'defense',
};
