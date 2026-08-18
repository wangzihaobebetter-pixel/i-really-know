/**
 * Sample integrity check — anchors AND provenance.
 *
 * F8 is the reason v3 exists at all: v2's eight samples were written by an LLM
 * to be examinable, with no real student work behind them, and the build was
 * rejected for it. A sample without a source URL is a fabricated sample, so
 * this gate fails the build on one — the check that would have caught v2.
 *
 * Original note follows.
 *
 * Anchor integrity check. Every sample probe quotes a verbatim span of its
 * own material; if that drifts, the Painted Page silently loses highlights.
 * Parses the TS sources textually so it needs no build step.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DEFS = ['src/samples/defs-a.ts', 'src/samples/defs-b.ts'];
const MATERIAL_DIR = 'src/samples/material';

const materials = Object.fromEntries(
  readdirSync(MATERIAL_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => [f, readFileSync(join(MATERIAL_DIR, f), 'utf8')]),
);

let checked = 0;
const failures = [];

for (const defFile of DEFS) {
  const src = readFileSync(defFile, 'utf8');
  // Split per sample object: `material: xMaterial` names the import, and the
  // import line maps that identifier to a markdown file.
  const imports = [...src.matchAll(/import\s+(\w+)\s+from\s+'\.\/material\/([\w.-]+)\?raw'/g)];
  const identToFile = Object.fromEntries(imports.map((m) => [m[1], m[2]]));

  const blocks = src.split(/export const \w+Sample: SampleDef = \{/).slice(1);
  for (const block of blocks) {
    const ident = block.match(/material:\s*(\w+)/)?.[1];
    const file = ident ? identToFile[ident] : undefined;
    if (!file || !materials[file]) {
      failures.push(`${defFile}: could not resolve material for ${ident}`);
      continue;
    }
    const text = materials[file];
    for (const m of block.matchAll(/^\s*quote:\s*'((?:[^'\\]|\\.)*)',?$/gm)) {
      const quote = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      checked++;
      if (!text.includes(quote)) failures.push(`${file}: anchor not found → ${quote.slice(0, 80)}`);
    }
  }
}

/* ---- provenance ---- */

const REQUIRED_SOURCE_FIELDS = ['url', 'corpus', 'who', 'markers', 'terms', 'originalLength'];
let samplesSeen = 0;

for (const defFile of DEFS) {
  const src = readFileSync(defFile, 'utf8');
  const blocks = src.split(/export const (\w+)Sample: SampleDef = \{/).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const name = blocks[i];
    const body = blocks[i + 1] ?? '';
    samplesSeen++;

    const source = body.match(/source:\s*\{([\s\S]*?)\n  \},/);
    if (!source) {
      failures.push(`${name}: has no source block — a sample with no provenance is a fabricated sample`);
      continue;
    }
    for (const field of REQUIRED_SOURCE_FIELDS) {
      const m = source[1].match(new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
      if (!m || !m[1].trim()) failures.push(`${name}: source.${field} is missing or empty`);
    }
    const url = source[1].match(/url:\s*'([^']*)'/)?.[1] ?? '';
    if (!/^https?:\/\/\S+$/.test(url)) {
      failures.push(`${name}: source.url is not a fetchable URL (${JSON.stringify(url)})`);
    }
  }
}

if (samplesSeen < 4) failures.push(`only ${samplesSeen} samples parsed — the parser is out of date`);

/* The corpus found no genuine student chemistry report (research file 01 §7.1:
   the best candidate was an instructor template bylined "Joe Student"). The
   gap is stated on every build rather than filled with invention. */
console.log('verify-samples: NOTE — no chemistry sample ships. research/ireallyknow/01 §7.1 found');
console.log('  no genuine student-submitted chemistry lab report; the gap is stated, not fabricated.');

if (!checked) {
  console.error('verify-samples: parsed 0 anchors — the parser is out of date.');
  process.exit(1);
}
if (failures.length) {
  console.error(`verify-samples: ${failures.length} of ${checked} anchors FAILED\n`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log(`verify-samples: all ${checked} anchors are verbatim substrings, and all ${samplesSeen} samples carry a source URL ✓`);
