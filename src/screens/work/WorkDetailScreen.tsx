import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { AnchoredText, Button, Mark, Sheet, Tag } from '../../ui';
import type { TextAnchor } from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { getPack } from '../../packs';
import { formatDate, studentDestination } from '../../lib/session-ops';

export default function WorkDetailScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const sessions = useStore((state) => state.sessions);
  const [activeId, setActiveId] = useState<string | undefined>();

  const anchors: TextAnchor[] = useMemo(() => session?.probes
    .filter((probe) => probe.anchor.placed && probe.anchor.start !== undefined && probe.anchor.end !== undefined)
    .map((probe) => ({ id: probe.id, start: probe.anchor.start!, end: probe.anchor.end!, verdict: verdictOf(probe) })) ?? [], [session]);

  if (!session) return <div className="col-read stack"><p>{t('common.state.notfound.title')}</p><Button onClick={() => nav('work')}>{t('common.action.back')}</Button></div>;
  const history = sessions
    .filter((candidate) => candidate.title.trim().toLocaleLowerCase() === session.title.trim().toLocaleLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
  const activeProbe = session.probes.find((probe) => probe.id === activeId);

  return (
    <div className="col-doc stack page-enter" data-testid="work-detail-screen">
      <button type="button" className="text-action row" onClick={() => nav('work')}><ArrowLeft size={16} />{t('common.action.back')}</button>
      <header className="stack-tight">
        <div className="row wrap"><Tag mono>{getPack(session.packId).shortName}</Tag><span className="t-small ink-3">{history.length} {lang === 'zh-CN' ? '次过一遍' : 'run-throughs'}</span></div>
        <h1 className="t-sentence">{session.title}</h1>
        {session.occasionAt && <p className="t-small ink-3">{formatDate(session.occasionAt, lang)}</p>}
      </header>

      <section className="stack-tight">
        <h2 className="t-title">{t('result4.page')}</h2>
        <p className="t-small ink-3 measure">{t('result4.pageHint')}</p>
        <Sheet elevation={0} className="marked-page" padding="var(--space-6)">
          <AnchoredText
            text={session.material}
            mode={session.materialKind === 'code' ? 'code' : 'prose'}
            anchors={anchors}
            activeId={activeId}
            onAnchorClick={(id) => setActiveId(id === activeId ? undefined : id)}
          />
          {activeProbe && (
            <div className="marked-margin stack-tight">
              <Mark verdict={verdictOf(activeProbe)} />
              <p className="t-small">{activeProbe.question}</p>
              {activeProbe.answer && <blockquote className="answer-quote">“{activeProbe.answer}”</blockquote>}
            </div>
          )}
        </Sheet>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{lang === 'zh-CN' ? '历史' : 'History'}</h2>
        <div className="history-list">
          {history.map((item) => (
            <button type="button" className="history-row" key={item.id} onClick={() => nav('workDetail', { sessionId: item.id })} aria-current={item.id === session.id}>
              <span>{formatDate(item.completedAt ?? item.createdAt, lang)}</span>
              <span className="ink-3">{item.probes.filter((probe) => probe.committedAt).length} / {item.probes.length}</span>
              <ArrowRight size={16} aria-hidden />
            </button>
          ))}
        </div>
      </section>

      {session.status === 'complete'
        ? <Button variant="primary" onClick={() => nav('result', { sessionId: session.id })}>{t('work4.open')}</Button>
        : <Button variant="primary" onClick={() => nav(studentDestination(session), { sessionId: session.id })}>{t('work4.incomplete')}</Button>}
    </div>
  );
}
