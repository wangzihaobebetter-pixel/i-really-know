import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, selectSession, selectHasKey } from '../../store';
import { getPack, dimensionLabel } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import {
  AnchoredText, Button, Callout, DimensionLedger, Mark, MarginNote,
  Sheet, Spinner, Tag, useToast,
  DivergenceHero, ClaimedHero, SlopeGraph, CalibrationTrend,
} from '../../ui';
import type { TextAnchor } from '../../ui';
import {
  dimensionLedger, divergence, underclaimedProbes, undefendedProbes, verdictOf,
} from '../../lib/analysis';
import { diagnose, describeError } from '../../lib/llm';
import { targetsFromSession } from '../../lib/session-ops';

/**
 * The divergence screen. P3 §3.
 *
 * v2 called this "the map" and led with two numbers of identical size sitting
 * side by side — `掌握度 56` and `自我认知准确度 56` — which gave the eye nothing
 * to land on and buried the only metric no competitor ships. v3 inverts it:
 * ONE hero numeral, the signed span count, and nothing else on that first
 * screen above body scale.
 */
export default function MapScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const toast = useToast();
  const sessionId = useRoute().params.sessionId;

  const session = useStore(selectSession(sessionId));
  const allSessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const updateSession = useStore((s) => s.updateSession);
  const addTargets = useStore((s) => s.addTargets);

  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const pageRef = useRef<HTMLDivElement>(null);

  const anchors: TextAnchor[] = useMemo(() => {
    if (!session) return [];
    return session.probes
      .filter((p) => p.anchor.placed && p.anchor.start !== undefined && p.anchor.end !== undefined)
      .map((p) => ({ id: p.id, start: p.anchor.start!, end: p.anchor.end!, verdict: verdictOf(p) }))
      .sort((a, b) => a.start - b.start);
  }, [session]);

  const div = useMemo(() => (session ? divergence(session.probes) : undefined), [session]);

  /** The trend needs the zero line and at least two points to mean anything. */
  const trend = useMemo(() => {
    return allSessions
      .filter((s) => s.status === 'complete')
      .map((s) => ({ at: s.completedAt ?? s.createdAt, d: divergence(s.probes) }))
      .filter((x): x is { at: number; d: NonNullable<ReturnType<typeof divergence>> } => !!x.d)
      .sort((a, b) => a.at - b.at)
      .map((x) => ({ at: x.at, delta: x.d.delta }));
  }, [allSessions]);

  /* Tapping a line on the curve jumps to that span on the Painted Page —
     the chart is an index into the evidence, not an ornament (P3 §3.3). */
  useEffect(() => {
    if (!activeId) return;
    pageRef.current
      ?.querySelector(`[data-anchor-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeId]);

  if (!session) {
    return (
      <div className="col-read stack">
        <Callout tone="undefended" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('home')}>{t('common.state.notfound.action')}</Button>
        </Callout>
      </div>
    );
  }

  const graded = session.probes.filter((p) => p.ai || p.selfGrade);
  if (!graded.length) {
    return (
      <div className="col-read stack">
        <Callout tone="neutral" title={t('map.empty')}>
          <Button size="sm" onClick={() => nav('run', { sessionId: session.id })}>{t('home.resume')}</Button>
        </Callout>
      </div>
    );
  }

  const pack = getPack(session.packId);
  const ledger = dimensionLedger(session.probes);
  const underclaimed = underclaimedProbes(session.probes);
  const undefended = undefendedProbes(session.probes);
  const unplaced = session.probes.filter((p) => !p.anchor.placed);
  const scoredByAi = session.probes.some((p) => p.ai);
  const activeProbe = session.probes.find((p) => p.id === activeId);

  async function writeDiagnosis() {
    if (!session || !hasKey) return;
    setDiagnosing(true);
    setError(null);
    try {
      updateSession(session.id, { diagnosis: await diagnose(settings, session, lang) });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setDiagnosing(false);
    }
  }

  function queueWeak() {
    if (!session) return;
    const targets = targetsFromSession(session);
    addTargets(targets);
    toast.push(t('map.added', { n: targets.length }), { tone: 'neutral' });
  }

  return (
    <div className="col-read stack">
      {/* ---- THE HERO. One per screen. Nothing else here is above body scale. ---- */}
      <header className="stack-tight">
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <span className="t-micro ink-3">{t('map.divergenceTitle')}</span>
          <Tag mono>{pack.shortName}</Tag>
        </div>
      </header>

      {div ? (
        <DivergenceHero divergence={div} />
      ) : (
        <ClaimedHero
          claimed={session.probes.filter((p) => p.selfGrade === 'owned').length}
          scored={session.probes.filter((p) => p.selfGrade).length}
          onSetup={() => nav('settings')}
        />
      )}

      {/* ---- The curve, below the fold on purpose. ---- */}
      {div && div.pairs.length > 1 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.curveTitle')}</h2>
          <SlopeGraph pairs={div.pairs} onSelect={setActiveId} activeId={activeId} />
        </section>
      )}

      {/* ---- The Painted Page: one contained surface, a true document. ---- */}
      <section className="stack-tight" ref={pageRef}>
        <h2 className="t-title">{t('map.painted')}</h2>
        <p className="t-small ink-3 measure">{t('map.paintedHint')}</p>
        <Sheet elevation={0} padding="var(--space-6)">
          <AnchoredText
            text={session.material}
            mode={session.materialKind === 'code' ? 'code' : 'prose'}
            anchors={anchors}
            activeId={activeId}
            staggered
            onAnchorClick={(anchorId) => setActiveId(anchorId === activeId ? undefined : anchorId)}
          />
          {/* The examiner's remark, in the margin, beside the span it is about
              — a marked script carries the specific note, not a slogan repeated
              once per failure. */}
          {undefended.filter((p) => p.ai?.verdictLine).slice(0, 3).map((p) => (
            <MarginNote key={p.id} tone="undefended" anchorId={p.id}>
              {p.ai!.verdictLine}
            </MarginNote>
          ))}
        </Sheet>
        <div className="doc-key t-small ink-2">
          <span className="doc-chip ink-defended">{t('map.keyDefended')}</span>
          <span className="doc-chip ink-partial">{t('map.keyPartial')}</span>
          <span className="doc-chip ink-undefended">{t('map.keyUndefended')}</span>
          <span className="doc-chip ink-underclaimed">{t('map.keyUnderclaimed')}</span>
        </div>
        {activeProbe && (
          <Sheet elevation={1}>
            <div className="stack-tight">
              <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
                <span className="t-micro ink-3">{dimensionLabel(session.packId, activeProbe.dimensionId)}</span>
                <Mark verdict={verdictOf(activeProbe)} />
              </div>
              <p className="t-body-strong measure">{activeProbe.question}</p>
              {activeProbe.answer && <p className="t-small ink-2 measure">{activeProbe.answer}</p>}
              {activeProbe.ai && <p className="t-small measure">{activeProbe.ai.verdictLine}</p>}
            </div>
          </Sheet>
        )}
        {unplaced.length > 0 && (
          <p className="t-small ink-3">{t('map.unplaced')}: {unplaced.length}</p>
        )}
      </section>

      {/* ---- THE UNDERCONFIDENT STATE. First-class, and the largest cohort.
             v2 computed this and threw it away (analysis.ts mapped undersold
             straight to owned), so 46% of students saw the same green as the
             students who were right. It goes ABOVE the failures deliberately:
             this is a correction of a false belief, not praise, and it is the
             one return reason that is not shame. ---- */}
      {underclaimed.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.underclaimedTitle')}</h2>
          <p className="t-small ink-3 measure">{t('map.underclaimedHint')}</p>
          {underclaimed.map((p) => (
            <Sheet key={p.id} elevation={1} padding="var(--space-4) var(--space-5)">
              <div className="stack-tight">
                <div className="row" style={{ gap: 'var(--space-3)' }}>
                  <Mark verdict="underclaimed" />
                  <span className="t-small ink-3">{dimensionLabel(session.packId, p.dimensionId)}</span>
                </div>
                <blockquote className="doc-quote t-small ink-2">{p.anchor.quote}</blockquote>
                {p.ai && <p className="t-small">{p.ai.verdictLine}</p>}
              </div>
            </Sheet>
          ))}
        </section>
      )}

      {undefended.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.undefendedTitle')}</h2>
          {undefended.map((p) => (
            <Sheet key={p.id} elevation={1} padding="var(--space-4) var(--space-5)">
              <div className="stack-tight">
                <div className="row" style={{ gap: 'var(--space-3)' }}>
                  <Mark verdict="undefended" />
                  <span className="t-small ink-3">{dimensionLabel(session.packId, p.dimensionId)}</span>
                </div>
                <p className="t-body measure">{p.question}</p>
                {p.ai && <p className="t-small ink-2">{p.ai.verdictLine}</p>}
              </div>
            </Sheet>
          ))}
        </section>
      )}

      {trend.length > 1 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.trendTitle')}</h2>
          <CalibrationTrend deltas={trend} />
        </section>
      )}

      <section className="stack-tight">
        <h2 className="t-title">{t('map.ledger')}</h2>
        <DimensionLedger
          rows={ledger}
          labelFor={(d) => dimensionLabel(session.packId, d)}
          compareSelf={scoredByAi}
        />
      </section>

      {session.fragilities.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.fragilities')}</h2>
          {session.fragilities.map((f, i) => (
            <Sheet key={i} elevation={0} padding="var(--space-4) var(--space-5)">
              <p className="t-small ink-2 measure">{f.note}</p>
              <p className="t-mono t-micro ink-3">{f.anchor.quote.slice(0, 120)}</p>
            </Sheet>
          ))}
        </section>
      )}

      <section className="stack-tight">
        <h2 className="t-title">{t('map.diagnosis')}</h2>
        {session.diagnosis ? (
          <Sheet elevation={1}>
            <div className="stack-tight">
              <p className="t-body-lg measure">{session.diagnosis.headline}</p>
              {session.diagnosis.owned.length > 0 && (
                <ul className="evidence evidence-present">
                  {session.diagnosis.owned.map((x, i) => <li key={i} className="t-small">{x}</li>)}
                </ul>
              )}
              {session.diagnosis.borrowed.length > 0 && (
                <ul className="evidence evidence-missing">
                  {session.diagnosis.borrowed.map((x, i) => <li key={i} className="t-small">{x}</li>)}
                </ul>
              )}
              {session.diagnosis.nextActions.length > 0 && (
                <>
                  <span className="t-micro ink-3">{t('map.nextActions')}</span>
                  <ol className="reference-list">
                    {session.diagnosis.nextActions.map((x, i) => <li key={i} className="t-small">{x}</li>)}
                  </ol>
                </>
              )}
            </div>
          </Sheet>
        ) : hasKey && !scoredByAi ? (
          <div className="row">
            <Button variant="secondary" onClick={writeDiagnosis} disabled={diagnosing}>
              {diagnosing ? t('map.diagnosing') : t('map.diagnose')}
            </Button>
            {diagnosing && <Spinner />}
          </div>
        ) : scoredByAi ? (
          <div className="row">
            <Button variant="secondary" onClick={writeDiagnosis} disabled={diagnosing || !hasKey}>
              {diagnosing ? t('map.diagnosing') : t('map.diagnose')}
            </Button>
            {diagnosing && <Spinner />}
          </div>
        ) : (
          <p className="t-small ink-3">{t('map.selfReported')}</p>
        )}
        {error && <Callout tone="danger">{error}</Callout>}
      </section>

      <div className="row wrap">
        <Button variant="primary" onClick={queueWeak}>{t('map.addQueue')}</Button>
        <Button variant="ghost" onClick={() => nav('transcript', { sessionId: session.id })}>
          {t('record.transcript')}
        </Button>
      </div>
    </div>
  );
}
