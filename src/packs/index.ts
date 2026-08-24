/**
 * Pack registry + local discipline detection (spec §3, §7.3).
 * Detection is entirely client-side and runs before any network call, so the
 * pack is already chosen when the user has no API key at all.
 */
import type { DetectResult, DisciplinePack, PackId, ProbeDimension } from '../types';
import { csPack } from './cs';
import { bioPack } from './bio';
import { medPack, MED_SAFETY_NOTE } from './med';
import { mathPack } from './math';
import { statsPack } from './stats';
import { mlPack } from './ml';
import { chemPack } from './chem';
import { epiPack } from './epi';
import { physPack } from './phys';
import { essayPack } from './essay';
import { generalPack } from './general';

export { MED_SAFETY_NOTE };

/** Display order — the three deepest packs lead (spec §3.3). */
export const PACKS: DisciplinePack[] = [
  csPack, bioPack, medPack, mathPack, statsPack, mlPack,
  chemPack, epiPack, physPack, essayPack, generalPack,
];

const BY_ID = new Map<PackId, DisciplinePack>(PACKS.map((p) => [p.id, p]));

export function getPack(id: PackId | undefined): DisciplinePack {
  return (id && BY_ID.get(id)) || generalPack;
}

const ZH_PACK_NAMES: Record<PackId, string> = {
  cs: '计算机', bio: '生物', med: '医学', math: '数学', stats: '统计', ml: '机器学习',
  chem: '化学', epi: '流行病学', phys: '物理', essay: '议论文', general: '通用',
};

export function packLabel(id: PackId | undefined, lang: 'en' | 'zh-CN'): string {
  const resolved = id ?? 'general';
  return lang === 'zh-CN' ? ZH_PACK_NAMES[resolved] : getPack(resolved).name;
}

/**
 * Short discipline chip. `packLabel` gives the full name; several screens want
 * the short form and were reaching past both of them into
 * `getPack(id).shortName`, which is English-only — so the sample chooser, the
 * tag on a piece of work and the cohort header all showed "Med" / "CS" / "Epi"
 * inside an otherwise Chinese interface. The Chinese table already existed and
 * was simply not being used.
 */
export function packShort(id: PackId | undefined, lang: 'en' | 'zh-CN'): string {
  const resolved = id ?? 'general';
  return lang === 'zh-CN' ? ZH_PACK_NAMES[resolved] : getPack(resolved).shortName;
}

export function dimensionsOf(packId: PackId): ProbeDimension[] {
  return getPack(packId).dimensions;
}

const ZH_DIM_LABELS: Record<string, Record<string, string>> = {
  bio: { mechanism: '对得上尺度的机制', controls: '实验逻辑', data2claim: '从数据到结论', methodchoice: '方法选择', precision: '术语准确度', perturbation: '扰动后的预测', provenance: '具体数字的出处', limits: '认下来的局限' },
  chem: { mechanism: '反应机理', conditions: '试剂与条件选择', quant: '定量数据的出处', characterization: '从表征到结论', practical: '操作与安全考量', perturbation: '扰动', error: '误差分析' },
  cs: { design: '设计理由', alternatives: '被否掉的方案', invariants: '正确性与不变式', edges: '边界与失败行为', complexity: '复杂度与资源', provenance: '具体数字的出处', testing: '测试与验证', change: '需求变更时的应对' },
  epi: { design: '设计选择', bias: '这个设计特有的偏倚', measure: '指标的解读', power: '样本量与检验效能的来源', analysis: '分析方法选择', counterfactual: '反事实', causal: '因果措辞的分寸' },
  essay: { thesis: '用自己的话说论点', evidence: '证据的出处', objection: '最强的反对意见', definition: '概念定义与边界', structure: '结构安排的理由', counterfactual: '反事实', retractable: '可以收回的主张' },
  general: { concept: '用自己的话说概念', method: '方法选择', provenance: '具体数字的出处', counterfactual: '反事实', blindspot: '盲区' },
  math: { justification: '每一步的依据', hypotheses: '前提的必要性', strategy: '证明策略选择', definitions: '定义与边界例子', counterexample: '构造反例', generalize: '推广与特殊化', provenance: '各处取值的来由' },
  med: { ddx: '鉴别诊断推理', findings: '从发现到诊断', patho: '这位病人的病理生理', investigation: '检查的理由', management: '处理方案的依据', risk: '风险与安全', counterfactual: '换一个病人', provenance: '具体数字的出处' },
  ml: { baseline: '模型选择与基线对比', leakage: '流程与数据泄漏', metric: '指标是否合适', hyper: '超参数的来由', diagnosis: '过拟合与失败诊断', shift: '分布变化的反事实', honesty: '评估的诚实度' },
  phys: { model: '模型与理想化选择', governing: '控制方程的来由', limits: '量纲与极限情形', failure: '假设失效', numeric: '数值的出处', perturbation: '扰动', uncertainty: '测量与不确定度' },
  stats: { choice: '检验/模型选择与备选', assumptions: '假设检查', interpretation: '结果解读', handling: '数据处理决定', provenance: '数字的出处', counterfactual: '数据上的反事实', limits: '推断的边界' },
};

/**
 * Dimension labels in the interface language.
 *
 * These render in two places a person actually reads: the 「你通常在哪儿滑倒」
 * list on the 你 tab, and the per-probe heading on the instructor's printed
 * evidence sheet — the document §6.6 expects a professor to forward to a
 * colleague. Both showed "Findings-to-diagnosis" and "Pipeline & leakage"
 * inside otherwise Chinese pages.
 *
 * The English `label` on the pack stays the source of truth for the prompt
 * layer; this table is display only.
 */
export function dimensionLabel(packId: PackId, dimensionId: string, lang: 'en' | 'zh-CN' = 'en'): string {
  if (lang === 'zh-CN') {
    const zh = ZH_DIM_LABELS[packId]?.[dimensionId];
    if (zh) return zh;
  }
  return getPack(packId).dimensions.find((d) => d.id === dimensionId)?.label ?? dimensionId;
}

/* ---------------------------- detection ---------------------------- */

/** Below this, the UI must ask rather than assume (spec §3.3.11). */
export const DETECT_FLOOR = 0.35;

interface Hit { packId: PackId; raw: number }

/**
 * Weighted keyword + regex scoring, normalised so a confident match on a short
 * excerpt does not out-score a long document. Never throws on bad regexes.
 */
export function detectPack(material: string): DetectResult {
  const text = material.slice(0, 20000);
  const lower = text.toLowerCase();
  const hits: Hit[] = [];

  for (const pack of PACKS) {
    if (pack.id === 'general') continue;
    let raw = 0;

    for (const { term, weight } of pack.detect.keywords) {
      const needle = term.toLowerCase();
      let from = 0, count = 0;
      while (count < 4) {
        const at = lower.indexOf(needle, from);
        if (at < 0) break;
        count++;
        from = at + needle.length;
      }
      raw += count * weight;
    }

    for (const { source, weight } of pack.detect.regexes) {
      try {
        const re = new RegExp(source, 'gmi');
        const found = text.match(re);
        if (found) raw += Math.min(found.length, 4) * weight;
      } catch {
        /* a malformed pattern must never break detection */
      }
    }

    for (const lang of pack.detect.codeFenceLangs) {
      if (lower.includes('```' + lang)) raw += 5;
    }

    if (raw > 0) hits.push({ packId: pack.id, raw });
  }

  if (!hits.length) return { packId: 'general', confidence: 0, alternates: [] };

  hits.sort((a, b) => b.raw - a.raw);
  const total = hits.reduce((a, h) => a + h.raw, 0);
  const top = hits[0];

  // Confidence blends share-of-evidence with absolute evidence, so a single
  // stray keyword cannot produce a confident answer.
  const share = top.raw / total;
  const strength = Math.min(1, top.raw / 18);
  const confidence = Math.round(share * strength * 100) / 100;

  const alternates = hits.slice(1, 4).map((h) => ({
    packId: h.packId,
    confidence: Math.round((h.raw / total) * strength * 100) / 100,
  }));

  if (confidence < DETECT_FLOOR) {
    return { packId: 'general', confidence, alternates: [{ packId: top.packId, confidence }, ...alternates].slice(0, 3) };
  }
  return { packId: top.packId, confidence, alternates };
}

/** Difficulty mix → an ordered list of probe kinds of the requested length. */
export function planKinds(packId: PackId, difficulty: 'foundations' | 'standard' | 'defense', count: number) {
  const pack = getPack(packId);
  const mix = pack.probeKinds.mix[difficulty] ?? {};
  const entries = Object.entries(mix) as [keyof typeof mix, number][];
  const plan: string[] = [];
  for (const [kind, pct] of entries) {
    const n = Math.max(1, Math.round(((pct ?? 0) / 100) * count));
    for (let i = 0; i < n; i++) plan.push(kind as string);
  }
  while (plan.length > count) plan.pop();
  while (plan.length < count) plan.push(entries[plan.length % entries.length]?.[0] as string ?? 'concept');
  return plan;
}
