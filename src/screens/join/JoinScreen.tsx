import React, { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useNavigate, useRoute } from '../../router';
import { useT } from '../../i18n';
import { Button, Spinner } from '../../ui';
import { decodeStudentTicket } from '../../lib/student-links';
import { id, now } from '../../lib/ids';
import { useStore } from '../../store';
import type { StudentTicket } from '../../types';

export default function JoinScreen() {
  const t = useT();
  const nav = useNavigate();
  const encoded = useRoute().params.ticket;
  const upsertSession = useStore((state) => state.upsertSession);
  const setUi = useStore((state) => state.setUi);
  const [ticket, setTicket] = useState<StudentTicket | null>(null);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    let current = true;
    void decodeStudentTicket(encoded)
      .then((value) => {
        if (!current) return;
        setTicket(value);
        if (value.session.occasionAt) setDate(new Date(value.session.occasionAt).toISOString().slice(0, 10));
      })
      .catch(() => { if (current) setError(t('join4.bad')); });
    return () => { current = false; };
  }, [encoded, t]);

  function importTicket() {
    if (!ticket || !date) return;
    const sessionId = id('s');
    const session = {
      ...ticket.session,
      id: sessionId,
      createdAt: now(),
      completedAt: undefined,
      status: 'ready' as const,
      mode: 'viva' as const,
      cohortId: ticket.cohortId,
      submissionId: ticket.submissionId,
      occasion: ticket.session.occasion || 'class',
      occasionAt: new Date(`${date}T12:00:00`).getTime(),
      probes: ticket.session.probes.map((probe) => ({
        ...probe,
        id: probe.id,
        answer: undefined,
        answerMode: undefined,
        committedAt: undefined,
        timeUsedSec: undefined,
        selfGrade: undefined,
        manualScore: undefined,
        ai: undefined,
        divergence: undefined,
      })),
    };
    upsertSession(session);
    setUi({ firstOpenSeen: true });
    nav('run', { sessionId });
  }

  if (error) {
    return <main className="welcome-screen"><div className="welcome-stage stack"><h1 className="t-sentence">{error}</h1><Button onClick={() => nav('today')}>{t('join4.back')}</Button></div></main>;
  }
  if (!ticket) {
    return <main className="welcome-screen"><div className="welcome-stage"><Spinner label={t('join4.opening')} /></div></main>;
  }

  return (
    <main className="welcome-screen join-screen page-enter" data-testid="join-screen">
      <div className="welcome-stage stack">
        <span className="t-micro ink-accent">{t('join4.eyebrow')}</span>
        <span className="return-icon"><LockKeyhole size={22} /></span>
        <div className="stack-tight">
          <h1 className="t-sentence">{t('join4.title')}</h1>
          <p className="t-body-lg ink-2 measure">{t('join4.body')}</p>
        </div>
        <div className="join-piece">
          <span className="t-micro ink-3">{ticket.session.title}</span>
          <blockquote>{ticket.session.material.slice(0, 260)}{ticket.session.material.length > 260 ? '…' : ''}</blockquote>
        </div>
        {!ticket.session.occasionAt && (
          <label className="stack-tight">
            <span className="field-label">{t('join4.dateMissing')}</span>
            <input className="control" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        )}
        <Button size="lg" variant="primary" iconRight={<ArrowRight size={18} />} disabled={!date} onClick={importTicket}>{t('join4.import')}</Button>
      </div>
    </main>
  );
}
