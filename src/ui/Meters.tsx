import React from 'react';
import type { Verdict } from '../types';
import type { LedgerRow, OwnershipCounts } from '../lib/analysis';
import { Mark } from './Marks';
import { translate } from '../i18n';

const VERDICT_VAR: Record<Verdict, string> = {
  owned: 'var(--owned)', shaky: 'var(--shaky)', borrowed: 'var(--borrowed)',
  illusion: 'var(--illusion)', none: 'var(--hairline)',
};

/** Probe progress: one segment per probe, inked by verdict as the run proceeds. */
export function SegmentStrip({ total, current, states = [] }: { total: number; current: number; states?: Verdict[] }) {
  return (
    <div className="segstrip" role="img" aria-label={`Probe ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i} className="segstrip-seg" data-current={i === current}
          style={{ background: i < states.length && states[i] !== 'none' ? VERDICT_VAR[states[i]] : i <= current ? 'var(--ink-3)' : undefined }}
        />
      ))}
    </div>
  );
}

/** Timer ring — the stroke bleeds ink-3 → shaky → borrowed. It never flashes. */
export function TimerRing({ totalSec, remainingSec, paused, size = 34 }: {
  totalSec: number; remainingSec: number; paused?: boolean; size?: number;
}) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const frac = totalSec > 0 ? Math.max(0, Math.min(1, remainingSec / totalSec)) : 0;
  const color = frac <= 0.15 ? 'var(--borrowed)' : frac <= 0.3 ? 'var(--shaky)' : 'var(--ink-3)';
  const mm = Math.floor(Math.max(0, remainingSec) / 60);
  const ss = Math.floor(Math.max(0, remainingSec) % 60);
  return (
    <span className="row" style={{ gap: 'var(--space-3)' }}>
      <svg width={size} height={size} aria-hidden style={{ opacity: paused ? 0.5 : 1 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 400ms var(--ease)' }}
        />
      </svg>
      <span className="t-mono t-num" style={{ color, fontSize: '.875rem' }}>
        {mm}:{String(ss).padStart(2, '0')}
      </span>
    </span>
  );
}

export function OwnershipBar({ counts, showLegend }: { counts: OwnershipCounts; showLegend?: boolean }) {
  const order: Verdict[] = ['owned', 'shaky', 'illusion', 'borrowed', 'none'];
  const total = Math.max(1, counts.total);
  return (
    <div>
      <div className="ownbar" role="img" aria-label={`Owned ${counts.owned}, shaky ${counts.shaky}, illusion ${counts.illusion}, borrowed ${counts.borrowed} of ${counts.total}`}>
        {order.map((v) => counts[v] > 0 && (
          <span key={v} className="ownbar-part" style={{ width: `${(counts[v] / total) * 100}%`, background: VERDICT_VAR[v] }} />
        ))}
      </div>
      {showLegend && (
        <div className="ownbar-legend">
          {order.filter((v) => counts[v] > 0).map((v) => (
            <span key={v} className="row" style={{ gap: 'var(--space-2)' }}>
              <Mark verdict={v} size={14} />
              <span className="t-mono t-num t-small ink-2">{counts[v]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal ink bars, one per dimension. Deliberately not a radar chart (§5.1). */
export function DimensionLedger({ rows, labelFor, compareSelf }: {
  rows: LedgerRow[];
  labelFor?: (dimensionId: string) => string;
  compareSelf?: boolean;
}) {
  return (
    <div className="ledger">
      {rows.map((r) => {
        const pct = (r.mean / 3) * 100;
        const color = r.mean >= 2 ? 'var(--owned)' : r.mean >= 1 ? 'var(--shaky)' : 'var(--borrowed)';
        return (
          <div className="ledger-row" key={r.dimensionId}>
            <span className="t-small">{labelFor?.(r.dimensionId) ?? r.dimensionId}</span>
            <span className="ledger-track">
              <span className="ledger-fill" style={{ width: `${pct}%`, background: color }} />
              {compareSelf && r.selfMean !== undefined && (
                <span className="ledger-self" style={{ left: `calc(${(r.selfMean / 3) * 100}% - 1px)` }} title={translate('common.verdict.none')} />
              )}
            </span>
            <span className="t-mono t-num t-small ink-3">{r.mean.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
