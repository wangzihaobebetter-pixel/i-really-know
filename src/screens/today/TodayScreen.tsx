import React from 'react';
import { ArrowRight, BookOpen, CalendarClock, Plus, RotateCcw } from 'lucide-react';
import { selectDueTargets, selectRealSessions, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Sheet, Tag } from '../../ui';
import { SAMPLES, buildSampleSession } from '../../samples';
import { getPack } from '../../packs';
import { formatDate, studentDestination } from '../../lib/session-ops';

export default function TodayScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore(selectRealSessions);
  const due = useStore(selectDueTargets());
  const upsertSession = useStore((s) => s.upsertSession);
  const lastId = useStore((s) => s.ui.lastSessionId);

  const real = sessions.filter((s) => !s.sampleId);
  const recent = [...real].sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const unfinished = recent.find((s) => s.status !== 'complete');
  const remembered = sessions.find((s) => s.id === lastId) ?? recent[0];
  const completedExample = remembered?.sampleId && remembered.status === 'complete' ? remembered : undefined;
  const first = real.length === 0;

  function trySample() {
    const session = buildSampleSession(SAMPLES[0]);
    upsertSession(session);
    nav('run', { sessionId: session.id });
  }

  return (
    <div className="col-read stack page-enter today-page" data-testid="today-screen">
      <header className="stack-tight today-intro">
        <span className="t-micro ink-accent">{t('today4.eyebrow')}</span>
        <h1 className="t-sentence">{first ? t('today4.firstTitle') : t('today4.returningTitle')}</h1>
        <p className="t-body-lg ink-2 measure">{t('today4.firstBody')}</p>
      </header>

      <section className="today-main-action" aria-label={t('today4.newRun')}>
        <button className="hero-action" type="button" onClick={() => nav('bring')}>
          <span className="hero-action-icon" aria-hidden><Plus size={24} /></span>
          <span className="grow">
            <strong>{t('today4.newRun')}</strong>
            <small>{lang === 'zh-CN' ? '原文 · 场合 · 日期' : 'Your words · the room · the date'}</small>
          </span>
          <ArrowRight size={21} aria-hidden />
        </button>
        {first && !completedExample && (
          <Button variant="ghost" onClick={() => nav('welcome')} icon={<BookOpen size={17} />}>
            {t('today4.watch')}
          </Button>
        )}
      </section>

      {completedExample && (
        <button className="memory-card" type="button" onClick={() => nav('result', { sessionId: completedExample.id })}>
          <span className="memory-line" aria-hidden />
          <span className="stack-nano grow minw0">
            <span className="t-micro ink-3">{t('today4.justFinished')}</span>
            <strong className="t-body truncate">{completedExample.title}</strong>
          </span>
          <ArrowRight size={19} aria-hidden />
        </button>
      )}

      {unfinished && (
        <button className="memory-card" type="button" onClick={() => nav(studentDestination(unfinished), { sessionId: unfinished.id })}>
          <span className="memory-line" aria-hidden />
          <span className="stack-nano grow">
            <span className="t-micro ink-3">{t('today4.continue', { title: unfinished.title })}</span>
            <strong className="t-body">{unfinished.probes.filter((p) => p.committedAt).length} / {unfinished.probes.length || '…'}</strong>
          </span>
          <ArrowRight size={19} aria-hidden />
        </button>
      )}

      {due.length > 0 && (
        <Sheet elevation={0} className="care-card" padding="var(--space-5)">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="care-icon" aria-hidden><RotateCcw size={18} /></span>
            <div className="stack-tight grow">
              <h2 className="t-title">{t('today4.dueTitle')}</h2>
              <p className="t-small ink-2 measure">{t('today4.dueBody')}</p>
              <div><Button size="sm" variant="secondary" onClick={() => nav('followups')}>{t('today4.dueAction')}</Button></div>
            </div>
          </div>
        </Sheet>
      )}

      {recent.length > 0 && (
        <section className="stack-tight">
          <div className="row-between">
            <h2 className="t-title">{t('today4.recent')}</h2>
            <button className="text-action" type="button" onClick={() => nav('work')}>{t('today4.openWork')}</button>
          </div>
          <div className="piece-list">
            {recent.slice(0, 3).map((session) => (
              <button
                type="button"
                className="piece-row"
                key={session.id}
                onClick={() => nav(studentDestination(session), { sessionId: session.id })}
              >
                <span className="piece-glyph" data-pack={session.packId} aria-hidden />
                <span className="stack-nano grow minw0">
                  <strong className="t-body truncate">{session.title}</strong>
                  <span className="t-small ink-3 row wrap">
                    <span>{getPack(session.packId).shortName}</span>
                    {session.occasionAt && <><span aria-hidden>·</span><span>{formatDate(session.occasionAt, lang)}</span></>}
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      {first && !completedExample && (
        <section className="sample-ribbon stack-tight">
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <CalendarClock size={16} aria-hidden />
            <span className="t-micro ink-3">{t('today4.sample')}</span>
          </div>
          <button className="sample-ribbon-card" type="button" onClick={trySample}>
            <Tag mono>{getPack(SAMPLES[0].packId).shortName}</Tag>
            <span className="grow t-body-strong">{SAMPLES[0].title}</span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </section>
      )}

      {remembered && !unfinished && !first && <span className="visually-hidden">{remembered.title}</span>}
    </div>
  );
}
