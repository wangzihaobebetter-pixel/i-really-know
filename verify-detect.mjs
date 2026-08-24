/**
 * Discipline detection on the briefs' own personas.
 *
 * The task brief §3 names two students and, for one of them, names her exact
 * fear: 林月, a bioinformatics MSc, afraid her supervisor will ask
 * "这里为什么用 DESeq2 不用 edgeR". Pasting that paragraph scored as General,
 * because no pack knew any sequencing vocabulary — so the product's primary
 * persona got generic probes on the one submission the brief was written
 * around. This gate keeps her paragraph, and Marcus's, landing in a real pack.
 *
 * Scored against the shipped pack files rather than a copy of them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PACK_DIR = 'src/packs';
const packs = readdirSync(PACK_DIR)
  .filter((f) => f.endsWith('.ts') && !['index.ts', 'kit.ts'].includes(f))
  .map((f) => {
    const src = readFileSync(join(PACK_DIR, f), 'utf8');
    const id = src.match(/\n  id: '(\w+)'/)?.[1];
    const detect = src.slice(src.indexOf('detect: detect('), src.indexOf('dimensions:'));
    const keywords = [...detect.matchAll(/\['((?:[^'\\]|\\.)*)', (\d)\]/g)]
      .map((m) => ({ term: m[1], weight: Number(m[2]) }));
    return { id, keywords };
  })
  .filter((p) => p.id && p.id !== 'general');

const CASES = [
  {
    who: '林月 · bioinformatics MSc (brief §3)',
    expect: 'bio',
    text: 'We chose DESeq2 over edgeR because our count matrix showed overdispersion that a negative binomial handles. The design formula included batch as a covariate. Genes with an adjusted p-value below 0.05 and an absolute log2 fold change above 1 were called differentially expressed.',
  },
  {
    who: 'Marcus Reid · CS undergraduate (brief §3)',
    expect: 'cs',
    text: 'The LRU cache uses a hashmap plus a doubly linked list so that get and put are both O(1). The list keeps recency order, the map gives direct node access, and eviction removes the tail node. I did not write a test for the capacity-one edge case.',
  },
];

const failures = [];
for (const c of CASES) {
  const lower = c.text.toLowerCase();
  const scores = packs
    .map((p) => ({
      id: p.id,
      raw: p.keywords.reduce((sum, k) => sum + (lower.includes(k.term.toLowerCase()) ? k.weight : 0), 0),
    }))
    .sort((a, b) => b.raw - a.raw);
  const top = scores[0];
  if (top.id !== c.expect || top.raw <= 0) {
    failures.push(`${c.who}: scored as '${top.id}' (${top.raw}), expected '${c.expect}'. Runners-up: ${scores.slice(0, 3).map((s) => `${s.id}=${s.raw}`).join(', ')}`);
  } else {
    console.log(`verify-detect: ${c.who} → ${top.id} (${top.raw}, next ${scores[1].id}=${scores[1].raw})`);
  }
}

if (failures.length) {
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('verify-detect: both personas from the brief land in a real discipline pack ✓');
