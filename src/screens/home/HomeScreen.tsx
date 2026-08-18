import React, { useEffect, useMemo, useState } from 'react';
import { useStore, selectHasKey, selectRealSessions, selectDueTargets } from '../../store';
import { SAMPLES, DEMO_SAMPLES, buildSampleSession, buildWorkedSession, sampleSessionId } from '../../samples';
import { getPack, dimensionLabel } from '../../packs';
import { navigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { AnchoredText, Button, Sheet, Tag, Mark, DivergenceHero } from '../../ui';
import type { TextAnchor } from '../../ui';
import { divergence, verdictOf } from '../../lib/analysis';
import { formatDate } from '../../lib/session-ops';

/**
 * Home. P2 §1 and F3.
 *
 * v2 opened on philosophy and an API-key banner — a wall between a first-time
 * visitor and any evidence the thing works. v3 opens on the product working:
 * a real sourced submission, already examined, the Painted Page inking itself
 * span by span, and the divergence number underneath it.
 *
 * The registers stay separate (P3 §1): the page around it is expressive, the
 * artifact inside the sheet is a document.
 */
export default function HomeScreen() {
  const t = useT();
  const lang = useLang();
  const hasKey = useStore(selectHasKey);
  const sessions = useStore(selectRealSessions);
  const due = useStore(selectDueTargets());
  const upsertSession = useStore((s) => s.upsertSession);
  const allSessions = useStore((s) => s.sessions);

  /* Rotate the demo between runs so a returning visitor does not see the same
     page twice. Index is derived, not random, so it is stable within a mount. */
  const [demoIndex, setDemoIndex] = useState(0);
  const demoDef = DEMO_SAMPLES[demoIndex % DEMO_SAMPLES.length];
  const demo = useMemo(() => buildWorkedSession(demoDef), [demoDef]);
  const demoDiv = useMemo(() => divergence(demo.probes), [demo]);
  const demoAnchors: TextAnchor[] = useMemo(
    () => demo.probes
      .filter((p) => p.anchor.placed && p.anchor.start !== undefined)
      .map((p) => ({ id: p.id, start: p.anchor.start!, end: p.anchor.end!, verdict: verdictOf(p) }))
      .sort((a, b) => a.start - b.start),
    [demo],
  );

  /* Re-key the demo periodically so the page is visibly alive on arrival
     rather than a screenshot of itself. */
  const [inkKey, setInkKey] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const h = window.setInterval(() => setInkKey((k) => k + 1), 9000);
    return () => window.clearInterval(h);
  }, []);

  const recent = useMemo(() => sessions.slice(0, 3), [sessions]);

  function openSample(sampleId: string) {
    const existing = allSessions.find((s) => s.id === sampleSessionId(sampleId));
    if (!existing) {
      const def = SAMPLES.find((s) => s.id === sampleId)!;
      upsertSession(buildSampleSession(def));
    }
    navigate(existing?.status === 'complete' ? 'map' : 'run', { sessionId: sampleSessionId(sampleId) });
  }

  return (
    <div className="col-read stack">
      {/* ---- The claim, in one line. No "verify" — that word is taken. ---- */}
      <header className="stack-tight">
        <h1 className="t-display">
          {t('home.heroA')}<em className="ink-over" style={{ fontStyle: 'normal' }}> {t('home.heroEm')} </em>{t('home.heroB')}
        </h1>
        <p className="t-body-lg measure ink-2">{t('home.lede')}</p>
        <p className="t-small measure ink-3">{t('home.sub')}</p>
      </header>

      {/* ---- THE DEMO, FIRST. A real submission, mid-examination. ---- */}
      <section className="stack-tight">
        <div className="demo-caption">
          <span className="t-micro ink-3">{t('home.demoLabel')}</span>
          <Tag mono tone="action">{getPack(demo.packId).shortName}</Tag>
        </div>
        <div className="demo-sheet">
          <div className="stack-tight">
            <span className="t-body-strong">{demoDef.title}</span>
            <span className="t-small ink-3 measure">{t('home.demoHint')}</span>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <AnchoredText
              key={inkKey}
              text={demo.material}
              mode={demo.materialKind === 'code' ? 'code' : 'prose'}
              anchors={demoAnchors}
              staggered
            />
          </div>
          <p className="demo-source" style={{ marginTop: 'var(--space-5)' }}>
            {t('home.demoSource')}: {demoDef.source.corpus} · {demoDef.source.who} ·{' '}
            <a href={demoDef.source.url} target="_blank" rel="noreferrer noopener">{demoDef.source.url}</a>
            {' · '}{t('home.demoExcerpt')} ({demoDef.source.originalLength})
          </p>
        </div>

        {demoDiv && <DivergenceHero key={`h${inkKey}`} divergence={demoDiv} />}

        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <Button variant="primary" size="lg" onClick={() => openSample(demoDef.id)}>
            {t('home.ctaTry')}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('import')}>
            {t('home.ctaOwnV3')}
          </Button>
          {DEMO_SAMPLES.length > 1 && (
            <Button variant="ghost" onClick={() => setDemoIndex((i) => i + 1)}>
              {t('common.action.retry')}
            </Button>
          )}
        </div>
      </section>

      {/* ---- The return hook (F5). Not a streak, not guilt — the content. ---- */}
      {due.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('home.queueTitle')}</h2>
          <p className="t-small ink-3 measure">
            {t('home.queueLede')} {t(due.length === 1 ? 'home.queueOne' : 'home.queueMany', { n: due.length })}
          </p>
          <div className="queue-strip">
            {due.slice(0, 6).map((target) => (
              <button key={target.id} type="button" className="queue-chip"
                      onClick={() => navigate('queue')}>
                <Tag mono>{getPack(target.packId).shortName}</Tag>
                <span className="t-small ink-2">{dimensionLabel(target.packId, target.dimensionId)}</span>
                <span className="t-small">{target.anchor.quote.slice(0, 70)}…</span>
              </button>
            ))}
          </div>
          <div className="row">
            <Button variant="secondary" onClick={() => navigate('queue')}>{t('home.queueOpen')}</Button>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('home.yourRuns')}</h2>
          {recent.map((s) => {
            const d = divergence(s.probes);
            const done = s.status === 'complete';
            return (
              <Sheet key={s.id} elevation={1} padding="var(--space-4) var(--space-5)">
                <div className="row-between wrap" style={{ gap: 'var(--space-4)' }}>
                  <div className="stack-tight grow" style={{ minWidth: '14rem' }}>
                    <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
                      <span className="t-body-strong">{s.title}</span>
                      <Tag mono>{getPack(s.packId).shortName}</Tag>
                    </div>
                    <span className="t-small ink-3">
                      {formatDate(s.createdAt, lang)}
                      {d ? ` · ${t('map.divergenceClaim', { claimed: d.claimed, defended: d.defended })}` : ''}
                    </span>
                  </div>
                  <Button size="sm" variant={done ? 'ghost' : 'secondary'}
                          onClick={() => navigate(done ? 'map' : 'run', { sessionId: s.id })}>
                    {done ? t('home.review') : t('home.resume')}
                  </Button>
                </div>
              </Sheet>
            );
          })}
        </section>
      )}

      <section className="stack-tight">
        <h2 className="t-title">{t('home.samplesTitleV3')}</h2>
        <p className="t-small ink-3 measure">{t('home.samplesHintV3')}</p>
        <div className="sample-grid">
          {SAMPLES.map((def) => {
            const pack = getPack(def.packId);
            const existing = allSessions.find((s) => s.id === sampleSessionId(def.id));
            const done = existing?.status === 'complete';
            return (
              <button key={def.id} type="button" className="sample-card" onClick={() => openSample(def.id)}>
                <div className="row-between" style={{ gap: 'var(--space-3)' }}>
                  <Tag mono tone="action">{pack.shortName}</Tag>
                  {done && <Mark verdict="defended" showWord={false} size={14} />}
                </div>
                <span className="t-body-strong sample-card-title">{def.title}</span>
                <span className="t-small ink-3">{def.blurb}</span>
                <span className="t-mono-small ink-3">
                  {def.probes.length} probes · {def.source.corpus.split('—')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!hasKey && (
        <p className="t-small ink-3 measure">
          {t('home.keyNote')}{' '}
          <a href="#/settings">{t('home.keyNoteAction')}</a>
        </p>
      )}
    </div>
  );
}
