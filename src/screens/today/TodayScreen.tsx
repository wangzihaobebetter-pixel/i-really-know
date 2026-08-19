import React from 'react';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import { selectDueTargets, selectRealSessions, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { buildFeaturedSampleSession } from '../../samples';
import { formatDate, studentDestination } from '../../lib/session-ops';

function occasionText(value: string | undefined, lang: 'en' | 'zh-CN') {
  const labels: Record<string, [string, string]> = {
    lab: ['Lab meeting', '组会'],
    defense: ['Defence', '答辩'],
    review: ['Code review', '代码 review'],
    exam: ['Exam', '考试'],
    other: ['Just checking', '就想看看'],
  };
  const pair = value ? labels[value] : undefined;
  return pair ? pair[lang === 'zh-CN' ? 1 : 0] : (value || (lang === 'zh-CN' ? '就想看看' : 'Just checking'));
}

export default function TodayScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore(selectRealSessions);
  const due = useStore(selectDueTargets());
  const upsertSession = useStore((state) => state.upsertSession);
  const lastId = useStore((state) => state.ui.lastSessionId);

  const real = sessions.filter((session) => !session.sampleId);
  const recent = [...real].sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const unfinished = recent.find((session) => session.status !== 'complete');
  const remembered = sessions.find((session) => session.id === lastId) ?? recent[0];
  const completedExample = remembered?.sampleId && remembered.status === 'complete' ? remembered : undefined;
  const dueSession = sessions.find((session) => session.id === due[0]?.sessionId);
  const first = real.length === 0;
  const lead = unfinished ?? recent.find((session) => session.occasionAt && session.occasionAt > Date.now());
  const left = unfinished ? Math.max(0, unfinished.probes.length - unfinished.probes.filter((probe) => probe.committedAt).length) : 0;
  const leadMinutes = Math.max(2, Math.ceil(left * 1.6));

  function trySample() {
    const session = buildFeaturedSampleSession(lang);
    upsertSession(session);
    nav('run', { sessionId: session.id });
  }

  return (
    <div className="col-read today-v5 page-enter" data-testid="today-screen">
      <header className="product-wordmark" aria-label={t('v5.brand')}>
        <span className="living-mark" aria-hidden />
        <strong>{t('v5.brand')}</strong>
      </header>

      <section className="today-opening">
        <span className="v5-eyebrow">{first ? t('v5.todayFirstKicker') : t('v5.todayReturnKicker')}</span>
        <h1>{first ? t('v5.todayFirstTitle') : t('v5.todayReturnTitle')}</h1>
        <p>{first ? t('v5.todayFirstBody') : t('v5.todayReturnBody')}</p>
      </section>

      {lead ? (
        <button
          className="next-room-card"
          data-long={lead.title.length > 24}
          type="button"
          onClick={() => nav(studentDestination(lead), { sessionId: lead.id })}
        >
          <span className="next-room-top">
            <span className="room-date">
              {lead.occasionAt ? formatDate(lead.occasionAt, lang) : t('v5.nextRoom')} · {occasionText(lead.occasion, lang)}
            </span>
            {unfinished && <span>{t('v5.questionsLeft', { n: left })}</span>}
          </span>
          <span className="next-room-copy">
            <strong>{lead.title}</strong>
            <small>{unfinished
              ? (lang === 'zh-CN' ? '上次停下的地方已经替你留好' : 'Your place from last time is saved')
              : (lang === 'zh-CN' ? '标过的原文和站住的话都在' : 'Your marked page and held words are here')}</small>
          </span>
          <span className="room-orbit" aria-hidden><i /></span>
          <span className="room-commit">
            <span>{unfinished ? t('v5.continue', { n: leadMinutes }) : t('v5.openHeld')}</span>
            <ArrowRight size={21} aria-hidden />
          </span>
        </button>
      ) : (
        <button className="new-room-card" type="button" onClick={() => nav('bring')}>
          <span className="new-room-glyph" aria-hidden><Plus size={24} /></span>
          <span className="new-room-copy">
            <strong>{t('v5.newPieceTitle')}</strong>
            <small>{t('v5.newPieceBody')}</small>
          </span>
          <span className="new-room-action">{t('v5.newPieceAction')} <ArrowRight size={19} /></span>
        </button>
      )}

      {due.length > 0 && (
        <section className="today-kept">
          <div className="v5-section-head"><h2>{t('v5.remembered')}</h2><span>{due.length}</span></div>
          <button className="kept-question" type="button" onClick={() => nav('followups')}>
            <span className="return-tile" aria-hidden><RotateCcw size={21} /></span>
            <span className="kept-copy">
              <strong>{t('v5.dueDifferent')}</strong>
              <small>{t('v5.dueFrom', { title: dueSession?.title ?? remembered?.title ?? '' })}</small>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </section>
      )}

      {completedExample && !lead && (
        <button className="held-memory" type="button" onClick={() => nav('result', { sessionId: completedExample.id })}>
          <span className="held-memory-line" aria-hidden />
          <span><small>{lang === 'zh-CN' ? '刚才有一句站住了' : 'Something just held'}</small><strong>{completedExample.title}</strong></span>
          <ArrowRight size={18} aria-hidden />
        </button>
      )}

      {(lead || due.length > 0) && (
        <button className="bring-quiet" type="button" onClick={() => nav('bring')}>
          <Plus size={17} aria-hidden />{t('v5.bringNew')}
        </button>
      )}

      {first && !completedExample && (
        <button className="sample-invitation" type="button" onClick={trySample}>
          <span>{lang === 'zh-CN' ? '还不想交自己的？先过一份真实作业' : 'Not ready to bring yours? Try a real piece first'}</span>
          <ArrowRight size={17} aria-hidden />
        </button>
      )}

      {recent.length > 0 && (
        <section className="today-recent">
          <div className="v5-section-head"><h2>{lang === 'zh-CN' ? '最近带来的' : 'Recently brought'}</h2><button type="button" onClick={() => nav('work')}>{lang === 'zh-CN' ? '全部' : 'All'}</button></div>
          {recent.slice(0, 2).map((session) => (
            <button className="recent-piece" type="button" key={session.id} onClick={() => nav(studentDestination(session), { sessionId: session.id })}>
              <span><strong>{session.title}</strong><small>{occasionText(session.occasion, lang)}{session.occasionAt ? ` · ${formatDate(session.occasionAt, lang)}` : ''}</small></span>
              <ArrowRight size={17} aria-hidden />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
