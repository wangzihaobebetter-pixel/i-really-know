import React, { useMemo } from 'react';
import type { Verdict } from '../types';
import { stripMarkdown, mapSpan, type MdBlock, type MdInline } from '../lib/markdown';

export interface TextAnchor { id: string; start: number; end: number; verdict: Verdict }

/**
 * The Painted Page (P3 §4). The student's own material, marked span by span
 * with what they could and could not defend.
 *
 * Two things changed from v2, both of them defects P3 §0 verified in the
 * shipped source:
 *
 *  1. Markdown is STRIPPED FOR DISPLAY with a source→display offset map, so
 *     the evidence artifact no longer shows `**Course:**` and `## 1.` to a
 *     professor. Anchors are remapped through that same map, so the highlights
 *     stay attached to the same words.
 *  2. The mark is an UNDERLINE, not a highlight. v2 painted a 14%-alpha wash
 *     AND a 2px underline at once, which reads as a text editor's selection
 *     rather than a mark made by a person — and the wash was painted as a
 *     background-image, which is why the contrast gate could never see it.
 *     The wash now returns only on the focused span, as a pre-composited
 *     opaque value the gate can measure.
 *
 * The boundary rule from P3 §1 is absolute here: nothing translucent, animated
 * or tinted is ever placed OVER the student's text.
 */
export function AnchoredText({
  text, mode = 'prose', anchors, onAnchorClick, staggered, activeId,
}: {
  text: string;
  mode?: 'code' | 'prose';
  anchors: TextAnchor[];
  onAnchorClick?: (id: string) => void;
  /** Ink the spans probed this session in document order. Capped at 8 (P3 §4.3). */
  staggered?: boolean;
  activeId?: string;
}) {
  const model = useMemo(() => {
    /* Code is shown byte-for-byte: stripping markdown out of a source file
       would delete the student's actual characters. */
    if (mode === 'code') {
      return {
        display: text,
        blocks: [{ kind: 'code' as const, start: 0, end: text.length, depth: 0 }],
        inlines: [] as MdInline[],
        placed: clip(anchors, text.length),
      };
    }
    const s = stripMarkdown(text);
    const placed: TextAnchor[] = [];
    for (const a of anchors) {
      const span = mapSpan(s.srcOf, a.start, a.end);
      if (span) placed.push({ ...a, start: span.start, end: span.end });
    }
    return { display: s.text, blocks: s.blocks, inlines: s.inlines, placed: clip(placed, s.text.length) };
  }, [text, mode, anchors]);

  let inkOrder = 0;

  return (
    <div className={`anchored anchored-${mode}`}>
      {model.blocks.map((block, bi) => (
        <Block
          key={`${block.kind}${bi}_${block.start}`}
          block={block}
          display={model.display}
          inlines={model.inlines}
          anchors={model.placed}
          activeId={activeId}
          onAnchorClick={onAnchorClick}
          staggered={staggered}
          nextInkIndex={() => inkOrder++}
        />
      ))}
    </div>
  );
}

function clip(anchors: TextAnchor[], length: number): TextAnchor[] {
  const sorted = [...anchors]
    .filter((a) => a.start >= 0 && a.end > a.start && a.end <= length)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  /* Overlaps are resolved by keeping the earliest, longest span — two marks
     over the same words would render as one unreadable smear. */
  const clean: TextAnchor[] = [];
  let cursor = 0;
  for (const a of sorted) {
    if (a.start < cursor) continue;
    clean.push(a);
    cursor = a.end;
  }
  return clean;
}

const TAG: Record<MdBlock['kind'], keyof JSX.IntrinsicElements> = {
  h1: 'h2', h2: 'h3', h3: 'h4', p: 'p', li: 'li', quote: 'blockquote', code: 'pre', hr: 'hr',
};

function Block({
  block, display, inlines, anchors, activeId, onAnchorClick, staggered, nextInkIndex,
}: {
  block: MdBlock;
  display: string;
  inlines: MdInline[];
  anchors: TextAnchor[];
  activeId?: string;
  onAnchorClick?: (id: string) => void;
  staggered?: boolean;
  nextInkIndex: () => number;
}) {
  const Tag = TAG[block.kind];
  if (block.kind === 'hr') return <hr className="anchored-rule" />;

  const inside = anchors.filter((a) => a.end > block.start && a.start < block.end);
  const nodes: React.ReactNode[] = [];
  let pos = block.start;

  for (const a of inside) {
    const from = Math.max(a.start, block.start);
    const to = Math.min(a.end, block.end);
    if (from > pos) nodes.push(...inlineNodes(display, inlines, pos, from, `p${pos}`));

    /* P3 §4.3: only the spans probed this session animate, sequentially,
       capped at 8. Past that they appear already inked — a 12-span page
       otherwise costs the reader five seconds of watching. */
    const order = staggered ? nextInkIndex() : -1;
    const animate = staggered && order < 8;

    nodes.push(
      <mark
        key={`${a.id}_${from}`}
        className={`anchor-span anchor-${a.verdict}${animate ? ' m-ink-wipe' : ''}${activeId === a.id ? ' is-active' : ''}`}
        style={animate ? { animationDelay: `${order * 90}ms` } : undefined}
        data-anchor-id={a.id}
        onClick={onAnchorClick ? () => onAnchorClick(a.id) : undefined}
        role={onAnchorClick ? 'button' : undefined}
        tabIndex={onAnchorClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onAnchorClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onAnchorClick(a.id);
          }
        }}
      >
        {inlineNodes(display, inlines, from, to, a.id)}
      </mark>,
    );
    pos = to;
  }
  if (pos < block.end) nodes.push(...inlineNodes(display, inlines, pos, block.end, `t${pos}`));

  return <Tag className={`md-${block.kind}`} data-depth={block.depth || undefined}>{nodes}</Tag>;
}

const INLINE_TAG: Record<MdInline['kind'], keyof JSX.IntrinsicElements> = {
  strong: 'strong', em: 'em', code: 'code',
};

/** Renders [from, to) applying the outermost emphasis runs that fall inside it. */
function inlineNodes(
  display: string, inlines: MdInline[], from: number, to: number, keyBase: string,
): React.ReactNode[] {
  const runs = inlines
    .filter((m) => m.start >= from && m.end <= to && m.end > m.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: React.ReactNode[] = [];
  let pos = from;
  let lastEnd = -1;
  for (const m of runs) {
    if (m.start < lastEnd) continue;          // nested inside one already emitted
    if (m.start > pos) out.push(display.slice(pos, m.start));
    const Tag = INLINE_TAG[m.kind];
    out.push(<Tag key={`${keyBase}_${m.start}`}>{display.slice(m.start, m.end)}</Tag>);
    pos = m.end;
    lastEnd = m.end;
  }
  if (pos < to) out.push(display.slice(pos, to));
  return out;
}

/**
 * The examiner's remark, in the margin, exactly as a marked script carries it.
 * P3 §4.5 keeps this — it is the one element of v2's paper language doing real
 * work — and fixes one defect: `.t-serif-it` applied `font-style: italic` to a
 * display face that falls through to Songti SC for Chinese, a face with no
 * italic, so the browser synthesised a mechanical oblique. Chinese margin notes
 * are now distinguished by weight, colour and the left rule, never by slant.
 */
export function MarginNote({ tone = 'undefended', anchorId, children }: {
  tone?: Verdict; anchorId?: string; children: React.ReactNode;
}) {
  const cls = tone === 'defended' ? 'ink-defended'
    : tone === 'partial' ? 'ink-partial'
    : tone === 'underclaimed' ? 'ink-underclaimed'
    : tone === 'undefended' ? 'ink-undefended' : 'ink-3';
  return <aside className={`margin-note t-note ${cls}`} data-anchor={anchorId}>{children}</aside>;
}
