import React from 'react';
import { useStore, selectCohort } from '../../store';
import { dimensionLabel } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT } from '../../i18n';
import { Button, Callout, Mark, ScorePip, Sheet } from '../../ui';
import { verdictOf } from '../../lib/analysis';

export default function StudentSheetScreen() {
  const t = useT();
  const nav = useNavigate();
  const { cohortId, submissionId } = useRoute().params;

  const cohort = useStore(selectCohort(cohortId));
  const submission = cohort?.submissions.find((s) => s.id === submissionId);
  const session = useStore((s) => s.sessions.find((x) => x.id === submission?.sessionId));

  if (!cohort || !submission || !session) {
    return (
      <div className="col-read stack">
        <Callout tone="borrowed" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('class')}>{t('common.action.back')}</Button>
        </Callout>
      </div>
    );
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <h1 className="t-display-2">{submission.label}</h1>
        <span className="t-small ink-3">{cohort.name}</span>
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
            <p className="t-small ink-2 measure">{p.whyThisProbe}</p>
          </div>
        </Sheet>
      ))}

      <div className="row wrap">
        <Button variant="ghost" onClick={() => nav('cohort', { cohortId: cohort.id })}>{t('common.action.back')}</Button>
      </div>
    </div>
  );
}
