import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { selectRealSessions, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button } from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { PieceDetail } from './WorkDetailScreen';
import { formatDate } from '../../lib/session-ops';

interface PieceGroup { key: string; title: string; sessions: ReturnType<typeof useStore.getState>['sessions'] }

export default function WorkScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const openId = useRoute().params.sessionId;
  const all = useStore(selectRealSessions);
  /* 作业 says "你带来过的每一件东西", so a sample cannot sit in that list — the
     material was not theirs to bring. But hiding sample runs entirely left a
     keyless student, who had just finished a whole run-through, looking at
     "这里还没有你的东西". They get their own shelf, named for what they are. */
  const sessions = all.filter((session) => !session.sampleId);
  const tried = all
    .filter((session) => session.sampleId && session.status === 'complete')
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const grouped = new Map<string, PieceGroup>();
  for (const session of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = session.parentSessionId ?? session.id;
    const group = grouped.get(key) ?? { key, title: session.title, sessions: [] };
    group.sessions.push(session);
    grouped.set(key, group);
  }
  const pieces = [...grouped.values()];

  /* 作业 has two states, not two screens. */
  if (openId) return <PieceDetail sessionId={openId} />;

  return (
    <div className="col-read work-v5 page-enter" data-testid="work-screen">
      <header className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></header>
      <section className="return-surface-opening">
        <span className="v5-eyebrow">{t('work4.eyebrow')}</span>
        <h1>{t('work4.title')}</h1>
        <p>{lang === 'zh-CN' ? '每一份东西都留着标过的原文、你站住的话，以及下一次要进的房。' : 'Every piece keeps its marked page, the words that held, and the next room it is for.'}</p>
      </section>

      {!pieces.length ? (
        <section className="work-empty-v5">
          <span className="empty-loop" aria-hidden><i /></span>
          <h2>{lang === 'zh-CN' ? '这里还没有你的东西。' : 'None of your work is here yet.'}</h2>
          <p>{t('work4.empty')}</p>
          <Button variant="primary" icon={<Plus size={17} />} onClick={() => nav('bring')}>{t('work4.bring')}</Button>
        </section>
      ) : (
        <div className="work-shelf-v5">
          {pieces.map((piece, pieceIndex) => {
            const latest = piece.sessions[0];
            const completed = piece.sessions.filter((session) => session.status === 'complete').length;
            const heldWord = latest.probes.find((probe) => ['defended', 'underclaimed'].includes(verdictOf(probe)) && probe.answer?.trim())?.answer;
            const held = latest.probes.filter((probe) => ['defended', 'underclaimed'].includes(verdictOf(probe))).length;
            const back = latest.probes.filter((probe) => ['partial', 'undefended'].includes(verdictOf(probe))).length;
            return (
              <button className="work-piece-v5" data-tone={pieceIndex % 3} type="button" key={piece.key} onClick={() => nav('work', { sessionId: latest.id })}>
                <span className="work-piece-top">
                  <span>{latest.occasionAt ? formatDate(latest.occasionAt, lang) : (lang === 'zh-CN' ? '没有日期' : 'No date')}</span>
                  <span>{completed} {lang === 'zh-CN' ? '遍' : completed === 1 ? 'run' : 'runs'}</span>
                </span>
                <strong>{piece.title}</strong>
                {heldWord ? <blockquote>“{heldWord}”</blockquote> : <p>{latest.status === 'complete' ? (lang === 'zh-CN' ? '打开标过的原文' : 'Open the marked page') : t('work4.incomplete')}</p>}
                <span className="work-piece-foot"><span>{held} {lang === 'zh-CN' ? '处站住' : 'held'}{back ? ` · ${back} ${lang === 'zh-CN' ? '处回来' : 'coming back'}` : ''}</span><ArrowRight size={19} /></span>
              </button>
            );
          })}
          <button className="work-add-v5" type="button" onClick={() => nav('bring')}><Plus size={19} />{t('work4.bring')}</button>
        </div>
      )}

      {tried.length > 0 && (
        <section className="work-tried-v5">
          <div className="v5-section-head">
            <h2>{lang === 'zh-CN' ? '你试过的样例' : 'Samples you tried'}</h2><span>{tried.length}</span>
          </div>
          {tried.map((session) => (
            <button className="tried-piece-v5" type="button" key={session.id} onClick={() => nav('result', { sessionId: session.id })}>
              <span><strong>{session.title}</strong><small>{lang === 'zh-CN' ? '打开标过的原文' : 'Open the marked page'}</small></span>
              <ArrowRight size={17} aria-hidden />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
