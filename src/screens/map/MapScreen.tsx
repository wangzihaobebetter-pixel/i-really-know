import React, { useMemo, useState } from 'react';
import { useStore, selectSession, selectHasKey } from '../../store';
import { getPack, dimensionLabel } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import {
  AnchoredText, Button, Callout, DimensionLedger, Mark, MarginNote,
  OwnershipBar, Sheet, Spinner, Tag, useToast,
} from '../../ui';
import type { TextAnchor } from '../../ui';
import {
  countVerdicts, dimensionLedger, ownershipInWords, verdictOf,
} from '../../lib/analysis';
import { diagnose, describeError } from '../../lib/llm';
import { targetsFromSession } from '../../lib/session-ops';

export default function MapScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const toast = useToast();
  const sessionId = useRoute().params.sessionId;

  const session = useStore(selectSession(sessionId));
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const updateSession = useStore((s) => s.updateSession);
  const addTargets = useStore((s) => s.addTargets);

  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();

  const anchors: TextAnchor[] = useMemo(() => {
    if (!session) return [];
    return session.probes
      .filter((p) => p.anchor.placed && p.anchor.start !== undefined && p.anchor.end !== undefined)
      .map((p) => ({
        id: p.id,
        start: p.anchor.start!,
        end: p.anchor.end!,
        verdict: verdictOf(p),
      }))
      .sort((a, b) => a.start - b.start);
  }, [session]);

  if (!session) {
    return (
      <div className="col-read stack">
        <Callout tone="borrowed" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('home')}>{t('common.state.notfound.action')}</Button>
        </Callout>
      </div>
    );
  }

  const counts = countVerdicts(session.probes);
  const graded = session.probes.filter((p) => p.ai || p.selfGrade);
  const ledger = dimensionLedger(session.probes);
  const illusions = session.probes.filter((p) => verdictOf(p) === 'illusion');
  const unplaced = session.probes.filter((p) => !p.anchor.placed);
  const scoredByAi = session.probes.some((p) => p.ai);
  const pack = getPack(session.packId);
  const activeProbe = session.probes.find((p) => p.id === activeId);

  async function writeDiagnosis() {
    if (!session || !hasKey) return;
    setDiagnosing(true);
    setError(null);
    try {
      const d = await diagnose(settings, session, lang);
      updateSession(session.id, { diagnosis: d });
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

  if (!graded.length) {
    return (
      <div className="col-read stack">
        <Callout tone="neutral" title={t('map.empty')}>
          <Button size="sm" onClick={() => nav('run', { sessionId: session.id })}>{t('home.resume')}</Button>
        </Callout>
      </div>
    );
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <h1 className="t-display-2">{t('map.title')}</h1>
          <Tag mono>{pack.shortName}</Tag>
        </div>
        <p className="t-serif-it t-body-lg measure">
          {ownershipInWords(session.ownershipIndex, lang)}
        </p>
        {!scoredByAi && <p className="t-small ink-3">{t('map.selfReported')}</p>}
      </header>

      <Sheet elevation={1}>
        <div className="stack-tight">
          <OwnershipBar counts={counts} showLegend />
          <div className="row wrap" style={{ gap: 'var(--space-6)' }}>
            <div className="stack-tight">
              <span className="t-micro ink-3">{t('map.index')}</span>
              <span className="t-display-2 t-num">{session.ownershipIndex ?? '—'}</span>
            </div>
            {session.calibration !== undefined && (
              <div className="stack-tight">
                <span className="t-micro ink-3">{t('map.calibration')}</span>
                <span className="t-display-2 t-num">{session.calibration}</span>
                <span className="t-micro ink-3 measure">{t('map.calibrationHint')}</span>
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {illusions.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('map.illusions')}</h2>
          {illusions.map((p) => (
            <Sheet key={p.id} elevation={1} padding="var(--space-4) var(--space-5)">
              <div className="stack-tight">
                <div className="row" style={{ gap: 'var(--space-3)' }}>
                  <Mark verdict="illusion" />
                  <span className="t-small ink-3">{dimensionLabel(session.packId, p.dimensionId)}</span>
                </div>
                <p className="t-body measure">{p.question}</p>
                {p.ai && <p className="t-small ink-2">{p.ai.verdictLine}</p>}
              </div>
            </Sheet>
          ))}
        </section>
      )}

      <section className="stack-tight">
        <h2 className="t-title">{t('map.painted')}</h2>
        <p className="t-small ink-3">{t('map.paintedHint')}</p>
        <Sheet elevation={0} padding="var(--space-6)">
          <AnchoredText
            text={session.material}
            mode={session.materialKind === 'code' ? 'code' : 'prose'}
            anchors={anchors}
            activeId={activeId}
            staggered
            onAnchorClick={(anchorId) => setActiveId(anchorId === activeId ? undefined : anchorId)}
          />
          {illusions.map((p) => (
            <MarginNote key={p.id} tone="illusion" anchorId={p.id}>
              {lang === 'en' ? 'You marked this Owned. It isn’t yet.' : '你标了"我掌握了"。目前还不是。'}
            </MarginNote>
          ))}
        </Sheet>
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
          <p className="t-small ink-3">
            {t('map.unplaced')}: {unplaced.length}
          </p>
        )}
      </section>

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
        ) : hasKey ? (
          <div className="row">
            <Button variant="secondary" onClick={writeDiagnosis} disabled={diagnosing}>
              {diagnosing ? t('map.diagnosing') : t('map.diagnose')}
            </Button>
            {diagnosing && <Spinner />}
          </div>
        ) : (
          <p className="t-small ink-3">{t('map.selfReported')}</p>
        )}
        {error && <Callout tone="borrowed">{error}</Callout>}
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
