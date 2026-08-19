/** Student share links are untrusted URL input: round-trip, shape and size bounds. */
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
mkdirSync('.tmp-links', { recursive: true });
execSync('npx esbuild src/lib/student-links.ts --bundle --platform=browser --format=esm --outfile=.tmp-links/links.mjs', { stdio: 'pipe' });
globalThis.window = globalThis;
const { encodeStudentTicket, decodeStudentTicket, encodeResultTicket, decodeResultTicket } = await import('./.tmp-links/links.mjs');
const base = {
  v: 2, kind: 'student', cohortId: 'c1', submissionId: 'sub1',
  session: {
    id: 's1', title: 'Methods section', packId: 'general', material: 'A real paragraph with enough material to ask about.', materialKind: 'prose',
    createdAt: Date.now(), status: 'ready', mode: 'class', preset: 'quick', difficulty: 'standard', fragilities: [],
    probes: [{ id: 'p1', dimensionId: 'reason', concept: 'Method choice', kind: 'method', anchor: { quote: 'A real paragraph', placed: false }, question: 'Why this method rather than the alternative?', whyThisProbe: 'The choice carries the claim.', reference: { keyPoints: ['Names the alternative'], ownedLooksLike: 'Names the trade-off.', surfaceLooksLike: 'Repeats the method.' }, timerSec: 90, difficulty: 'standard' }],
  },
};
const failures = [];
const encoded = await encodeStudentTicket(base);
const decoded = await decodeStudentTicket(encoded);
if (decoded.session.title !== base.session.title || decoded.session.probes.length !== 1) failures.push('valid ticket did not round-trip');

async function mustReject(value, label, decoder = decodeStudentTicket) {
  try { await decoder(value); failures.push(`${label} was accepted`); } catch { /* expected */ }
}
const raw = (value) => `j.${Buffer.from(JSON.stringify(value)).toString('base64url')}`;
await mustReject(raw({ ...base, session: { ...base.session, probes: [] } }), 'zero-probe ticket');
await mustReject(raw({ ...base, session: { ...base.session, material: 'x'.repeat(300001) } }), 'oversized material');
await mustReject(`j.${'A'.repeat(500001)}`, 'oversized encoded payload');
try {
  const compressedBomb = await encodeStudentTicket({ ...base, session: { ...base.session, material: 'x'.repeat(350000) } });
  await mustReject(compressedBomb, 'oversized decompressed payload');
} catch { /* encoding may reject before a link is produced */ }
const resultTicket = {
  v: 2, kind: 'result', cohortId: 'c1', submissionId: 'sub1', at: Date.now(),
  probes: [{ id: 'p1', answer: 'My own answer', answerMode: 'text', committedAt: Date.now(), selfGrade: 'shaky', manualScore: 3, divergence: 'undersold' }],
};
const returned = await decodeResultTicket(await encodeResultTicket(resultTicket));
if (returned.probes[0].answer !== 'My own answer') failures.push('valid returned answer did not round-trip');
await mustReject(raw({ ...resultTicket, probes: [{ id: 'p1', selfGrade: 'owned' }] }), 'result without judgement', decodeResultTicket);
await mustReject(raw({ ...resultTicket, probes: [{ id: 'p1', selfGrade: 'owned', manualScore: 3 }] }), 'result without answer metadata', decodeResultTicket);
await mustReject(raw({ ...resultTicket, at: 1e308 }), 'result with invalid completion time', decodeResultTicket);
await mustReject(raw({ ...base, session: { ...base.session, occasionAt: 1e308 } }), 'student link with invalid occasion date');
rmSync('.tmp-links', { recursive: true, force: true });
console.log('verify-student-links: checked valid round-trip plus URL, shape and decompression limits');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-student-links: untrusted link boundary holds ✓');
