import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookMarked, ChevronDown, RotateCcw } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { AnchoredText, Button, Mark, Sheet, Tag } from '../../ui';
import type { TextAnchor } from '../../ui';
import { countVerdicts, divergence, verdictOf } from '../../lib/analysis';
import { formatDate, targetsFromSession } from '../../lib/session-ops';
import type { Probe, ResultTicket, Verdict } from '../../types';
import { getPack } from '../../packs';
import { resultLink } from '../../lib/student-links';

const GROUPS: { verdict: Verdict; key: 'more' | 'held' | 'half' | 'slipped' }[] = [
  { verdict: 'underclaimed', key: 'more' },
  { verdict: 'defended', key: 'held' },
  { verdict: 'partial', key: 'half' },
  { verdict: 'undefended', key: 'slipped' },
];

function occasionLabel(value: string | undefined, t: ReturnType<typeof useT>) {
  const keys: Record<string, string> = {
    lab: 'bring4.occasionLab', defense: 'bring4.occasionDefense', review: 'bring4.occasionReview',
    exam: 'bring4.occasionExam', other: 'bring4.occasionOther',
  };
  return value ? (keys[value] ? t(keys[value]) : value) : t('bring4.occasionOther');
}

function ProbeRow({ probe }: { probe: Probe }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const verdict = verdictOf(probe);
  const line = probe.ai?.verdictLine
    ?? (probe.manualScore !== undefined ? t(`common.verdict.${verdict}`) : '');
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
  const queue = useStore((s) => s.queue);
  const addTargets = useStore((s) => s.addTargets);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [returnUrl, setReturnUrl] = useState('');
  const [returnError, setReturnError] = useState('');

  const anchors: TextAnchor[] = useMemo(() => session?.probes
    .filter((probe) => probe.anchor.placed && probe.anchor.start !== undefined && probe.anchor.end !== undefined)
    .map((probe) => ({
      id: probe.id,
      start: probe.anchor.start!,
      end: probe.anchor.end!,
      verdict: verdictOf(probe),
    })) ?? [], [session]);

  useEffect(() => {
    if (!session || session.status !== 'complete') return;
    const already = queue.some((target) => target.sessionId === session.id);
    if (!already) addTargets(targetsFromSession(session));
  }, [session, queue, addTargets]);

  if (!session) {
    return <div className="col-read stack"><p>{t('common.state.notfound.title')}</p><Button onClick={() => nav('today')}>{t('common.state.notfound.action')}</Button></div>;
  }

  const counts = countVerdicts(session.probes);
  const back = counts.partial + counts.undefended;
  const scheduled = queue.filter((target) => target.sessionId === session.id).length || back;
  const read = divergence(session.probes);
  const words = session.probes
    .filter((probe) => ['defended', 'underclaimed'].includes(verdictOf(probe)) && probe.answer?.trim())
    .map((probe) => probe.answer!.trim());
  const occasion = occasionLabel(session.occasion, t);
  const date = session.occasionAt ? formatDate(session.occasionAt, lang) : '—';
  const answered = session.probes.filter((probe) => probe.committedAt).length;

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
    <div className="col-doc stack result-page page-enter" data-testid="result-screen">
      <header className="result-header stack-tight">
        <span className="t-micro ink-accent">{t('result4.eyebrow')}</span>
        <h1 className="t-sentence">{t('result4.title')}</h1>
        <p className="t-small ink-3">{t('result4.frame', { occasion, date })}</p>
        <p className="result-sentence">
          {t('result4.summary', { held: counts.defended, more: counts.underclaimed, back })}
        </p>
        <div className="row wrap">
          <Tag mono>{getPack(session.packId).shortName}</Tag>
          {session.mode === 'sample' && <Tag>{lang === 'zh-CN' ? '真实来源示例' : 'Sourced example'}</Tag>}
        </div>
      </header>

      {!session.probes.some((probe) => probe.ai) && (
        <p className="honesty-line">{t('result4.keyless')}</p>
      )}

      <section className="result-groups stack">
        {GROUPS.map(({ verdict, key }) => {
          const probes = session.probes.filter((probe) => verdictOf(probe) === verdict);
          if (!probes.length) return null;
          return (
            <div className="result-group stack-tight" data-verdict={verdict} key={verdict}>
              <div className="row-between">
                <h2 className="result-group-heading t-title">{t(`result4.${key}`)}</h2>
                <span className="count-chip" aria-label={`${probes.length}`}>{probes.length}</span>
              </div>
              {probes.length ? probes.map((probe) => <ProbeRow key={probe.id} probe={probe} />) : <p className="t-small ink-3">{t('result4.none')}</p>}
            </div>
          );
        })}
      </section>

      <section className="stack-tight">
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <BookMarked size={19} aria-hidden />
          <h2 className="t-title">{t('result4.page')}</h2>
        </div>
        <p className="t-small ink-3 measure">{t('result4.pageHint')}</p>
        <Sheet elevation={0} className="marked-page" padding="var(--space-6)">
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
        </Sheet>
      </section>

      {read && (
        <section className="self-read-card stack-tight">
          <h2 className="t-title">{t('result4.yourRead')}</h2>
          <div className="self-read-pair">
            <div><span>{lang === 'zh-CN' ? '你当时觉得' : 'You expected'}</span><strong>{read.claimed}</strong></div>
            <ArrowRight size={20} aria-hidden />
            <div><span>{lang === 'zh-CN' ? '实际站住' : 'Actually held'}</span><strong>{read.defended}</strong></div>
          </div>
        </section>
      )}

      {words.length > 0 && (
        <section className="words-book stack-tight">
          <h2 className="t-title">{t('result4.yourWords')}</h2>
          {words.map((word, index) => <blockquote key={index}>“{word}”</blockquote>)}
        </section>
      )}

      {scheduled > 0 && (
        <div className="followup-promise row">
          <RotateCcw size={18} aria-hidden />
          <p className="t-small">{t('result4.followups', { n: scheduled })}</p>
        </div>
      )}

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

      <Sheet elevation={1} className="ending-card" padding="var(--space-7)">
        <div className="stack">
          <h2 className="t-sentence-small">{t('result4.doneTitle')}</h2>
          <p className="t-body ink-2 measure">{t('result4.doneBody', { answered })}</p>
          <div className="row wrap">
            <Button size="lg" variant="primary" iconRight={<ArrowRight size={18} />} onClick={() => nav('today')}>{t('result4.backToday')}</Button>
            <Button variant="ghost" onClick={() => nav('bring')}>{t('result4.again')}</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
