/**
 * A minimal OpenAI-compatible provider, for testing the keyed path without
 * anyone's real API key. It answers /chat/completions, identifies which of the
 * five calls it is from the prompt, and returns schema-valid JSON.
 *
 * It also ASSERTS the request shape, so this doubles as a contract test on the
 * client: auth header, model, temperature, and the material delimiters.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 4188);
const seen = [];

/**
 * Fault injection, driven by the model name so a test can ask for a specific
 * failure without a side channel:
 *   fault-401        → always 401 (rejected key)
 *   fault-429-once   → 429 on the first call, then normal (backoff path)
 *   fault-badjson    → prose instead of JSON on the first call (repair path)
 */
const faultState = new Map();
let lastGenerateUser = '';

function classify(system, user) {
  if (/repair malformed JSON/i.test(system)) return 'REPAIR';
  if (/Reply with the single word/i.test(system)) return 'PING';
  if (/scoring ONE answer/i.test(system)) return 'SCORE';
  if (/closing summary/i.test(system)) return 'DIAGNOSE';
  if (/ONE retraining probe/i.test(system)) return 'VARIANT';
  if (/summarising a whole cohort/i.test(system)) return 'AGGREGATE';
  if (/OUTPUT — a single JSON object/.test(user) && /"probes"/.test(user)) return 'GENERATE';
  return 'UNKNOWN';
}

/** Pull real substrings out of the material so anchors actually place. */
function anchorsFrom(user, n) {
  const m = user.match(/<<<MATERIAL\n([\s\S]*?)\nMATERIAL>>>/);
  const text = m ? m[1] : '';
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 45 && !l.startsWith('#'));
  const out = [];
  for (let i = 0; i < n; i++) out.push((lines[i % Math.max(1, lines.length)] || text.slice(0, 60)).slice(0, 150));
  return out;
}

const DIMS = ['design', 'invariants', 'complexity', 'edges', 'testing', 'provenance'];

function body(kind, user) {
  switch (kind) {
    case 'PING': return 'ok';
    // A real repair call returns the same content, corrected. Reuse the last
    // GENERATE input so the anchors still refer to the student's material.
    case 'REPAIR': return body('GENERATE', lastGenerateUser);
    case 'GENERATE': {
      const count = Number(user.match(/produce exactly (\d+) probes/)?.[1] || 6);
      const quotes = anchorsFrom(user, count + 1);
      return JSON.stringify({
        materialLanguage: 'en',
        detectedDiscipline: { packId: 'cs', confidence: 0.82 },
        probes: quotes.slice(0, count).map((q, i) => ({
          dimensionId: DIMS[i % DIMS.length],
          concept: `Mock course concept ${i + 1}`,
          kind: ['concept', 'method', 'provenance', 'counterfactual', 'blindspot', 'alternative'][i % 6],
          anchor: { quote: q },
          question: `Mock probe ${i + 1}: justify this choice against the obvious alternative.`,
          whyThisProbe: 'A decision is understood when its alternative and trade-off can be named.',
          reference: {
            keyPoints: ['Names the alternative', 'Gives the cost on this input', 'Knows when it flips'],
            ownedLooksLike: 'Names the alternative and its concrete cost here.',
            surfaceLooksLike: 'Says it is the standard approach.',
          },
          timerSec: 90,
          difficulty: 'standard',
        })),
        fragilities: [{ anchor: { quote: quotes[count] || quotes[0] }, note: 'Stated as settled without a supporting number.' }],
      });
    }
    case 'SCORE': {
      // Vary the score so divergence classes (including illusion) actually occur.
      const n = seen.filter((s) => s.kind === 'SCORE').length;
      const score = [0, 3, 1, 2, 3, 1][n % 6];
      return JSON.stringify({
        score,
        verdictLine: score >= 2 ? 'You gave the mechanism and the alternative.' : 'You restated the submission without a mechanism.',
        evidence: {
          present: score >= 2 ? ['named the alternative', 'gave a concrete cost'] : ['restated the choice'],
          missing: score >= 2 ? [] : ['the alternative it beats', 'the input size where it matters'],
        },
        parroting: score <= 1,
        confidence: 'high',
        examinerFollowUp: score <= 1 ? 'Which input size would make the difference visible?' : undefined,
      });
    }
    case 'DIAGNOSE':
      return JSON.stringify({
        headline: 'You own the data-structure choice; the complexity claim is borrowed.',
        owned: ['Why a doubly linked list is required'],
        borrowed: ['Where each term of the bound is paid'],
        illusions: [{ probeId: 'x', line: 'You rated the invariant Owned and could not trace it.' }],
        nextActions: ['Re-derive the bound line by line', 'Trace the invariant on a 3-node cycle', 'Write the test that distinguishes recency'],
      });
    case 'VARIANT':
      return JSON.stringify({
        dimensionId: 'invariants', kind: 'counterfactual',
        concept: 'Update-order invariant',
        anchor: { quote: 'reused' },
        question: 'Mock variant: same target, different angle — move the update and trace it.',
        whyThisProbe: 'The prior answer described the code; this angle asks for a concrete trace.',
        reference: { keyPoints: ['Traces concretely'], ownedLooksLike: 'Walks a tiny input.', surfaceLooksLike: 'Describes the code.' },
        timerSec: 120, difficulty: 'standard',
      });
    case 'AGGREGATE':
      return JSON.stringify({
        classWeakDimensions: [{ dimensionId: 'complexity', share: 0.71 }],
        commonFragilities: [{ theme: 'unpaid complexity claims', submissionIds: [] }],
        suggestedInClassProbes: ['Where is each term of your bound paid?'],
        perSubmissionFlags: {},
      });
    default:
      return JSON.stringify({ note: 'unknown call' });
  }
}

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__reset') {
    seen.length = 0;
    faultState.clear();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end('{"ok":true}');
  }
  if (req.method === 'GET' && req.url === '/__seen') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(seen, null, 2));
  }
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw); } catch { /* recorded below as a violation */ }
    const system = payload.messages?.[0]?.content ?? '';
    const user = payload.messages?.[1]?.content ?? '';
    const kind = classify(system, user);
    if (kind === 'GENERATE') lastGenerateUser = user;

    const violations = [];
    if (!/^Bearer .+/.test(req.headers.authorization || '')) violations.push('missing bearer token');
    if (!payload.model) violations.push('no model field');
    if (typeof payload.temperature !== 'number') violations.push('no temperature');
    if (payload.messages?.length !== 2) violations.push('expected exactly system+user messages');
    if (kind === 'UNKNOWN') violations.push('unrecognised call shape');
    if (['GENERATE', 'SCORE'].includes(kind) && !/<<<MATERIAL[\s\S]*MATERIAL>>>/.test(user)) {
      violations.push('material not delimited as untrusted');
    }
    if (kind === 'GENERATE' && !/NEVER help complete/.test(system)) violations.push('invariants missing from system prompt');
    seen.push({ kind, model: payload.model, temperature: payload.temperature, violations });

    const model = String(payload.model || '');
    const nth = (faultState.get(model) || 0) + 1;
    faultState.set(model, nth);

    if (model.includes('fault-401')) {
      res.writeHead(401, { 'Content-Type': 'application/json', ...cors });
      return res.end(JSON.stringify({ error: { message: 'Invalid API key' } }));
    }
    if (model.includes('fault-score-500') && kind === 'SCORE') {
      res.writeHead(500, { 'Content-Type': 'application/json', ...cors });
      return res.end(JSON.stringify({ error: { message: 'Score unavailable' } }));
    }
    if (model.includes('fault-429-once') && nth === 1) {
      res.writeHead(429, { 'Content-Type': 'application/json', ...cors });
      return res.end(JSON.stringify({ error: { message: 'Rate limited' } }));
    }

    let content = body(kind, user);
    if (model.includes('fault-badjson') && kind !== 'REPAIR' && nth === 1) {
      content = 'Sure! Here is the JSON you asked for:\n\nOops, actually I forgot to include it.';
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({
      id: 'mock', object: 'chat.completion', model: payload.model,
      choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }));
  });
});

server.listen(PORT, () => console.log(`mock provider on http://localhost:${PORT}/v1`));
