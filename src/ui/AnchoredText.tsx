import React, { useMemo } from 'react';
import type { Verdict } from '../types';

export interface TextAnchor { id: string; start: number; end: number; verdict: Verdict }

/**
 * Renders the student's own material with verdict washes drawn over the exact
 * spans that were probed. This is the substrate of the Painted Page (§5.6).
 * Overlapping anchors are resolved by keeping the earliest, longest span.
 */
export function AnchoredText({
  text, mode = 'prose', anchors, onAnchorClick, staggered, activeId,
}: {
  text: string;
  mode?: 'code' | 'prose';
  anchors: TextAnchor[];
  onAnchorClick?: (id: string) => void;
  /** Stagger the ink-wipe by document order (40ms per anchor). */
  staggered?: boolean;
  activeId?: string;
}) {
  const pieces = useMemo(() => {
    const sorted = [...anchors]
      .filter((a) => a.start >= 0 && a.end > a.start && a.end <= text.length)
      .sort((a, b) => a.start - b.start || b.end - a.end);

    const clean: TextAnchor[] = [];
    let cursor = 0;
    for (const a of sorted) {
      if (a.start < cursor) continue;
      clean.push(a);
      cursor = a.end;
    }

    const out: Array<{ key: string; text: string; anchor?: TextAnchor; order: number }> = [];
    let pos = 0, order = 0;
    for (const a of clean) {
      if (a.start > pos) out.push({ key: `t${pos}`, text: text.slice(pos, a.start), order: -1 });
      out.push({ key: a.id, text: text.slice(a.start, a.end), anchor: a, order: order++ });
      pos = a.end;
    }
    if (pos < text.length) out.push({ key: `t${pos}`, text: text.slice(pos), order: -1 });
    return out;
  }, [text, anchors]);

  return (
    <div className={`anchored anchored-${mode}`}>
      {pieces.map((p) =>
        p.anchor ? (
          <mark
            key={p.key}
            className={`anchor-span anchor-${p.anchor.verdict}${staggered ? ' m-ink-wipe' : ''}`}
            style={{
              animationDelay: staggered ? `${p.order * 40}ms` : undefined,
              outline: activeId === p.anchor.id ? '2px solid var(--action)' : undefined,
            }}
            onClick={() => onAnchorClick?.(p.anchor!.id)}
            role={onAnchorClick ? 'button' : undefined}
            tabIndex={onAnchorClick ? 0 : undefined}
            onKeyDown={(e) => { if (onAnchorClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAnchorClick(p.anchor!.id); } }}
          >
            {p.text}
          </mark>
        ) : (
          <span key={p.key}>{p.text}</span>
        ),
      )}
    </div>
  );
}

export function MarginNote({ tone = 'illusion', anchorId, children }: {
  tone?: Verdict; anchorId?: string; children: React.ReactNode;
}) {
  const cls = tone === 'owned' ? 'ink-owned' : tone === 'shaky' ? 'ink-shaky'
    : tone === 'borrowed' ? 'ink-borrowed' : tone === 'illusion' ? 'ink-illusion' : 'ink-3';
  return <aside className={`margin-note ${cls}`} data-anchor={anchorId}>{children}</aside>;
}
