import React from 'react';
import type { Score, Verdict } from '../types';
import { translate } from '../i18n';

/* Bespoke pen marks — hand-drawn strokes, not emoji, not icon-font glyphs.
   Verdicts are never color-only: every mark carries a glyph AND a word. */

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function MarkGlyph({ verdict, size = 16 }: { verdict: Verdict; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true } as const;
  switch (verdict) {
    case 'owned':    return <svg {...p}><path d="M2.5 8.8 L6.2 12.4 L13.6 3.6" {...STROKE} /></svg>;
    case 'shaky':    return <svg {...p}><path d="M2.2 9.4 C4.4 6.2, 6.2 12.2, 8.2 8.6 C10 5.4, 11.8 10.8, 13.8 7.4" {...STROKE} /></svg>;
    case 'borrowed': return <svg {...p}><path d="M3.4 3.4 L12.6 12.6 M12.6 3.4 L3.4 12.6" {...STROKE} /></svg>;
    case 'illusion': return <svg {...p}><path d="M8 2.6 L8 9.4" {...STROKE} /><path d="M8 12.6 L8 13" {...STROKE} strokeWidth={2.4} /></svg>;
    default:         return <svg {...p}><path d="M3 8 L13 8" {...STROKE} strokeDasharray="2 2.4" /></svg>;
  }
}

const VERDICT_CLASS: Record<Verdict, string> = {
  owned: 'ink-owned', shaky: 'ink-shaky', borrowed: 'ink-borrowed', illusion: 'ink-illusion', none: 'ink-3',
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

export interface ScorePipProps { score: Score | null | undefined; label?: string; className?: string }

/** 0–3 drawn as four rising strokes; the count is the meaning, color is secondary. */
export function ScorePip({ score, label, className = '' }: ScorePipProps) {
  const heights = [6, 9, 12, 15];
  const tone = score === null || score === undefined ? 'ink-3'
    : score >= 2 ? 'ink-owned' : score === 1 ? 'ink-shaky' : 'ink-borrowed';
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

export type TagTone = 'neutral' | 'action' | 'owned' | 'shaky' | 'borrowed' | 'illusion';

export function Tag({ tone = 'neutral', mono, children, className = '' }: {
  tone?: TagTone; mono?: boolean; children: React.ReactNode; className?: string;
}) {
  return <span className={`tag tag-${tone}${mono ? ' tag-mono' : ''} ${className}`}>{children}</span>;
}
