import React, { useEffect, useState } from 'react';
import { ArrowRight, FileInput } from 'lucide-react';
import { useNavigate, useRoute } from '../../router';
import { useT } from '../../i18n';
import { Button, Callout, Sheet, Spinner } from '../../ui';
import { decodeResultTicket } from '../../lib/student-links';
import { calibration, ownershipIndex, withDivergence } from '../../lib/analysis';
import { useStore } from '../../store';
import type { ResultTicket } from '../../types';

export default function ReturnScreen() {
  const t = useT();
  const nav = useNavigate();
  const encoded = useRoute().params.ticket;
  const cohorts = useStore((state) => state.cohorts);
  const sessions = useStore((state) => state.sessions);
  const updateSession = useStore((state) => state.updateSession);
  const updateSubmission = useStore((state) => state.updateSubmission);
  const [ticket, setTicket] = useState<ResultTicket | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    void decodeResultTicket(encoded)
      .then((value) => { if (current) setTicket(value); })
      .catch(() => { if (current) setError(t('return4.bad')); });
    return () => { current = false; };
  }, [encoded, t]);

  const cohort = ticket ? cohorts.find((item) => item.id === ticket.cohortId) : undefined;
  const submission = cohort && ticket ? cohort.submissions.find((item) => item.id === ticket.submissionId) : undefined;
  const session = submission?.sessionId ? sessions.find((item) => item.id === submission.sessionId) : undefined;

  function importResult() {
    if (!ticket || !cohort || !submission || !session) return;
    const returned = new Map(ticket.probes.map((probe) => [probe.id, probe]));
    const exact = returned.size === session.probes.length && session.probes.every((probe) => returned.has(probe.id));
    if (!exact) {
      setError(t('return4.mismatch'));
      return;
    }
    const merged = withDivergence(session.probes.map((probe) => {
      const answer = returned.get(probe.id)!;
      return {
        ...probe,
        answer: answer.answer,
        answerMode: answer.answerMode,
        committedAt: answer.committedAt,
        selfGrade: answer.selfGrade,
        manualScore: answer.manualScore,
        ai: answer.ai,
        divergence: answer.divergence,
      };
    }));
    updateSession(session.id, {
      probes: merged,
      status: 'complete',
      completedAt: ticket.at,
      ownershipIndex: ownershipIndex(merged),
      calibration: calibration(merged),
    });
    updateSubmission(cohort.id, submission.id, {
      result: ticket,
      resultReview: 'unverified',
      resultReviewedAt: undefined,
    });
    nav('studentSheet', { cohortId: cohort.id, submissionId: submission.id });
  }

  if (error) {
    return <div className="col-read stack"><Callout tone="danger" title={error}><Button onClick={() => nav('class')}>{t('return4.back')}</Button></Callout></div>;
  }
  if (!ticket) return <div className="col-read"><Spinner label={t('return4.opening')} /></div>;
  if (!cohort || !submission || !session) {
    return <div className="col-read stack"><Callout tone="neutral" title={t('return4.notFound')}>{t('return4.notFoundBody')}</Callout><Button variant="secondary" onClick={() => nav('class')}>{t('return4.back')}</Button></div>;
  }

  return (
    <div className="col-read stack page-enter" data-testid="return-screen">
      <header className="stack-tight">
        <span className="return-icon"><FileInput size={22} /></span>
        <h1 className="t-display-2">{t('return4.title')}</h1>
        <p className="t-body ink-2 measure">{t('return4.body')}</p>
      </header>
      <Sheet elevation={1}>
        <div className="stack-tight">
          <span className="t-micro ink-3">{cohort.name}</span>
          <h2 className="t-title">{submission.studentName || submission.label}</h2>
          <p className="t-small ink-2">{submission.label} · {ticket.probes.length} {t('return4.answers')}</p>
        </div>
      </Sheet>
      <Button size="lg" variant="primary" iconRight={<ArrowRight size={18} />} onClick={importResult}>{t('return4.import')}</Button>
    </div>
  );
}
