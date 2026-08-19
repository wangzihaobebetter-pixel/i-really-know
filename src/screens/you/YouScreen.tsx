import React from 'react';
import { BookHeart, CircleEqual, Compass, ShieldCheck } from 'lucide-react';
import { selectRealSessions, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Sheet } from '../../ui';
import { divergence, verdictOf } from '../../lib/analysis';
import { dimensionLabel } from '../../packs';
import { formatDate } from '../../lib/session-ops';

export default function YouScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore(selectRealSessions)
    .filter((session) => session.status === 'complete' && !session.sampleId)
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));

  const words = sessions.flatMap((session) => session.probes
    .filter((probe) => ['defended', 'underclaimed'].includes(verdictOf(probe)) && probe.answer?.trim())
    .map((probe) => ({ answer: probe.answer!.trim(), title: session.title, at: session.completedAt ?? session.createdAt })))
    .slice(0, 12);

  const reads = sessions
    .map((session) => ({ session, read: divergence(session.probes) }))
    .filter((item): item is { session: typeof sessions[number]; read: NonNullable<ReturnType<typeof divergence>> } => Boolean(item.read));

  const slips = new Map<string, { label: string; count: number }>();
  for (const session of sessions) {
    for (const probe of session.probes) {
      const verdict = verdictOf(probe);
      if (verdict !== 'undefended' && verdict !== 'partial') continue;
      const key = `${session.packId}:${probe.dimensionId}`;
      const item = slips.get(key) ?? { label: dimensionLabel(session.packId, probe.dimensionId), count: 0 };
      item.count += 1;
      slips.set(key, item);
    }
  }
  const patterns = [...slips.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  if (!sessions.length) {
    return (
      <div className="col-read stack page-enter" data-testid="you-screen">
        <header className="stack-tight"><span className="t-micro ink-accent">{t('you4.eyebrow')}</span><h1 className="t-sentence">{t('you4.title')}</h1></header>
        <Sheet elevation={0} className="quiet-empty" padding="var(--space-7)">
          <BookHeart size={30} aria-hidden />
          <p className="t-body ink-2 measure">{t('you4.empty')}</p>
          <Button variant="primary" onClick={() => nav('bring')}>{t('you4.start')}</Button>
        </Sheet>
        <p className="no-comparison"><ShieldCheck size={16} aria-hidden />{t('you4.noComparison')}</p>
      </div>
    );
  }

  return (
    <div className="col-read stack page-enter" data-testid="you-screen">
      <header className="stack-tight">
        <span className="t-micro ink-accent">{t('you4.eyebrow')}</span>
        <h1 className="t-sentence">{t('you4.title')}</h1>
        <p className="t-body-lg ink-2 measure">{t('you4.body')}</p>
      </header>

      {words.length > 0 && (
        <section className="you-section words-book stack-tight">
          <div className="row"><BookHeart size={19} aria-hidden /><h2 className="t-title">{t('you4.words')}</h2></div>
          <div className="words-scroll">
            {words.map((word, index) => (
              <blockquote key={`${word.at}-${index}`}>
                “{word.answer}”
                <cite>{word.title}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {reads.length > 0 && (
        <section className="you-section stack-tight">
          <div className="row"><CircleEqual size={19} aria-hidden /><h2 className="t-title">{t('you4.read')}</h2></div>
          <div className="read-timeline">
            {reads.slice(0, 6).map(({ session, read }) => {
              const line = read.direction === 'under'
                ? (lang === 'zh-CN' ? '你低估了自己' : 'You underestimated yourself')
                : read.direction === 'over'
                  ? (lang === 'zh-CN' ? '你当时说得比实际更满' : 'You expected more than held')
                  : (lang === 'zh-CN' ? '你的判断和表现贴得很近' : 'Your read was close');
              return (
                <div className="read-timeline-row" data-direction={read.direction} key={session.id}>
                  <span className="timeline-dot" aria-hidden />
                  <span className="grow"><strong>{line}</strong><small>{session.title}</small></span>
                  <time>{formatDate(session.completedAt ?? session.createdAt, lang)}</time>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {patterns.length > 0 && (
        <section className="you-section stack-tight">
          <div className="row"><Compass size={19} aria-hidden /><h2 className="t-title">{t('you4.patterns')}</h2></div>
          <div className="pattern-list">
            {patterns.map((pattern) => (
              <div className="pattern-row" key={pattern.label}>
                <span className="grow">{pattern.label}</span>
                <span className="t-small ink-3">{pattern.count} {lang === 'zh-CN' ? '次' : pattern.count === 1 ? 'time' : 'times'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="no-comparison"><ShieldCheck size={16} aria-hidden />{t('you4.noComparison')}</p>
    </div>
  );
}
