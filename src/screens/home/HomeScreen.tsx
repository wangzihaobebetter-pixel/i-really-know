import React, { useMemo } from 'react';
import { useStore, selectHasKey, selectRealSessions } from '../../store';
import { SAMPLES, buildSampleSession, sampleSessionId } from '../../samples';
import { getPack } from '../../packs';
import { navigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Button, Callout, Sheet, Tag, OwnershipBar, Mark } from '../../ui';
import { countVerdicts, ownershipInWords } from '../../lib/analysis';
import { formatDate } from '../../lib/session-ops';

export default function HomeScreen() {
  const t = useT();
  const lang = useLang();
  const hasKey = useStore(selectHasKey);
  const sessions = useStore(selectRealSessions);
  const upsertSession = useStore((s) => s.upsertSession);
  const allSessions = useStore((s) => s.sessions);

  const recent = useMemo(() => sessions.slice(0, 4), [sessions]);

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
      <header className="stack-tight">
        <h1 className="t-display-1">{t('common.app.name')}</h1>
        <p className="t-body-lg measure">{t('home.lede')}</p>
      </header>

      <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
        <Button variant="primary" size="lg" onClick={() => navigate('import')}>
          {t('home.ctaOwn')}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => openSample(SAMPLES[0].id)}>
          {t('home.ctaSample')}
        </Button>
      </div>

      {!hasKey && (
        <Callout
          tone="action"
          title={t('home.noKeyTitle')}
          action={<Button size="sm" onClick={() => navigate('settings')}>{t('home.noKeyAction')}</Button>}
        >
          {t('home.noKeyBody')}
        </Callout>
      )}

      {recent.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('home.recentTitle')}</h2>
          <div className="stack-tight">
            {recent.map((s) => {
              const counts = countVerdicts(s.probes);
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
                        {done && s.ownershipIndex !== undefined
                          ? ` · ${ownershipInWords(s.ownershipIndex, lang)}`
                          : ''}
                      </span>
                      {done && counts.total > 0 && <OwnershipBar counts={counts} />}
                    </div>
                    <Button
                      size="sm"
                      variant={done ? 'ghost' : 'secondary'}
                      onClick={() => navigate(done ? 'map' : 'run', { sessionId: s.id })}
                    >
                      {done ? t('home.review') : t('home.resume')}
                    </Button>
                  </div>
                </Sheet>
              );
            })}
          </div>
        </section>
      )}

      <section className="stack-tight">
        <h2 className="t-title">{t('home.samplesTitle')}</h2>
        <p className="t-small ink-3">{t('home.samplesHint')}</p>
        <div className="sample-grid">
          {SAMPLES.map((def) => {
            const pack = getPack(def.packId);
            const existing = allSessions.find((s) => s.id === sampleSessionId(def.id));
            const done = existing?.status === 'complete';
            return (
              <button key={def.id} type="button" className="sample-card" onClick={() => openSample(def.id)}>
                <div className="row-between" style={{ gap: 'var(--space-3)' }}>
                  <Tag mono tone="action">{pack.shortName}</Tag>
                  {done && <Mark verdict="owned" showWord={false} size={14} />}
                </div>
                <span className="t-body-strong sample-card-title">{def.title}</span>
                <span className="t-small ink-3">{def.blurb}</span>
                <span className="t-mono-small ink-3">
                  {def.probes.length} probes · {def.level}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
