import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, RotateCcw, X } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { AnchoredText, Button, Mark, Sheet } from '../../ui';
import type { TextAnchor } from '../../ui';
import { countVerdicts, divergence, verdictOf } from '../../lib/analysis';
import { formatDate, targetsFromSession } from '../../lib/session-ops';
import type { Probe, ResultTicket, Verdict } from '../../types';
import { resultLink } from '../../lib/student-links';

const GROUPS: { verdict: Verdict; key: 'more' | 'held' | 'half' | 'slipped' }[] = [
  { verdict: 'underclaimed', key: 'more' },
  { verdict: 'defended', key: 'held' },
  { verdict: 'partial', key: 'half' },
  { verdict: 'undefended', key: 'slipped' },
];

function occasionLabel(value: string | undefined, t: ReturnType<typeof useT>) {
  switch (value) {
    case 'lab': return t('bring4.occasionLab');
    case 'defense': return t('bring4.occasionDefense');
    case 'review': return t('bring4.occasionReview');
    case 'exam': return t('bring4.occasionExam');
    case 'other': return t('bring4.occasionOther');
    default: return value || t('bring4.occasionOther');
  }
}

function leadQuote(value: string, max = 190) {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, '')}…` : clean;
}

function ProbeRow({ probe }: { probe: Probe }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const verdict = verdictOf(probe);
  const line = probe.ai?.verdictLine ?? (probe.manualScore !== undefined ? t(`common.verdict.${verdict}`) : '');
  return (
    <article className="result-probe" data-verdict={verdict}>
      <button type="button" className="result-probe-head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Mark verdict={verdict} />
        <span className="grow result-probe-copy">
          <span className="t-body-strong">{line || probe.question}</span>
          <small>{t(probe.ai ? 'result4.modelMarked' : 'result4.selfMarked')}</small>
        </span>
        <ChevronDown size={18} aria-hidden />
      </button>
      {open && (
        <div className="result-probe-body stack-tight m-page-turn-in">
          <p className="t-small ink-3">{probe.question}</p>
          {probe.answer && <blockquote className="answer-quote">“{probe.answer}”</blockquote>}
          <details>
            <summary className="t-small ink-2">{t('result4.reference')}</summary>
            <ul className="reference-list">
              {probe.reference.keyPoints.map((point, index) => <li key={index} className="t-small">{point}</li>)}
            </ul>
          </details>
        </div>
      )}
    </article>
  );
}

export default function ResultScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const queue = useStore((state) => state.queue);
  const addTargets = useStore((state) => state.addTargets);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [returnUrl, setReturnUrl] = useState('');
  const [returnError, setReturnError] = useState('');

  const anchors: TextAnchor[] = useMemo(() => session?.probes
    .filter((probe) => probe.anchor.placed && probe.anchor.start !== undefined && probe.anchor.end !== undefined)
    .map((probe) => ({ id: probe.id, start: probe.anchor.start!, end: probe.anchor.end!, verdict: verdictOf(probe) })) ?? [], [session]);

  useEffect(() => {
    if (!session || session.status !== 'complete') return;
    addTargets(targetsFromSession(session));
  }, [session, addTargets]);

  if (!session) {
    return <div className="col-read stack"><p>{t('common.state.notfound.title')}</p><Button onClick={() => nav('today')}>{t('common.state.notfound.action')}</Button></div>;
  }

  const counts = countVerdicts(session.probes);
  const held = counts.defended + counts.underclaimed;
  const back = counts.partial + counts.undefended;
  const answered = session.probes.filter((probe) => probe.committedAt).length;
  const scheduled = queue.filter((target) => target.sessionId === session.id).length || back;
  const read = divergence(session.probes);
  const heldWords = session.probes
    .map((probe, index) => ({ probe, index }))
    .filter(({ probe }) => ['defended', 'underclaimed'].includes(verdictOf(probe)) && probe.answer?.trim());
  const attemptWord = session.probes
    .map((probe, index) => ({ probe, index }))
    .find(({ probe }) => probe.answer?.trim());
  const occasion = occasionLabel(session.occasion, t);
  const date = session.occasionAt ? formatDate(session.occasionAt, lang) : '—';
  const takeaway = answered > 0 && held === answered
    ? t('v5.resultAllHeld')
    : held === 0
      ? t(back === 1 ? 'v5.resultNoneOne' : 'v5.resultNone', { back })
      : t('v5.resultMixed', { held, back });
  const readLine = !read ? '' : read.direction === 'under'
    ? t('v5.readUnder')
    : read.direction === 'over'
      ? t('v5.readOver')
      : t('v5.readClose');

  async function prepareReturn() {
    if (!session?.cohortId || !session.submissionId) return;
    setReturnError('');
    const ticket: ResultTicket = {
      v: 2,
      kind: 'result',
      cohortId: session.cohortId,
      submissionId: session.submissionId,
      probes: session.probes.map((probe) => ({
        id: probe.id,
        answer: probe.answer,
        answerMode: probe.answerMode,
        committedAt: probe.committedAt,
        selfGrade: probe.selfGrade,
        manualScore: probe.manualScore,
        ai: probe.ai,
        divergence: probe.divergence,
      })),
      at: session.completedAt ?? Date.now(),
    };
    try {
      const link = await resultLink(ticket);
      setReturnUrl(link);
      try { await navigator.clipboard.writeText(link); } catch { /* visible fallback below */ }
    } catch {
      setReturnError(t('result4.returnError'));
    }
  }

  return (
    <div className="col-doc result-v5 page-enter" data-testid="result-screen">
      <header className="result-v5-top">
        <span className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{lang === 'zh-CN' ? '这一遍' : 'This run-through'}</strong></span>
        <button type="button" onClick={() => nav('today')} aria-label={t('v5.doneAction')}><X size={20} /></button>
      </header>

      <section className="result-takeaway">
        <span className="v5-eyebrow">{t('v5.resultEyebrow')}</span>
        <h1>{takeaway}</h1>
        <p>{t('v5.resultFrame', { title: session.title, occasion, date })}</p>
      </section>

      {heldWords[0] && (
        <section className="held-voice-card">
          <span>{t('v5.ownWords')}</span>
          <blockquote>“{leadQuote(heldWords[0].probe.answer!)}”</blockquote>
          <small>{t('v5.ownWordsFrom', { n: heldWords[0].index + 1 })}</small>
        </section>
      )}

      {!heldWords[0] && attemptWord && (
        <section className="attempt-voice-card" data-verdict={verdictOf(attemptWord.probe)}>
          <span>{t('v5.attemptWords')}</span>
          <blockquote>“{leadQuote(attemptWord.probe.answer!)}”</blockquote>
          <small>{t('v5.attemptFrom', { n: attemptWord.index + 1 })}</small>
        </section>
      )}

      <section className="result-marked-v5">
        <div className="result-marked-head">
          <h2>{t('v5.markedPage')}</h2>
          <span>{t('v5.markedHint')}</span>
        </div>
        <AnchoredText
          text={session.material}
          mode={session.materialKind === 'code' ? 'code' : 'prose'}
          anchors={anchors}
          activeId={activeId}
          onAnchorClick={(id) => setActiveId(id === activeId ? undefined : id)}
          staggered
        />
        {activeId && (() => {
          const probe = session.probes.find((item) => item.id === activeId);
          return probe ? <div className="marked-margin"><ProbeRow probe={probe} /></div> : null;
        })()}
      </section>

      {read && (
        <section className="self-read-v5">
          <h2>{t('v5.readTitle')}</h2>
          <p>{readLine}</p>
          <details>
            <summary>{lang === 'zh-CN' ? '看刚才的两边' : 'See both sides'}</summary>
            <div className="self-read-pair">
              <div><span>{lang === 'zh-CN' ? '你当时觉得' : 'You expected'}</span><strong>{read.claimed}</strong></div>
              <ArrowRight size={18} aria-hidden />
              <div><span>{lang === 'zh-CN' ? '实际站住' : 'Actually held'}</span><strong>{read.defended}</strong></div>
            </div>
          </details>
        </section>
      )}

      {scheduled > 0 && (
        <section className="return-promise-v5">
          <span aria-hidden><RotateCcw size={21} /></span>
          <div>
            <h2>{t(scheduled === 1 ? 'v5.comingBack' : 'v5.comingBackMany', { n: scheduled })}</h2>
            <p>{t('v5.comingBackBody')}</p>
          </div>
        </section>
      )}

      {!session.probes.some((probe) => probe.ai) && (
        <details className="keyless-honesty-v5"><summary>{lang === 'zh-CN' ? '这一遍由谁做的判断？' : 'Who made the marks?'}</summary><p>{t('result4.keyless')}</p></details>
      )}

      <details className="result-all-v5">
        <summary>{t('v5.detailsTitle')}<ChevronDown size={18} /></summary>
        <div className="result-groups stack">
          {GROUPS.map(({ verdict, key }) => {
            const probes = session.probes.filter((probe) => verdictOf(probe) === verdict);
            if (!probes.length) return null;
            return (
              <section className="result-group stack-tight" data-verdict={verdict} key={verdict}>
                <div className="row-between"><h2 className="result-group-heading t-title">{t(`result4.${key}`)}</h2><span className="count-chip">{probes.length}</span></div>
                {probes.map((probe) => <ProbeRow key={probe.id} probe={probe} />)}
              </section>
            );
          })}
          {heldWords.slice(1).map(({ probe, index }) => <blockquote className="more-held-word" key={probe.id}>“{probe.answer}”<small>{t('v5.ownWordsFrom', { n: index + 1 })}</small></blockquote>)}
        </div>
      </details>

      {session.mode === 'viva' && session.cohortId && session.submissionId && (
        <Sheet elevation={1} className="return-result-card" padding="var(--space-6)">
          <div className="stack-tight">
            <h2 className="t-title">{t('result4.returnTitle')}</h2>
            <p className="t-small ink-2 measure">{t('result4.returnBody')}</p>
            <div><Button variant="secondary" onClick={() => void prepareReturn()}>{t('result4.returnAction')}</Button></div>
            {returnUrl && <textarea className="control" rows={4} readOnly value={returnUrl} onFocus={(event) => event.currentTarget.select()} aria-label={t('result4.returnTitle')} />}
            {returnError && <p className="t-small ink-3">{returnError}</p>}
          </div>
        </Sheet>
      )}

      <section className="ending-v5">
        <h2>{t('v5.doneTitle')}</h2>
        <p>{t('v5.doneBody')}</p>
        <button type="button" onClick={() => nav('today')}>{t('v5.doneAction')}<ArrowRight size={18} /></button>
      </section>
    </div>
  );
}
