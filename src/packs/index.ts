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

export function dimensionsOf(packId: PackId): ProbeDimension[] {
  return getPack(packId).dimensions;
}

export function dimensionLabel(packId: PackId, dimensionId: string): string {
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
