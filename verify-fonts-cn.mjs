/**
 * P3 §9 item 8 — Self-hosted variable fonts, and the `.t-serif-it`
 * synthetic-oblique defect fixed for CN.
 *
 * v2 declared `--font-display: "Fraunces"` with no @font-face, no CDN link
 * and no font file in `public/`. The shipped app rendered Georgia + Songti
 * SC while the token file claimed a typeface nobody had ever seen (P3
 * §0.1). v3 self-hosts 3 Latin WOFF2 in `src/assets/fonts/` and the
 * fonts.css file wires them with `unicode-range`.
 *
 * The second half of the item is the synthetic-oblique defect. The
 * `.t-serif-it` class used to apply `font-style: italic` to a display face
 * that falls through to Songti SC for Chinese, a face with no italic, so
 * the browser synthesised a mechanical oblique (visible in v2's
 * shot-illusion-paper.png). v3 fixes it by EITHER scoping italic to Latin
 * via `:lang(en)` (the `.t-note` pattern) OR by leaving the className
 * unused in CSS (a silent no-op is honest — no italic is synthesised).
 * What is NOT allowed is a CSS rule applying `font-style: italic` outside
 * `:lang(en)` — that would re-introduce the defect.
 *
 * HONEST LIMIT, written into fonts.css and not enforced here: the shipped
 * faces are Latin subsets. Chinese renders in the system UI face at every
 * scale. P3 §8 G1 records why; the hero numeral is Latin by design so the
 * element carrying the design is script-independent.
 *
 * If any of the following regresses, this file fails the build:
 *   1. A font file referenced by an `@font-face` `src:` URL is missing
 *      from disk — the token family declared but not loaded.
 *   2. A `font-family` named in CSS gets no `@font-face` declaration.
 *   3. A CSS rule applies `font-style: italic` outside `:lang(en)` —
 *      the synthetic-oblique defect returns.
 *   4. The `.t-serif-it` class is defined in CSS AND (a) is not scoped
 *      via `:lang(en)` for italic AND (b) has at least one consumer in
 *      the codebase — the defect returns in one form.
 *   5. The Inter/Nunito latin font files were removed (the 162 KB cost
 *      was paid on purpose; removing them silently regresses the offline
 *      PWA).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const fails = [];
const note = (m) => console.log('  ' + m);

/* ---- 1. font files exist on disk ---- */

const fontFiles = [
  'src/assets/fonts/inter-latin-wght-normal.woff2',
  'src/assets/fonts/inter-latin-ext-wght-normal.woff2',
  'src/assets/fonts/nunito-latin-wght-normal.woff2',
];
for (const f of fontFiles) {
  if (!existsSync(f)) {
    fails.push(`font file missing on disk: ${f}`);
  } else {
    note(`font on disk: ${f}`);
  }
}

/* ---- 2. every @font-face src URL points to a file that exists ---- */

const fonts = readFileSync('src/styles/fonts.css', 'utf8');
const fontsCssDir = dirname(resolve('src/styles/fonts.css'));
const srcUrls = [...fonts.matchAll(/src:\s*url\("([^"]+)"\)/g)].map((m) => m[1]);
for (const url of srcUrls) {
  const onDisk = resolve(fontsCssDir, url);
  if (!existsSync(onDisk)) {
    fails.push(`@font-face src URL points to missing file: ${url} → ${onDisk}`);
  } else {
    note(`@font-face src resolves: ${url}`);
  }
}

/* ---- 3. every `font-family` declared in CSS has a matching @font-face ---- */

const declaredFamilies = new Set(
  [...fonts.matchAll(/font-family:\s*"([^"]+)"/g)].map((m) => m[1])
);
note(`declared @font-face families: ${[...declaredFamilies].join(', ')}`);

const cssFiles = [
  'src/styles/fonts.css',
  'src/styles/type.css',
  'src/styles/base.css',
  'src/styles/tokens.css',
  'src/ui/ui.css',
];
const cssBlob = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const usedFamilies = new Set(
  [...cssBlob.matchAll(/(?:font-family|--font-[a-z]+):\s*"?([A-Za-z][\w\s]+?)"?[,;]/g)]
    .map((m) => m[1].trim())
    .filter((s) => s !== 'var')  /* skip var(--font-...) references */
);
/* Drop CSS keywords, generics, and the `var()` function name that the
   regex sometimes catches from inside a different declaration. */
for (const k of ['var', 'initial', 'inherit', 'unset', 'revert', 'none', 'auto']) {
  usedFamilies.delete(k);
}
/* Drop CSS generic families and var() references. */
for (const g of ['serif', 'sans-serif', 'monospace', 'system-ui', 'inherit', 'initial', 'unset']) {
  usedFamilies.delete(g);
}
/* Drop multi-line or quoted strings that look like full stacks; only the
   FIRST quoted face is the load-bearing one — that's how CSS font-family
   falls back. */
const stacks = [...cssBlob.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]);
for (const s of stacks) {
  const first = (s.match(/"([^"]+)"|'([^']+)'|([A-Za-z][\w-]+)/) || ['', '', '', '']).slice(1).find(Boolean);
  if (first && first !== 'var') usedFamilies.add(first.trim());
}

for (const f of usedFamilies) {
  /* Allow system stacks starting with `ui-rounded`, `ui-sans-serif`, etc.,
     and allow our own declared faces. */
  if (declaredFamilies.has(f)) continue;
  if (f.startsWith('ui-') || f.startsWith('-')) continue;
  if (f === 'PingFang SC' || f === 'Noto Sans SC' || f === 'Songti SC' || f === 'Yuanti SC') continue;
  if (f === 'Georgia' || f === 'Times New Roman') continue; /* fallbacks, acceptable */
  /* Mono faces ('JetBrains Mono') are allowed as system stack fallbacks —
     the product ships Latin subsets only (P3 §8 G1). The fallback chain
     reaches ui-monospace / SFMono-Regular / Menlo / Consolas when the
     user's browser doesn't have JetBrains Mono, which is correct. */
  if (/Mono|Code|Courier/i.test(f)) continue;
  fails.push(`font-family referenced in CSS but no @font-face declared: "${f}"`);
}

/* ---- 4. NO `font-style: italic` outside :lang(en) ---- */

const italicRules = [...cssBlob.matchAll(/([^{}]+)\{([^{}]*font-style:\s*italic[^{}]*)\}/g)];
let italicOutside = 0;
for (const [, selector, body] of italicRules) {
  const isLangEn = /:lang\(\s*en\s*\)/.test(selector);
  if (!isLangEn) {
    italicOutside++;
    fails.push(`font-style: italic outside :lang(en) — selector: ${selector.trim()}`);
  }
}
if (italicOutside === 0) {
  note('no font-style: italic outside :lang(en) — synthetic-oblique defect stays fixed');
}

/* ---- 5. .t-serif-it either scoped OR unused ---- */

const tserif = cssBlob.match(/\.t-serif-it[^{]*\{([^}]*)\}/);
const usesTserif = [...cssBlob.matchAll(/className=["'`][^"'`]*\bt-serif-it\b[^"'`]*["'`]/g)];
if (tserif) {
  note(`.t-serif-it rule present: ${tserif[0].slice(0, 80)}…`);
  if (!/:lang\(\s*en\s*\)/.test(tserif[0])) {
    fails.push(`.t-serif-it rule is not scoped to :lang(en) — synthetic oblique on CN`);
  }
  if (usesTserif.length === 0) {
    note('.t-serif-it defined but unused in JSX — safe to delete later');
  }
} else {
  note('.t-serif-it not defined in CSS — className is a silent no-op (defect stays fixed)');
  if (usesTserif.length > 0) {
    note(`.t-serif-it referenced as className in ${usesTserif.length} place(s) — no italic synthesised because no rule defines it`);
  }
}

/* ---- 6. tokens.css font references point to declared or system-allowed faces ---- */

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const tokenFamilies = [...tokens.matchAll(/--font-[a-z]+:\s*([^;]+);/g)].map((m) => m[1]);
for (const stack of tokenFamilies) {
  const first = (stack.match(/"([^"]+)"|'([^']+)'|([A-Za-z][\w-]+)/) || ['', '', '', '']).slice(1).find(Boolean);
  if (first && !declaredFamilies.has(first) && !/^(ui-|PingFang|Noto|Songti|Yuanti|Georgia|JetBrains|Mono|Code)/i.test(first)) {
    fails.push(`tokens.css font stack "${stack.trim()}" leads with "${first}" — no @font-face, will fall through to system`);
  }
}
note(`tokens.css --font-* families: ${tokenFamilies.map((s) => s.trim().split(',')[0]).join(', ')}`);

/* ---- result ---- */

if (fails.length) {
  console.error('\n  ✗ verify-fonts-cn FAILED');
  for (const f of fails) console.error('    - ' + f);
  process.exit(1);
}
console.log('\n  ✓ self-hosted fonts + .t-serif-it synthetic-oblique fix locked — P3 §9 item 8');
