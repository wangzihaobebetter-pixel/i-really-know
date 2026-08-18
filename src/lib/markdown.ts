/**
 * Markdown → display text WITH a source→display offset map.
 * P3 §4.1, and the fix for defect 2 of P3 §0.
 *
 * v2 rendered the Painted Page with `white-space: pre-wrap` over the raw
 * source, so the product's evidence artifact — the thing meant to be shown to
 * a professor in an appeal — displayed `**Course:** CS 621` and `## 1. Problem
 * statement`, literal asterisks and hashes included.
 *
 * P3 named two ways out and chose the cheap one ON PURPOSE:
 *
 *   - Full path: render markdown to semantic HTML, then map character offsets
 *     from the source onto the rendered DOM. Correct, and the hardest single
 *     engineering task in P4 — offset mapping across a transform is exactly
 *     where anchored-span products break.
 *   - Taken here: strip the syntax characters for display while maintaining a
 *     source→display offset map, and carry the semantic role of the stripped
 *     token (heading, list item, quote, emphasis) alongside. ~90% of the visual
 *     win at a fraction of the risk.
 *
 * COST, stated rather than discovered later: tables, images and nested lists
 * flatten to plain text. Reference-style links keep their label and lose their
 * target. Setext headings (`===` underlines) are not detected. Full rendering
 * is deferred past P4.
 *
 * The offset map is the load-bearing part. Every probe anchor is a character
 * range into the ORIGINAL submission, and it has to keep pointing at the same
 * words after the syntax is gone — otherwise the highlights silently drift and
 * the evidence sheet quotes the wrong sentence.
 */

export type BlockKind = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'quote' | 'code' | 'hr';
export type InlineKind = 'strong' | 'em' | 'code';

export interface MdBlock {
  kind: BlockKind;
  /** Display-text offsets. */
  start: number;
  end: number;
  /** Nesting depth for list items, 0 for everything else. */
  depth: number;
}

export interface MdInline {
  kind: InlineKind;
  start: number;
  end: number;
}

export interface Stripped {
  /** What the reader sees. Syntax characters removed. */
  text: string;
  blocks: MdBlock[];
  inlines: MdInline[];
  /** srcOf[displayIndex] = index of that character in the original source. */
  srcOf: number[];
}

class Builder {
  out = '';
  srcOf: number[] = [];
  push(source: string, from: number, to: number): void {
    for (let i = from; i < to; i++) {
      this.out += source[i];
      this.srcOf.push(i);
    }
  }
  get len(): number { return this.out.length; }
}

/** True when the material should be shown byte-for-byte: code is not prose. */
export const isVerbatimKind = (kind: string): boolean => kind === 'code';

const RE_FENCE = /^\s{0,3}(```|~~~)/;
const RE_HEADING = /^(\s{0,3})(#{1,6})\s+/;
const RE_QUOTE = /^(\s{0,3})>\s?/;
const RE_BULLET = /^(\s*)([-*+])\s+/;
const RE_ORDERED = /^(\s*)(\d{1,3}[.)])\s+/;
const RE_HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;

export function stripMarkdown(source: string): Stripped {
  const b = new Builder();
  const blocks: MdBlock[] = [];
  const inlines: MdInline[] = [];

  // Line offsets into the source, keeping the newline positions exact.
  const lines: { text: string; start: number }[] = [];
  let cursor = 0;
  for (const raw of source.split('\n')) {
    lines.push({ text: raw, start: cursor });
    cursor += raw.length + 1;
  }

  let inFence = false;
  let fenceStartDisplay = 0;

  for (let li = 0; li < lines.length; li++) {
    const { text: line, start } = lines[li];

    /* ---- fenced code: contents pass through verbatim, fences disappear ---- */
    if (RE_FENCE.test(line)) {
      if (!inFence) { inFence = true; fenceStartDisplay = b.len; } else {
        inFence = false;
        if (b.len > fenceStartDisplay) {
          blocks.push({ kind: 'code', start: fenceStartDisplay, end: b.len, depth: 0 });
        }
      }
      continue;                       // the fence line itself is never displayed
    }
    if (inFence) {
      b.push(source, start, start + line.length);
      newline(b, source, start + line.length, li, lines.length);
      continue;
    }

    /* ---- horizontal rule: no text of its own ---- */
    if (RE_HR.test(line) && line.trim().length) {
      blocks.push({ kind: 'hr', start: b.len, end: b.len, depth: 0 });
      continue;
    }

    /* ---- blank line ---- */
    if (!line.trim()) {
      newline(b, source, start, li, lines.length);
      continue;
    }

    let offset = 0;             // how far into `line` the content starts
    let kind: BlockKind = 'p';
    let depth = 0;

    const q = RE_QUOTE.exec(line);
    if (q) { offset += q[0].length; kind = 'quote'; }

    const rest = line.slice(offset);
    const h = RE_HEADING.exec(rest);
    if (h) {
      offset += h[0].length;
      kind = h[2].length === 1 ? 'h1' : h[2].length === 2 ? 'h2' : 'h3';
    } else {
      const bullet = RE_BULLET.exec(rest) ?? RE_ORDERED.exec(rest);
      if (bullet) {
        offset += bullet[0].length;
        if (kind !== 'quote') kind = 'li';
        depth = Math.min(3, Math.floor(bullet[1].length / 2));
      }
    }

    const blockStart = b.len;
    emitInline(b, source, start + offset, start + line.length, inlines);
    if (b.len > blockStart) blocks.push({ kind, start: blockStart, end: b.len, depth });
    newline(b, source, start + line.length, li, lines.length);
  }

  if (inFence && b.len > fenceStartDisplay) {
    blocks.push({ kind: 'code', start: fenceStartDisplay, end: b.len, depth: 0 });
  }

  return { text: b.out, blocks, inlines, srcOf: b.srcOf };
}

/** Consume the newline character so the map keeps counting the source exactly. */
function newline(b: Builder, source: string, at: number, li: number, total: number): void {
  if (li < total - 1) b.push(source, at, at + 1);
}

/**
 * Inline pass over one line's content range.
 * Handles `**strong**`, `*em*`, `` `code` `` and `[label](target)`.
 *
 * `_underscore_` emphasis is deliberately NOT handled: this product's material
 * is full of snake_case identifiers and LaTeX subscripts, and treating `_` as
 * emphasis mangles more real submissions than it prettifies.
 */
function emitInline(
  b: Builder, source: string, from: number, to: number, inlines: MdInline[],
): void {
  let i = from;
  while (i < to) {
    const ch = source[i];

    if (ch === '\\' && i + 1 < to) {           // escaped punctuation
      b.push(source, i + 1, i + 2);
      i += 2;
      continue;
    }

    if (ch === '*') {
      const strong = source.startsWith('**', i);
      const token = strong ? '**' : '*';
      const close = source.indexOf(token, i + token.length);
      if (close >= 0 && close < to && close > i + token.length) {
        const s = b.len;
        emitInline(b, source, i + token.length, close, inlines);
        inlines.push({ kind: strong ? 'strong' : 'em', start: s, end: b.len });
        i = close + token.length;
        continue;
      }
    }

    if (ch === '`') {
      const close = source.indexOf('`', i + 1);
      if (close >= 0 && close < to) {
        const s = b.len;
        b.push(source, i + 1, close);
        inlines.push({ kind: 'code', start: s, end: b.len });
        i = close + 1;
        continue;
      }
    }

    if (ch === '[') {
      const closeLabel = source.indexOf(']', i + 1);
      if (closeLabel > 0 && closeLabel < to && source[closeLabel + 1] === '(') {
        const closeTarget = source.indexOf(')', closeLabel + 2);
        if (closeTarget > 0 && closeTarget < to) {
          emitInline(b, source, i + 1, closeLabel, inlines);   // keep the label
          i = closeTarget + 1;                                  // drop the target
          continue;
        }
      }
    }

    b.push(source, i, i + 1);
    i++;
  }
}

/**
 * Map a source character range onto the display string.
 *
 * `srcOf` is non-decreasing, so both ends are a binary search. Returns null
 * when the span survived stripping only as syntax — a probe anchored purely to
 * `##` would land nowhere, and a silently-zero-width highlight is worse than
 * an honestly absent one (the Painted Page lists unplaced anchors in the
 * margin instead).
 */
export function mapSpan(
  srcOf: number[], srcStart: number, srcEnd: number,
): { start: number; end: number } | null {
  if (!srcOf.length || srcEnd <= srcStart) return null;
  const start = lowerBound(srcOf, srcStart);
  const end = lowerBound(srcOf, srcEnd);
  if (end <= start) return null;
  return { start, end };
}

/** First index whose value is >= target; srcOf.length when there is none. */
function lowerBound(arr: number[], target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
