/**
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

if (!checked) {
  console.error('verify-samples: parsed 0 anchors — the parser is out of date.');
  process.exit(1);
}
if (failures.length) {
  console.error(`verify-samples: ${failures.length} of ${checked} anchors FAILED\n`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log(`verify-samples: all ${checked} anchors are verbatim substrings ✓`);
