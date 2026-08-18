/**
 * The offset map is the load-bearing part of the Painted Page fix.
 *
 * `stripMarkdown` removes syntax characters for display, and every probe
 * anchor is a character range into the ORIGINAL submission. If the map drifts
 * by one character the highlights silently point at the wrong words — and a
 * silently-wrong evidence artifact is worse than a visibly broken one, because
 * it is the thing meant to be shown to a professor in an appeal.
 *
 * This gate proves three properties against the REAL shipped module and the
 * REAL sample corpus:
 *   1. The display text carries no leftover block syntax.
 *   2. The map is monotonic and in range — the invariant every lookup assumes.
 *   3. Every sample anchor, mapped through the map, still selects text that
 *      matches the original quote once its own syntax is stripped.
 */
import { mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

mkdirSync('.tmp-md', { recursive: true });
execSync('npx esbuild src/lib/markdown.ts --format=esm --outfile=.tmp-md/markdown.mjs', { stdio: 'pipe' });
const { stripMarkdown, mapSpan } = await import('./.tmp-md/markdown.mjs');

const failures = [];
let checked = 0;

/* ---- 1 & 2: properties over every sample material plus adversarial cases ---- */

const MATERIAL_DIR = 'src/samples/material';
const corpus = readdirSync(MATERIAL_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => [f, readFileSync(join(MATERIAL_DIR, f), 'utf8')]);

const ADVERSARIAL = [
  ['empty', ''],
  ['only-syntax', '## \n**\n---\n'],
  ['unclosed-bold', 'a **b c'],
  /* C declarations are the reason unclosed asterisks must stay literal. This
     excerpt is materialKind 'code' in the app, so it is never stripped there —
     but prose submissions quote code inline all the time, and eating a
     dereference as emphasis would silently delete the student's characters. */
  ['c-pointer-in-prose', 'The call (char **)malloc(count * sizeof(char)) is wrong.'],
  ['inline-code-is-stripped', 'The call `malloc` is wrong.'],
  ['python-exponent', 'complexity is n ** 2 in the worst case'],
  ['snake_case must survive', 'call get_user_id(x) and set_flag_value(y)'],
  ['nested emphasis', '**bold with `code` inside** tail'],
  ['link', 'see [the paper](https://example.com/a_b_c) for detail'],
  ['fence', '```c\nint *p = malloc(n * sizeof(char));\n```'],
  ['heading then text', '# Title\n\nBody text here.'],
  ['list', '- one\n- two\n  - nested\n'],
  ['escaped star', 'a \\*not emphasis\\* b'],
  ['crlf-ish', 'line one\n\nline two\n'],
];

/* Characters may only be REMOVED by stripping, never added or reordered. */
const LOSSLESS_CASES = new Set(['c-pointer-in-prose', 'python-exponent', 'snake_case must survive']);

for (const [name, text] of [...corpus, ...ADVERSARIAL]) {
  const s = stripMarkdown(text);
  checked++;

  if (s.srcOf.length !== s.text.length) {
    failures.push(`${name}: map length ${s.srcOf.length} != display length ${s.text.length}`);
  }
  for (let i = 1; i < s.srcOf.length; i++) {
    if (s.srcOf[i] < s.srcOf[i - 1]) {
      failures.push(`${name}: map is not monotonic at ${i} (${s.srcOf[i - 1]} -> ${s.srcOf[i]})`);
      break;
    }
  }
  for (let i = 0; i < s.srcOf.length; i++) {
    if (s.srcOf[i] < 0 || s.srcOf[i] >= text.length) {
      failures.push(`${name}: map entry ${i} = ${s.srcOf[i]} is out of range (source length ${text.length})`);
      break;
    }
    /* Every display character must BE the source character it points at. This
       is the strongest statement of correctness available without a parser. */
    if (s.text[i] !== text[s.srcOf[i]]) {
      failures.push(`${name}: display[${i}]=${JSON.stringify(s.text[i])} but source[${s.srcOf[i]}]=${JSON.stringify(text[s.srcOf[i]])}`);
      break;
    }
  }

  if (LOSSLESS_CASES.has(name)) {
    const dropped = text.length - s.text.length;
    if (dropped > 0) {
      failures.push(`${name}: stripping removed ${dropped} character(s) from text that contains no markdown\n      in : ${JSON.stringify(text)}\n      out: ${JSON.stringify(s.text)}`);
    }
  }

  /* No leftover block syntax in what the reader sees. This is the defect:
     v2's Painted Page displayed `**Course:**` and `## 1. Problem statement`. */
  const blockSyntax = s.text.split('\n').filter((l) => /^\s{0,3}#{1,6}\s/.test(l));
  if (blockSyntax.length) {
    failures.push(`${name}: ${blockSyntax.length} heading marker(s) survived into display text: ${JSON.stringify(blockSyntax[0])}`);
  }
  /* A CLOSED bold pair must not survive — that is the shipped defect
     (`**Course:**` on the evidence artifact). An UNCLOSED or unmatched
     asterisk is left literal on purpose: that is what CommonMark does, and it
     is what keeps `char **p` and `n ** 2` intact. */
  if (/\*\*[^*\n]+\*\*/.test(s.text)) {
    failures.push(`${name}: a closed bold pair survived into display text`);
  }
}

/* ---- 3: sample anchors still select their own text after the transform ---- */

const DEFS = ['src/samples/defs-a.ts', 'src/samples/defs-b.ts'];
const materials = Object.fromEntries(corpus);

for (const defFile of DEFS) {
  const src = readFileSync(defFile, 'utf8');
  const identToFile = Object.fromEntries(
    [...src.matchAll(/import\s+(\w+)\s+from\s+'\.\/material\/([\w.-]+)\?raw'/g)].map((m) => [m[1], m[2]]),
  );
  for (const block of src.split(/export const \w+Sample: SampleDef = \{/).slice(1)) {
    const ident = block.match(/material:\s*(\w+)/)?.[1];
    const file = ident ? identToFile[ident] : undefined;
    if (!file || !materials[file]) continue;
    const text = materials[file];
    const stripped = stripMarkdown(text);

    for (const m of block.matchAll(/^\s*quote:\s*'((?:[^'\\]|\\.)*)',?$/gm)) {
      const quote = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      const start = text.indexOf(quote);
      if (start < 0) continue;                     // verify-samples owns that failure
      checked++;

      const span = mapSpan(stripped.srcOf, start, start + quote.length);
      if (!span) {
        failures.push(`${file}: anchor did not survive the transform → ${quote.slice(0, 60)}`);
        continue;
      }
      const selected = stripped.text.slice(span.start, span.end);
      const expected = stripMarkdown(quote).text;
      if (selected.trim() !== expected.trim()) {
        failures.push(
          `${file}: anchor drifted.\n      expected: ${JSON.stringify(expected.slice(0, 70))}\n      selected: ${JSON.stringify(selected.slice(0, 70))}`,
        );
      }
    }
  }
}

rmSync('.tmp-md', { recursive: true, force: true });

console.log(`verify-markdown: ${checked} documents and anchors checked through the real offset map`);
if (failures.length) {
  console.error(`verify-markdown: ${failures.length} FAILURE(S)`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-markdown: syntax is stripped, the map is exact, and every anchor still lands on its own words ✓');
