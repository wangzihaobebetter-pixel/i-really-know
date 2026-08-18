import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DivergenceDirection } from '../types';
import type { Divergence, SlopePair } from '../lib/analysis';
import { DirectionArrow, DIRECTION_CLASS } from './Marks';
import { translate } from '../i18n';

const reduced = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * THE HERO NUMERAL (P3 §3.2). Δ = (spans defended) − (spans claimed), signed.
 *
 * There is exactly one of these per screen and nothing else on that screen is
 * above body scale. That rule is what structurally kills v2's defect where
 * `掌握度 56` and `自我认知准确度 56` sat side by side at the same size, giving
 * the eye nothing to land on.
 *
 * JUDGEMENT CALL, recorded in LOG 012: P3 §3.1 defines the number as signed Δ
 * and P3 §3.2 describes the reveal as travelling "from the claimed count to
 * the demonstrated count". Those two cannot both be literally true of one
 * numeral. Resolved by travelling from 0 to Δ: the distance travelled is still
 * exactly the decoupling (|Δ|), the hue still crossfades ink → Axis B, and the
 * unit on screen is the Δ that §3.1 makes definitional and that the evidence
 * sheet also uses. The claimed and demonstrated counts are stated in words
 * immediately above, which preserves §3.2's purpose — the reveal continues an
 * object the student has already seen rather than introducing a new one.
 *
 * Symmetry is a hard rule (P3 §2.4): overconfident and underconfident use the
 * SAME spring, duration and overshoot. Asymmetric physics is an accusation
 * encoded in motion.
 */
export function DivergenceHero({ divergence: d, animate = true }: {
  divergence: Divergence;
  animate?: boolean;
}) {
  const target = d.delta;
  const [value, setValue] = useState(() => (animate && !reduced() ? 0 : target));
  const [settled, setSettled] = useState(() => !(animate && !reduced()));
  const frame = useRef(0);

  useEffect(() => {
    if (!animate || reduced()) { setValue(target); setSettled(true); return; }
    setValue(0);
    setSettled(false);
    const started = performance.now();
    const DUR = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - started) / DUR);
      /* ~4% overshoot, settling. One spring on screen at a time (P3 §2.4). */
      const eased = p >= 1 ? 1 : 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.04;
      setValue(target * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else { setValue(target); setSettled(true); }
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, animate]);

  const shown = Math.round(value);
  const direction: DivergenceDirection = d.direction;
  const hue = settled ? DIRECTION_CLASS[direction] : 'ink-2';
  const sign = shown > 0 ? '+' : shown < 0 ? '−' : '';

  return (
    <div className="divergence-hero">
      {/* Plain words before the number, so the metric is never a bare score.
          P3 §3.1: a count invites asking WHICH THREE. */}
      <p className="t-body ink-2 divergence-claim">
        {translate('map.divergenceClaim', { claimed: d.claimed, defended: d.defended })}
      </p>

      <div className={`t-hero divergence-numeral ${hue}`} aria-hidden>
        <span className="divergence-sign">{sign}</span>
        <span>{Math.abs(shown)}</span>
      </div>

      <div className={`divergence-arrow ${hue}`} aria-hidden>
        <DirectionArrow direction={direction} size={34} />
      </div>

      {/* The static end-state: no motion is ever the sole carrier of
          information (P3 §2.4), and a screen reader gets the whole claim. */}
      <p className="visually-hidden">
        {translate(`map.divergenceState.${direction}`)} — {translate('map.divergenceClaim', { claimed: d.claimed, defended: d.defended })}
      </p>

      <p className={`t-body-lg divergence-verdict measure${settled ? ' m-in' : ''}`}
         style={settled ? undefined : { visibility: 'hidden' }}>
        {translate(`map.divergenceLine.${direction}`, { n: Math.abs(d.delta) })}
      </p>
    </div>
  );
}

/**
 * THE CALIBRATION CURVE — a paired-slope chart (P3 §3.3).
 *
 * Deliberately NOT a Dunning-Kruger quartile plot. Corpus `03` §A3: the classic
 * bottom-quartile chart is partly regression to the mean, and a product that
 * ships it is shipping a known statistical artifact. A within-subject
 * slopegraph — your predicted score vs your demonstrated score, on your own
 * artifact — sidesteps that critique entirely.
 *
 * Downward line = overclaimed. Upward = underclaimed. Flat = calibrated.
 * DIRECTION READS WITHOUT COLOUR, which matters because the palette is
 * isoluminant between state pairs (P3 §2.2).
 *
 * Every line is tappable and jumps to that span on the Painted Page. The chart
 * is an index into the evidence, not an ornament — that is what makes it
 * survive an appeal.
 */
export function SlopeGraph({ pairs, onSelect, activeId }: {
  pairs: SlopePair[];
  onSelect?: (probeId: string) => void;
  activeId?: string;
}) {
  /* P3 §3.3, stated rather than silent: above 12 spans a slopegraph becomes
     spaghetti. Render the 12 with the largest |Δ| and fold the rest into one
     labelled band that ALWAYS PRINTS THE COUNT IT FOLDED. */
  const CAP = 12;
  const { shown, folded } = useMemo(() => {
    if (pairs.length <= CAP) return { shown: pairs, folded: [] as SlopePair[] };
    const byMagnitude = [...pairs].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return { shown: byMagnitude.slice(0, CAP), folded: byMagnitude.slice(CAP) };
  }, [pairs]);

  const H = 220, PAD = 18, W = 320;
  const y = (score: number) => PAD + (1 - score / 3) * (H - PAD * 2);

  return (
    <figure className="slopegraph">
      <svg viewBox={`0 0 ${W} ${H}`} className="slopegraph-svg" role="img"
           aria-label={translate('map.curveAria', { n: shown.length })}>
        <line x1={60} y1={PAD} x2={60} y2={H - PAD} className="slope-axis" />
        <line x1={W - 60} y1={PAD} x2={W - 60} y2={H - PAD} className="slope-axis" />
        {shown.map((p) => {
          const active = activeId === p.probeId;
          return (
            <g key={p.probeId}
               className={`slope-line slope-${p.direction}${active ? ' is-active' : ''}`}
               onClick={onSelect ? () => onSelect(p.probeId) : undefined}
               role={onSelect ? 'button' : undefined}
               tabIndex={onSelect ? 0 : undefined}
               onKeyDown={(e) => {
                 if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(p.probeId); }
               }}>
              {/* A fat transparent line so the 2px stroke is still tappable. */}
              <line x1={60} y1={y(p.claimed)} x2={W - 60} y2={y(p.demonstrated)} className="slope-hit" />
              <line x1={60} y1={y(p.claimed)} x2={W - 60} y2={y(p.demonstrated)} className="slope-stroke" />
              <circle cx={60} cy={y(p.claimed)} r={active ? 4 : 3} className="slope-dot" />
              <circle cx={W - 60} cy={y(p.demonstrated)} r={active ? 4 : 3} className="slope-dot" />
            </g>
          );
        })}
      </svg>
      <div className="slopegraph-axis-labels t-micro ink-3">
        <span>{translate('map.curveLeft')}</span>
        <span>{translate('map.curveRight')}</span>
      </div>
      <figcaption className="t-small ink-3 measure">
        {translate('map.curveLegend')}
        {folded.length > 0 && ` ${translate('map.curveFolded', { n: folded.length })}`}
      </figcaption>
    </figure>
  );
}

/**
 * THE TREND, and its goal shape (P3 §3.3). One dot per session, signed Δ on
 * the y-axis, THE ZERO LINE RUNNING THROUGH THE MIDDLE — over above, under
 * below.
 *
 * > The goal is the zero line, not the top of the chart.
 *
 * This is the single decision that makes the product symmetric by construction
 * rather than by copy: a student converging from +5 and a student converging
 * from −5 are visibly doing the same thing. Corpus `03` §A1 (Osterhage 2019)
 * establishes calibration is trainable — it improved with each exam within one
 * semester — which is what makes a trend worth drawing at all.
 *
 * Cost, accepted: "closer to the middle is better" cannot be expressed as a
 * progress bar, which rules out the most legible gamified affordance in the
 * design corpus. The alternative is a chart whose good direction is a lie for
 * 46% of users.
 */
export function CalibrationTrend({ deltas }: { deltas: { at: number; delta: number }[] }) {
  if (deltas.length < 2) return null;
  const W = 320, H = 120, PAD = 14;
  const span = Math.max(2, ...deltas.map((d) => Math.abs(d.delta)));
  const x = (i: number) => PAD + (i / Math.max(1, deltas.length - 1)) * (W - PAD * 2);
  const y = (d: number) => H / 2 - (d / span) * (H / 2 - PAD);

  return (
    <figure className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg" role="img"
           aria-label={translate('map.trendAria', { n: deltas.length })}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="trend-zero" />
        <polyline
          className="trend-path"
          points={deltas.map((d, i) => `${x(i)},${y(d.delta)}`).join(' ')}
        />
        {deltas.map((d, i) => (
          <circle key={d.at} cx={x(i)} cy={y(d.delta)} r={i === deltas.length - 1 ? 5 : 3.5}
                  className={`trend-dot trend-${d.delta > 1 ? 'under' : d.delta < -1 ? 'over' : 'accurate'}`} />
        ))}
      </svg>
      <figcaption className="t-small ink-3 measure">{translate('map.trendGoal')}</figcaption>
    </figure>
  );
}
