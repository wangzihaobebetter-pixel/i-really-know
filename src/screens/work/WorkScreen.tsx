import React from 'react';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { selectRealSessions, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Sheet, Tag } from '../../ui';
import { getPack } from '../../packs';

interface PieceGroup { key: string; title: string; sessions: ReturnType<typeof useStore.getState>['sessions'] }

export default function WorkScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore(selectRealSessions).filter((session) => !session.sampleId);
  const grouped = new Map<string, PieceGroup>();
  for (const session of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = session.title.trim().toLocaleLowerCase();
    const group = grouped.get(key) ?? { key, title: session.title, sessions: [] };
    group.sessions.push(session);
    grouped.set(key, group);
  }
  const pieces = [...grouped.values()];

  return (
    <div className="col-read stack page-enter" data-testid="work-screen">
      <header className="stack-tight">
        <span className="t-micro ink-accent">{t('work4.eyebrow')}</span>
        <h1 className="t-sentence">{t('work4.title')}</h1>
        <p className="t-body-lg ink-2 measure">{t('work4.body')}</p>
      </header>

      {!pieces.length ? (
        <Sheet elevation={0} className="quiet-empty" padding="var(--space-7)">
          <FileText size={28} aria-hidden />
          <p className="t-body ink-2 measure">{t('work4.empty')}</p>
          <Button variant="primary" icon={<Plus size={17} />} onClick={() => nav('bring')}>{t('work4.bring')}</Button>
        </Sheet>
      ) : (
        <div className="work-grid">
          {pieces.map((piece) => {
            const latest = piece.sessions[0];
            const completed = piece.sessions.filter((session) => session.status === 'complete').length;
            return (
              <button className="work-card" type="button" key={piece.key} onClick={() => nav('workDetail', { sessionId: latest.id })}>
                <span className="work-card-rule" data-pack={latest.packId} aria-hidden />
                <span className="row-between">
                  <Tag mono>{getPack(latest.packId).shortName}</Tag>
                  <ArrowRight size={18} aria-hidden />
                </span>
                <strong className="t-title">{piece.title}</strong>
                <span className="t-small ink-3">
                  {completed} {lang === 'zh-CN' ? '次完成' : 'complete'} · {piece.sessions.reduce((sum, session) => sum + session.probes.length, 0)} {lang === 'zh-CN' ? '道问题' : 'questions'}
                </span>
                <span className="t-small ink-2">{latest.status === 'complete' ? t('work4.open') : t('work4.incomplete')}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
