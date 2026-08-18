import React from 'react';
import type { DivergenceDirection, Score, Verdict } from '../types';
import { translate } from '../i18n';

/* Axis-A marks (P3 §2.2). Hand-drawn strokes, not emoji, not an icon font.
   The palette is deliberately isoluminant between state pairs — `over`/
   `undefended` differ by 1.01:1 — so in greyscale these states are IDENTICAL.
   That is a feature (no state looks visually heavier than another: "never
   accuse" enforced in luminance) but it makes these glyphs and the underline
   styles LOAD-BEARING rather than decorative. Never ship a state as colour alone. */

const STROKE = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.9,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

export function MarkGlyph({ verdict, size = 16 }: { verdict: Verdict; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true } as const;
  switch (verdict) {
    /* defended — the examiner's tick */
    case 'defended':
      return <svg {...p}><path d="M2.5 8.8 L6.2 12.4 L13.6 3.6" {...STROKE} /></svg>;
    /* partial — a wavering line: held some of it */
    case 'partial':
      return <svg {...p}><path d="M2.2 9.4 C4.4 6.2, 6.2 12.2, 8.2 8.6 C10 5.4, 11.8 10.8, 13.8 7.4" {...STROKE} /></svg>;
    /* could not defend — an OPEN circle, not a cross. A cross is a mark of
       wrongness; this state is "not shown yet", which is not the same thing
       and must not be drawn as if it were (P3 §2.2). */
    case 'undefended':
      return <svg {...p}><circle cx="8" cy="8" r="5.2" {...STROKE} strokeDasharray="1.5 2.2" /></svg>;
    /* underclaimed — an upward caret: you own more than you said */
    case 'underclaimed':
      return <svg {...p}><path d="M3.2 10.6 L8 5.2 L12.8 10.6" {...STROKE} /><path d="M8 5.6 L8 12.4" {...STROKE} strokeWidth={1.5} /></svg>;
    default:
      return <svg {...p}><path d="M3 8 L13 8" {...STROKE} strokeDasharray="2 2.4" /></svg>;
  }
}

const VERDICT_CLASS: Record<Verdict, string> = {
  defended: 'ink-defended',
  partial: 'ink-partial',
  undefended: 'ink-undefended',
  underclaimed: 'ink-underclaimed',
  none: 'ink-3',
};

export interface MarkProps { verdict: Verdict; showWord?: boolean; size?: number; className?: string }

export function Mark({ verdict, showWord = true, size = 16, className = '' }: MarkProps) {
  return (
    <span className={`mark ${VERDICT_CLASS[verdict]} ${className}`}>
      <MarkGlyph verdict={verdict} size={size} />
      {showWord && <span className="t-small">{translate(`common.verdict.${verdict}`)}</span>}
    </span>
  );
}

/**
 * Axis-B direction arrow (P3 §3.2). The redundant cue that survives greyscale
 * and colour-blindness — it is why the sign was kept as a sign and not folded
 * into a magnitude.
 */
export function DirectionArrow({ direction, size = 20 }: { direction: DivergenceDirection; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  if (direction === 'under') {
    return <svg {...p}><path d="M12 20 L12 5 M5 11.5 L12 4.5 L19 11.5" {...STROKE} strokeWidth={2.4} /></svg>;
  }
  if (direction === 'over') {
    return <svg {...p}><path d="M12 4 L12 19 M5 12.5 L12 19.5 L19 12.5" {...STROKE} strokeWidth={2.4} /></svg>;
  }
  /* accurate — a filled dot, no direction to point in */
  return <svg {...p}><circle cx="12" cy="12" r="4.5" fill="currentColor" /></svg>;
}

export const DIRECTION_CLASS: Record<DivergenceDirection, string> = {
  over: 'ink-over', under: 'ink-under', accurate: 'ink-2', unknown: 'ink-3',
};

export type TagTone =
  | 'neutral' | 'action' | 'defended' | 'partial' | 'undefended' | 'underclaimed' | 'over' | 'under';

export function Tag({ tone = 'neutral', mono, children, className = '' }: {
  tone?: TagTone; mono?: boolean; children: React.ReactNode; className?: string;
}) {
  return <span className={`tag tag-${tone}${mono ? ' tag-mono' : ''} ${className}`}>{children}</span>;
}

export interface ScorePipProps { score: Score | null | undefined; label?: string; className?: string }

/** 0–3 drawn as four rising strokes; the count is the meaning, colour is secondary. */
export function ScorePip({ score, label, className = '' }: ScorePipProps) {
  const heights = [6, 9, 12, 15];
  const tone = score === null || score === undefined ? 'ink-3'
    : score >= 2 ? 'ink-defended' : score === 1 ? 'ink-partial' : 'ink-undefended';
  return (
    <span className={`row ${className}`} style={{ gap: 'var(--space-3)' }}>
      <span className={`pips ${tone}`} role="img" aria-label={label ?? `Score ${score ?? '—'} of 3`}>
        {heights.map((h, i) => (
          <span key={i} className={`pip${score !== null && score !== undefined && i < score ? ' pip-on' : ''}`} style={{ height: h }} />
        ))}
      </span>
      <span className="t-mono t-num ink-2" style={{ fontSize: '.8125rem' }}>{score ?? '—'}/3</span>
    </span>
  );
}
