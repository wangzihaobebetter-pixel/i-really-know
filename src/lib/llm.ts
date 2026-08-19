/**
 * OpenAI-compatible client (spec §4.1, §4.5). Zero backend: the key lives in
 * the browser and every request goes straight from the user's machine to the
 * provider they chose. Nothing is proxied through us because there is no "us".
 */
import { LlmError } from '../types';
import type {
  AiScore, Diagnosis, Difficulty, PackId, Probe, Session, Settings,
} from '../types';
import { id, now } from './ids';
import {
  buildAggregatePrompt, buildDiagnosePrompt, buildGeneratePrompt,
  buildScorePrompt, buildVariantPrompt,
} from './prompts';
import { getPack } from '../packs';
import { translate } from '../i18n';
import { asScore, placeAnchor } from './analysis';

const JSON_MODE_PROVIDERS = new Set(['openai', 'deepseek', 'moonshot', 'siliconflow', 'openrouter']);
const BACKOFF_MS = [1000, 3000, 8000];

export interface CallOpts {
  signal?: AbortSignal;
  /** Called before each retry so the UI can show a visible countdown (§4.5). */
  onRetry?: (attempt: number, waitMs: number, reason: string) => void;
}

interface ChatArgs {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  json: boolean;
}

function endpoint(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

async function chat(settings: Settings, args: ChatArgs, opts: CallOpts = {}): Promise<string> {
  if (!settings.apiKey.trim()) throw new LlmError('auth', 'No API key set.');
  if (!settings.apiBase.trim()) throw new LlmError('auth', 'No API base URL set.');

  const body: Record<string, unknown> = {
    model: settings.model,
    temperature: args.temperature,
    max_tokens: args.maxTokens,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
  };
  if (args.json && JSON_MODE_PROVIDERS.has(settings.provider)) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  };
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'I Really Know';
  }

  let lastErr: LlmError | undefined;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(endpoint(settings.apiBase), {
        method: 'POST', headers, body: JSON.stringify(body), signal: opts.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new LlmError('auth', 'The provider rejected this API key.', res.status);
      }
      if (res.status === 429 || res.status >= 500) {
        throw new LlmError('rate', `Provider returned ${res.status}.`, res.status);
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new LlmError('network', `Request failed (${res.status}). ${detail.slice(0, 200)}`, res.status);
      }

      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        throw new LlmError('parse', 'The provider returned an empty response.');
      }
      return text;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new LlmError('aborted', 'Cancelled.');
      }
      const e = err instanceof LlmError
        ? err
        : new LlmError('network', err instanceof Error ? err.message : 'Network error.');
      lastErr = e;
      const retryable = e.kind === 'rate' || e.kind === 'network';
      if (!retryable || attempt === BACKOFF_MS.length) throw e;
      const wait = BACKOFF_MS[attempt];
      opts.onRetry?.(attempt + 1, wait, e.message);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr ?? new LlmError('network', 'Request failed.');
}

/* ------------------------------ JSON handling ------------------------------ */

/** Models wrap JSON in prose or fences more often than they should. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through to brace scanning */
  }
  const start = trimmed.search(/[{[]/);
  if (start < 0) throw new LlmError('parse', 'No JSON found in the response.');
  const open = trimmed[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1));
        } catch {
          break;
        }
      }
    }
  }
  throw new LlmError('parse', 'The response was not valid JSON.');
}

/** One repair round-trip before giving up (spec §4.5). */
async function parseOrRepair(settings: Settings, raw: string, opts: CallOpts): Promise<unknown> {
  try {
    return extractJson(raw);
  } catch {
    const repaired = await chat(settings, {
      system: 'You repair malformed JSON. Return only the corrected JSON object. Do not change any content, do not add fields, do not explain.',
      user: raw.slice(0, 12000),
      temperature: 0, maxTokens: 4500, json: true,
    }, opts);
    return extractJson(repaired);
  }
}

/* --------------------------------- calls --------------------------------- */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).map((x) => str(x)).filter(Boolean);

function normaliseProbe(raw: unknown, packId: PackId, difficulty: Difficulty, material: string): Probe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const quote = str((r.anchor as Record<string, unknown>)?.quote);
  const question = str(r.question);
  if (!question) return null;

  const pack = getPack(packId);
  const dimensionId = pack.dimensions.some((d) => d.id === r.dimensionId)
    ? String(r.dimensionId)
    : pack.dimensions[0].id;
  const kind = ['concept', 'method', 'provenance', 'counterfactual', 'blindspot', 'alternative']
    .includes(String(r.kind)) ? (String(r.kind) as Probe['kind']) : 'concept';
  const ref = (r.reference ?? {}) as Record<string, unknown>;

  return {
    id: id('p'),
    dimensionId,
    concept: str(r.concept).trim().slice(0, 80) || undefined,
    kind,
    anchor: placeAnchor(material, { quote, placed: false }),
    question,
    whyThisProbe: str(r.whyThisProbe, 'Tests whether the reasoning behind this choice can be explained.'),
    reference: {
      keyPoints: strList(ref.keyPoints).slice(0, 3),
      ownedLooksLike: str(ref.ownedLooksLike),
      surfaceLooksLike: str(ref.surfaceLooksLike),
    },
    timerSec: typeof r.timerSec === 'number' && r.timerSec > 15 ? Math.round(r.timerSec) : pack.timing[kind],
    difficulty: (['foundations', 'standard', 'defense'].includes(String(r.difficulty))
      ? String(r.difficulty) : difficulty) as Difficulty,
  };
}

export interface GenerateResult {
  probes: Probe[];
  fragilities: { anchor: { quote: string; placed: boolean }; note: string }[];
  materialLanguage?: string;
  detected?: { packId: PackId; confidence: number };
}

export async function generate(
  settings: Settings, session: Session, count: number, difficulty: Difficulty,
  uiLanguage: string, opts: CallOpts = {},
): Promise<GenerateResult> {
  const { system, user } = buildGeneratePrompt(session, count, difficulty, uiLanguage);
  const raw = await chat(settings, { system, user, temperature: 0.7, maxTokens: 4500, json: true }, opts);
  const data = (await parseOrRepair(settings, raw, opts)) as Record<string, unknown>;

  const probes = arr(data.probes)
    .map((p) => normaliseProbe(p, session.packId, difficulty, session.material))
    .filter((p): p is Probe => p !== null);

  if (!probes.length) throw new LlmError('parse', 'The model returned no usable probes.');

  const det = data.detectedDiscipline as Record<string, unknown> | undefined;
  return {
    probes,
    fragilities: arr(data.fragilities).map((f) => {
      const fr = f as Record<string, unknown>;
      const quote = str((fr.anchor as Record<string, unknown>)?.quote);
      return { anchor: placeAnchor(session.material, { quote, placed: false }), note: str(fr.note) };
    }).filter((f) => f.note),
    materialLanguage: str(data.materialLanguage) || undefined,
    detected: det && typeof det.packId === 'string'
      ? { packId: det.packId as PackId, confidence: Number(det.confidence) || 0 }
      : undefined,
  };
}

export async function score(
  settings: Settings, session: Session, probe: Probe, answer: string,
  voice: boolean, opts: CallOpts = {},
): Promise<AiScore> {
  const { system, user } = buildScorePrompt(session, probe, answer, voice);
  const raw = await chat(settings, { system, user, temperature: 0.2, maxTokens: 700, json: true }, opts);
  const d = (await parseOrRepair(settings, raw, opts)) as Record<string, unknown>;
  const ev = (d.evidence ?? {}) as Record<string, unknown>;
  return {
    score: asScore(Number(d.score) || 0),
    verdictLine: str(d.verdictLine, 'Scored.'),
    evidence: { present: strList(ev.present), missing: strList(ev.missing) },
    parroting: Boolean(d.parroting),
    confidence: (['low', 'med', 'high'].includes(String(d.confidence)) ? String(d.confidence) : 'med') as AiScore['confidence'],
    examinerFollowUp: str(d.examinerFollowUp) || undefined,
    model: settings.model,
    at: now(),
  };
}

export async function diagnose(
  settings: Settings, session: Session, uiLanguage: string, opts: CallOpts = {},
): Promise<Diagnosis> {
  const { system, user } = buildDiagnosePrompt(session, uiLanguage);
  const raw = await chat(settings, { system, user, temperature: 0.4, maxTokens: 900, json: true }, opts);
  const d = (await parseOrRepair(settings, raw, opts)) as Record<string, unknown>;
  return {
    headline: str(d.headline, 'Run complete.'),
    owned: strList(d.owned),
    borrowed: strList(d.borrowed),
    illusions: arr(d.illusions).map((x) => {
      const o = x as Record<string, unknown>;
      return { probeId: str(o.probeId), line: str(o.line) };
    }).filter((x) => x.line),
    nextActions: strList(d.nextActions).slice(0, 3),
    model: settings.model,
    at: now(),
  };
}

export async function variant(
  settings: Settings, session: Session, probe: Probe, uiLanguage: string,
  priorQuestions: string[] = [], opts: CallOpts = {},
): Promise<Probe> {
  const { system, user } = buildVariantPrompt(session, probe, uiLanguage, priorQuestions);
  const raw = await chat(settings, { system, user, temperature: 0.8, maxTokens: 900, json: true }, opts);
  const d = await parseOrRepair(settings, raw, opts);
  const next = normaliseProbe(d, session.packId, probe.difficulty, session.material);
  if (!next) throw new LlmError('parse', 'The model did not return a usable probe.');
  return { ...next, dimensionId: probe.dimensionId, anchor: probe.anchor };
}

export async function aggregate(
  settings: Settings, packId: PackId,
  rows: { submissionId: string; label: string; dims: string; fragilities: string }[],
  opts: CallOpts = {},
) {
  const { system, user } = buildAggregatePrompt(packId, rows);
  const raw = await chat(settings, { system, user, temperature: 0.3, maxTokens: 1500, json: true }, opts);
  const d = (await parseOrRepair(settings, raw, opts)) as Record<string, unknown>;
  return {
    classWeakDimensions: arr(d.classWeakDimensions).map((x) => {
      const o = x as Record<string, unknown>;
      return { dimensionId: str(o.dimensionId), share: Number(o.share) || 0 };
    }).filter((x) => x.dimensionId),
    commonFragilities: arr(d.commonFragilities).map((x) => {
      const o = x as Record<string, unknown>;
      return { theme: str(o.theme), submissionIds: strList(o.submissionIds) };
    }).filter((x) => x.theme),
    suggestedInClassProbes: strList(d.suggestedInClassProbes).slice(0, 3),
    perSubmissionFlags: (d.perSubmissionFlags && typeof d.perSubmissionFlags === 'object'
      ? Object.fromEntries(Object.entries(d.perSubmissionFlags as Record<string, unknown>).map(([k, v]) => [k, str(v)]))
      : {}) as Record<string, string>,
    at: now(),
  };
}

/** Settings → Test connection (§4.1). */
export async function ping(settings: Settings, opts: CallOpts = {}): Promise<string> {
  return chat(settings, {
    system: 'Reply with the single word: ok',
    user: 'ping',
    temperature: 0, maxTokens: 8, json: false,
  }, opts);
}

/**
 * User-facing failure text. Goes through i18n like everything else — these are
 * the messages a user is most likely to see, so they must not be the one part
 * of the UI stuck in English.
 */
export function describeError(e: unknown): string {
  if (e instanceof LlmError) {
    switch (e.kind) {
      case 'auth': return translate('common.error.auth');
      case 'rate': return translate('common.error.rate');
      case 'parse': return translate('common.error.parse');
      case 'aborted': return translate('common.error.aborted');
      default: return e.message || translate('common.error.network');
    }
  }
  return e instanceof Error && e.message ? e.message : translate('common.error.network');
}
