import React from 'react';
import { useStore, selectSession } from '../../store';
import { dimensionLabel, getPack } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Button, Callout, Mark, ScorePip, Sheet, Tag } from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { formatDate } from '../../lib/session-ops';

export default function TranscriptScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const deleteSession = useStore((s) => s.deleteSession);

  if (!session) {
    return (
      <div className="col-read stack">
        <Callout tone="danger" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('record')}>{t('common.action.back')}</Button>
        </Callout>
      </div>
    );
  }

  function exportOne() {
    if (!session) return;
    const blob = new Blob([JSON.stringify({ v: 2, kind: 'session', session }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^\w-]+/g, '_').slice(0, 48)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function remove() {
    if (!session) return;
    if (!window.confirm(t('record.confirmDelete'))) return;
    deleteSession(session.id);
    nav('record');
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <h1 className="t-display-2">{session.title}</h1>
          <Tag mono>{getPack(session.packId).shortName}</Tag>
        </div>
        <span className="t-small ink-3">
          {formatDate(session.createdAt, lang)} · {session.probes.length} probes
          {session.model ? ` · ${session.model}` : ''}
        </span>
      </header>

      {session.probes.map((p, i) => (
        <Sheet key={p.id} elevation={1}>
          <div className="stack-tight">
            <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
              <span className="t-micro ink-3">
                {i + 1} · {dimensionLabel(session.packId, p.dimensionId)} · {p.kind}
              </span>
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <Mark verdict={verdictOf(p)} />
                {p.ai && <ScorePip score={p.ai.score} />}
              </div>
            </div>

            {p.anchor.quote && (
              <blockquote className="transcript-anchor t-mono t-small">{p.anchor.quote}</blockquote>
            )}
            <p className="t-body-strong measure">{p.question}</p>

            <div className="stack-tight">
              <span className="t-micro ink-3">your answer</span>
              <p className="t-body ink-2 measure">
                {p.answer?.trim() ? p.answer : <em className="ink-3">{t('viva.skip')}</em>}
              </p>
            </div>

            {p.ai && (
              <div className="stack-tight">
                <span className="t-micro ink-3">examiner</span>
                <p className="t-body measure">{p.ai.verdictLine}</p>
                {p.ai.evidence.missing.length > 0 && (
                  <ul className="evidence evidence-missing">
                    {p.ai.evidence.missing.map((e, j) => <li key={j} className="t-small">{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <details className="transcript-why">
              <summary className="t-small ink-3">{t('viva.whyAsked')}</summary>
              <p className="t-small ink-2 measure">{p.whyThisProbe}</p>
              <ul className="reference-list">
                {p.reference.keyPoints.map((k, j) => <li key={j} className="t-small">{k}</li>)}
              </ul>
            </details>
          </div>
        </Sheet>
      ))}

      <div className="row wrap">
        <Button variant="secondary" onClick={() => nav('map', { sessionId: session.id })}>{t('map.title')}</Button>
        <Button variant="ghost" onClick={exportOne}>{t('record.exportOne')}</Button>
        <Button variant="danger" onClick={remove}>{t('record.deleteOne')}</Button>
      </div>
    </div>
  );
}
