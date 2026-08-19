import type { AiScore, PackId, Probe, ResultTicket, Session, StudentTicket } from '../types';

const MAX_ENCODED_CHARS = 500_000;
const MAX_COMPRESSED_BYTES = 350_000;
const MAX_DECOMPRESSED_BYTES = 300_000;
const MAX_MATERIAL_CHARS = 50_000;
const PACKS = new Set<PackId>(['bio', 'chem', 'cs', 'epi', 'essay', 'math', 'med', 'ml', 'phys', 'stats', 'general']);
const KINDS = new Set(['concept', 'method', 'provenance', 'counterfactual', 'blindspot', 'alternative']);

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error('This student link is too large.');
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('CompressionStream' in window)) return bytes;
  const stream = new Blob([Uint8Array.from(bytes).buffer]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in window)) throw new Error('This browser cannot open a compressed student link.');
  const stream = new Blob([Uint8Array.from(bytes).buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return readLimited(stream, MAX_DECOMPRESSED_BYTES);
}

function text(value: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(`This student link has an invalid ${label}.`);
  }
  return value;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const MAX_DATE_MS = 8_640_000_000_000_000;
function requiredTimestamp(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_DATE_MS) {
    throw new Error(`This share link has an invalid ${label}.`);
  }
  return value;
}

function cleanProbe(value: unknown, material: string, index: number): Probe {
  if (!value || typeof value !== 'object') throw new Error('This student link has an invalid question.');
  const probe = value as Record<string, unknown>;
  const quote = text((probe.anchor as Record<string, unknown> | undefined)?.quote, 'source span', 5_000);
  if (!material.includes(quote)) throw new Error('A question in this student link is not anchored to the submission.');
  const reference = probe.reference as Record<string, unknown> | undefined;
  const points = reference?.keyPoints;
  if (!Array.isArray(points) || points.length < 1 || points.length > 12) throw new Error('This student link has an invalid answer standard.');
  const keyPoints = points.map((point) => text(point, 'answer standard', 1_000));
  const rawAnchor = probe.anchor as Record<string, unknown>;
  const start = finite(rawAnchor.start, material.indexOf(quote));
  const end = finite(rawAnchor.end, start + quote.length);
  const placed = start >= 0 && end <= material.length && material.slice(start, end) === quote;
  const difficulty = ['foundations', 'standard', 'defense'].includes(String(probe.difficulty))
    ? probe.difficulty as Probe['difficulty'] : 'standard';
  const variant = probe.variant && typeof probe.variant === 'object'
    ? {
        question: text((probe.variant as Record<string, unknown>).question, 'follow-up question', 2_000),
        whyThisProbe: text((probe.variant as Record<string, unknown>).whyThisProbe, 'follow-up reason', 2_000),
      }
    : undefined;
  return {
    id: text(probe.id, 'question id', 128),
    dimensionId: text(probe.dimensionId, 'question category', 128),
    concept: typeof probe.concept === 'string' ? text(probe.concept, 'concept', 200) : undefined,
    kind: KINDS.has(String(probe.kind)) ? probe.kind as Probe['kind'] : 'concept',
    anchor: { quote, placed, start: placed ? start : undefined, end: placed ? end : undefined },
    question: text(probe.question, 'question', 2_000),
    whyThisProbe: text(probe.whyThisProbe, 'question reason', 2_000),
    reference: {
      keyPoints,
      ownedLooksLike: text(reference?.ownedLooksLike, 'answer standard', 2_000),
      surfaceLooksLike: text(reference?.surfaceLooksLike, 'answer standard', 2_000, true),
    },
    timerSec: Math.max(30, Math.min(600, finite(probe.timerSec, 90))),
    difficulty,
    variant,
  };
}

function cleanTicket(value: unknown): StudentTicket {
  if (!value || typeof value !== 'object') throw new Error('This student link is incomplete.');
  const ticket = value as Record<string, unknown>;
  if (ticket.v !== 2 || ticket.kind !== 'student') throw new Error('This student link is not recognised.');
  const cohortId = text(ticket.cohortId, 'class id', 200);
  const submissionId = text(ticket.submissionId, 'submission id', 200);
  if (!ticket.session || typeof ticket.session !== 'object') throw new Error('This student link is incomplete.');
  const incoming = ticket.session as Record<string, unknown>;
  const material = text(incoming.material, 'submission', MAX_MATERIAL_CHARS);
  if (!Array.isArray(incoming.probes) || incoming.probes.length < 1 || incoming.probes.length > 7) {
    throw new Error('This student link must contain between 1 and 7 questions.');
  }
  const packId = PACKS.has(incoming.packId as PackId) ? incoming.packId as PackId : 'general';
  const materialKind = ['code', 'prose', 'mixed'].includes(String(incoming.materialKind))
    ? incoming.materialKind as Session['materialKind'] : 'prose';
  const preset = ['quick', 'standard', 'defense'].includes(String(incoming.preset))
    ? incoming.preset as Session['preset'] : 'standard';
  const difficulty = ['foundations', 'standard', 'defense'].includes(String(incoming.difficulty))
    ? incoming.difficulty as Session['difficulty'] : 'standard';
  const session: Session = {
    id: text(incoming.id, 'session id', 200),
    title: text(incoming.title, 'title', 200),
    packId,
    material,
    materialKind,
    createdAt: typeof incoming.createdAt === 'number' ? requiredTimestamp(incoming.createdAt, 'creation time') : Date.now(),
    status: 'ready',
    mode: 'class',
    preset,
    difficulty,
    probes: incoming.probes.map((probe, index) => cleanProbe(probe, material, index)),
    fragilities: [],
    cohortId,
    submissionId,
    occasion: typeof incoming.occasion === 'string' ? text(incoming.occasion, 'occasion', 200) : undefined,
    occasionAt: typeof incoming.occasionAt === 'number' ? requiredTimestamp(incoming.occasionAt, 'occasion date') : undefined,
  };
  return { v: 2, kind: 'student', cohortId, submissionId, session };
}

function cleanAi(value: unknown): AiScore | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') throw new Error('This result link has an invalid model verdict.');
  const ai = value as Record<string, unknown>;
  const score = finite(ai.score, -1);
  if (![0, 1, 2, 3].includes(score)) throw new Error('This result link has an invalid model verdict.');
  const evidence = ai.evidence as Record<string, unknown> | undefined;
  const cleanEvidence = (part: unknown) => {
    if (!Array.isArray(part) || part.length > 12) throw new Error('This result link has invalid evidence.');
    return part.map((item) => text(item, 'evidence', 1_000));
  };
  return {
    score: score as AiScore['score'],
    verdictLine: text(ai.verdictLine, 'verdict', 2_000),
    evidence: {
      present: cleanEvidence(evidence?.present),
      missing: cleanEvidence(evidence?.missing),
    },
    parroting: Boolean(ai.parroting),
    confidence: ['low', 'med', 'high'].includes(String(ai.confidence)) ? ai.confidence as AiScore['confidence'] : 'med',
    examinerFollowUp: typeof ai.examinerFollowUp === 'string' ? text(ai.examinerFollowUp, 'follow-up', 2_000) : undefined,
    model: text(ai.model, 'model', 200),
    at: typeof ai.at === 'number' ? requiredTimestamp(ai.at, 'model verdict time') : Date.now(),
  };
}

function cleanResultTicket(value: unknown): ResultTicket {
  if (!value || typeof value !== 'object') throw new Error('This result link is incomplete.');
  const ticket = value as Record<string, unknown>;
  if (ticket.v !== 2 || ticket.kind !== 'result') throw new Error('This result link is not recognised.');
  const cohortId = text(ticket.cohortId, 'class id', 200);
  const submissionId = text(ticket.submissionId, 'submission id', 200);
  if (!Array.isArray(ticket.probes) || ticket.probes.length < 1 || ticket.probes.length > 7) {
    throw new Error('This result link must contain between 1 and 7 answers.');
  }
  const probes = ticket.probes.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('This result link has an invalid answer.');
    const probe = value as Record<string, unknown>;
    const selfGrade = ['owned', 'shaky', 'notmine'].includes(String(probe.selfGrade))
      ? probe.selfGrade as Probe['selfGrade'] : undefined;
    if (!selfGrade) throw new Error('This result link is missing the student’s first self-read.');
    const manualScore = typeof probe.manualScore === 'number' && [0, 1, 2, 3].includes(probe.manualScore)
      ? probe.manualScore as Probe['manualScore'] : undefined;
    const ai = cleanAi(probe.ai);
    if (manualScore === undefined && !ai) throw new Error('This result link is missing an answer judgement.');
    const divergence = ['illusion', 'undersold', 'owned', 'borrowed', 'halfheld', 'unscored'].includes(String(probe.divergence))
      ? probe.divergence as Probe['divergence'] : undefined;
    const answerMode = ['text', 'voice'].includes(String(probe.answerMode)) ? probe.answerMode as NonNullable<Probe['answerMode']> : undefined;
    if (!answerMode) {
      throw new Error('This result link is missing answer metadata.');
    }
    const committedAt = requiredTimestamp(probe.committedAt, 'answer time');
    return {
      id: text(probe.id, 'question id', 128),
      answer: text(probe.answer, 'answer', 20_000),
      answerMode,
      committedAt,
      selfGrade,
      manualScore,
      ai,
      divergence,
    };
  });
  const at = requiredTimestamp(ticket.at, 'completion time');
  return { v: 2, kind: 'result', cohortId, submissionId, probes, at };
}

async function encodePayload(value: unknown): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(value));
  if (raw.byteLength > MAX_DECOMPRESSED_BYTES) throw new Error('This share link is too large.');
  const compressed = await gzip(raw);
  const usedCompression = compressed.length < raw.length;
  const encoded = `${usedCompression ? 'g' : 'j'}.${base64Url(usedCompression ? compressed : raw)}`;
  if (encoded.length > MAX_ENCODED_CHARS) throw new Error('This share link is too large.');
  return encoded;
}

async function decodePayload(encoded: string): Promise<unknown> {
  if (encoded.length > MAX_ENCODED_CHARS) throw new Error('This share link is too large.');
  const [mode, payload] = encoded.split('.', 2);
  if (!payload || !['g', 'j'].includes(mode)) throw new Error('This share link is not recognised.');
  const bytes = fromBase64Url(payload);
  if (bytes.byteLength > MAX_COMPRESSED_BYTES) throw new Error('This share link is too large.');
  const raw = mode === 'g' ? await gunzip(bytes) : bytes;
  if (raw.byteLength > MAX_DECOMPRESSED_BYTES) throw new Error('This share link is too large.');
  return JSON.parse(new TextDecoder().decode(raw));
}

export function createStudentTicket(ticket: StudentTicket): StudentTicket {
  return cleanTicket(ticket);
}

export async function encodeStudentTicket(ticket: StudentTicket): Promise<string> {
  return encodePayload(cleanTicket(ticket));
}

export async function decodeStudentTicket(encoded: string): Promise<StudentTicket> {
  return cleanTicket(await decodePayload(encoded));
}

export async function encodeResultTicket(ticket: ResultTicket): Promise<string> {
  return encodePayload(cleanResultTicket(ticket));
}

export async function decodeResultTicket(encoded: string): Promise<ResultTicket> {
  return cleanResultTicket(await decodePayload(encoded));
}

export async function studentLink(ticket: StudentTicket): Promise<string> {
  const encoded = await encodeStudentTicket(ticket);
  return `${window.location.href.split('#')[0]}#/join/${encodeURIComponent(encoded)}`;
}

export async function resultLink(ticket: ResultTicket): Promise<string> {
  const encoded = await encodeResultTicket(ticket);
  return `${window.location.href.split('#')[0]}#/return/${encodeURIComponent(encoded)}`;
}
