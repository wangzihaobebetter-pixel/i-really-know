import React, { useRef, useState } from 'react';
import { useStore, selectCohort } from '../../store';
import { dimensionLabel } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { AnchoredText, Button, Callout, Mark, MarginNote } from '../../ui';
import { divergence, verdictOf } from '../../lib/analysis';
import { formatDate } from '../../lib/session-ops';
import { exportElementPdf } from '../../lib/pdf';

/**
 * THE EVIDENCE SHEET (P3 §5.3). One per student.
 *
 * Register, stated once and enforced everywhere in this file: this is an
 * INSTITUTIONAL DOCUMENT, not an app screen. One theme — print. Black on
 * white regardless of the app's theme, because a document that changes colour
 * with a dark-mode toggle is not a document. Reading tier only: no display
 * face, no rounded shapes, no glass, no springs, no state fills. Axis-A colour
 * appears as an underline and as chips in the key, and nowhere else.
 *
 * NO PERCENTAGE ANYWHERE, on purpose. A number is disputed on appeal; an
 * evidence row is read. (Corpus 05 §3.1 records OralExam.ai reaching the same
 * conclusion and shipping no percentage at all.)
 *
 * Every string on this surface passes `npm run verify:never-accuse`.
 */
export default function StudentSheetScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const documentRef = useRef<HTMLElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const { cohortId, submissionId } = useRoute().params;

  const cohort = useStore(selectCohort(cohortId));
  const submission = cohort?.submissions.find((s) => s.id === submissionId);
  const session = useStore((s) => s.sessions.find((x) => x.id === submission?.sessionId));
  const updateSubmission = useStore((s) => s.updateSubmission);

  if (!cohort || !submission || !session) {
    return (
      <div className="col-read stack">
        <Callout tone="danger" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('class')}>{t('common.action.back')}</Button>
        </Callout>
      </div>
    );
  }

  const div = divergence(session.probes);
  const probed = session.probes.filter((p) => p.committedAt || p.selfGrade || p.ai);
  const total = session.probes.length;

  /* "Declined to answer" is a claim about what the student did, so it is only
     used when they actually committed an empty answer through the viva — not
     merely because no transcript is attached. Saying both "no response
     recorded" and "declined to answer" about the same row, as an earlier build
     did, is two different claims about the same student. */
  const outcomeOf = (p: typeof session.probes[number]): string => {
    if (p.ai || p.selfGrade) return t(`common.verdict.${verdictOf(p)}`);
    if (p.committedAt && p.answerMode && !p.answer?.trim()) return t('sheet.declined');
    return t('sheet.noAnswer');
  };

  const claimOf = (p: typeof session.probes[number]): string =>
    p.selfGrade === 'owned' ? t('viva.selfOwned')
      : p.selfGrade === 'shaky' ? t('viva.selfShaky')
      : p.selfGrade === 'notmine' ? t('viva.selfNotmine')
      : t('sheet.notClaimed');

  async function downloadPdf() {
    if (!documentRef.current || !submission) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      await exportElementPdf(documentRef.current, `${submission.studentName || submission.label}-evidence-sheet.pdf`);
    } catch {
      setPdfError(t('teacher4.pdfError'));
    } finally {
      setPdfBusy(false);
    }
  }

  function markReviewed() {
    if (!cohort || !submission) return;
    updateSubmission(cohort.id, submission.id, { resultReview: 'reviewed', resultReviewedAt: Date.now() });
  }

  return (
    <div className="col-doc stack">
      <div className="row-between no-print">
        <Button variant="ghost" onClick={() => nav('cohort', { cohortId: cohort.id })}>
          {t('common.action.back')}
        </Button>
        <div className="row wrap">
          <Button variant="secondary" onClick={() => window.print()}>{t('sheet.print')}</Button>
          <Button variant="primary" disabled={pdfBusy} onClick={() => void downloadPdf()}>{pdfBusy ? t('teacher4.pdfMaking') : t('teacher4.pdf')}</Button>
        </div>
      </div>
      {pdfError && <Callout tone="danger">{pdfError}</Callout>}
      {submission.result && submission.resultReview !== 'reviewed' && (
        <Callout
          tone="action"
          title={t('teacher4.reviewTitle')}
          action={<Button size="sm" onClick={markReviewed}>{t('teacher4.reviewAction')}</Button>}
        >
          {t('teacher4.reviewBody')}
        </Callout>
      )}

      <article className="doc" ref={documentRef}>
        {/* 1 — Masthead */}
        <header className="doc-masthead">
          <p className="t-micro" style={{ letterSpacing: '.08em' }}>{t('sheet.title')}</p>
          <h1 className="t-title" style={{ marginTop: 'var(--space-2)' }}>{submission.label}</h1>
          <dl className="t-small" style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 'var(--space-5)', rowGap: 'var(--space-2)' }}>
            <dt className="t-micro">{t('sheet.course')}</dt><dd>{cohort.name}</dd>
            <dt className="t-micro">{t('sheet.student')}</dt><dd>{submission.studentName || submission.label}{submission.studentRef ? ` · ${submission.studentRef}` : ''}</dd>
            <dt className="t-micro">{t('sheet.date')}</dt><dd>{formatDate(session.completedAt ?? session.createdAt, lang)}</dd>
          </dl>
        </header>

        {cohort.isDemo && (
          <p className="doc-demo-note t-small" style={{ marginBottom: 'var(--space-5)' }}>
            {t('sheet.illustrative')}
          </p>
        )}

        {submission.result && (
          <p className="doc-review-note t-small" style={{ marginBottom: 'var(--space-5)' }}>
            {submission.resultReview === 'reviewed' && submission.resultReviewedAt
              ? t('teacher4.docReviewed', { date: formatDate(submission.resultReviewedAt, lang) })
              : t('teacher4.docUnverified')}
          </p>
        )}

        {/* 2 — The method statement. Always present. This paragraph is what
               makes the sheet survive an appeal, and it is the document's most
               important element (P3 §5.3.2). */}
        <section className="doc-method doc-method-statement">
          <p className="t-micro">{t('sheet.methodTitle')}</p>
          <p className="t-small" style={{ marginTop: 'var(--space-3)' }}>{t('sheet.method')}</p>
        </section>

        {/* 3 — Calibration in text, no chart. */}
        {div && (
          <section style={{ marginTop: 'var(--space-6)' }}>
            <h2 className="t-micro">{t('sheet.calibrationTitle')}</h2>
            <p className="t-body" style={{ marginTop: 'var(--space-3)' }}>
              {t('sheet.calibrationLine', {
                claimed: div.claimed,
                defended: div.defended,
                total: div.scored,
                delta: div.delta > 0 ? `+${div.delta}` : String(div.delta),
              })}
            </p>
            <p className="t-small ink-2" style={{ marginTop: 'var(--space-3)' }}>
              {t('sheet.calibrationFootnote')}
            </p>
          </section>
        )}

        {/* 4 — Evidence rows. Verbatim on both sides is what makes this
               evidence rather than an assessment. */}
        <section style={{ marginTop: 'var(--space-7)' }}>
          <h2 className="t-micro">{t('sheet.rowsTitle')}</h2>
          {probed.length === 0 && <p className="t-small ink-2">{t('reteach.empty')}</p>}
          {probed.map((p, i) => (
            <div className="doc-row" key={p.id}>
              <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
                <span className="t-micro">{i + 1} · {dimensionLabel(session.packId, p.dimensionId)}</span>
                <Mark verdict={verdictOf(p)} />
              </div>

              <p className="t-micro ink-2" style={{ marginTop: 'var(--space-4)' }}>{t('sheet.rowSpan')}</p>
              <blockquote className="doc-quote">
                <AnchoredText
                  text={p.anchor.quote}
                  mode={session.materialKind === 'code' ? 'code' : 'prose'}
                  anchors={[{ id: p.id, start: 0, end: p.anchor.quote.length, verdict: verdictOf(p) }]}
                />
              </blockquote>

              <p className="t-micro ink-2">{t('sheet.rowProbe')}</p>
              <p className="t-body" style={{ marginBottom: 'var(--space-4)' }}>{p.question}</p>

              <p className="t-micro ink-2">{t('sheet.rowAnswer')}</p>
              <p className="t-body" style={{ marginBottom: 'var(--space-4)' }}>
                {p.answer?.trim() || t('sheet.noAnswer')}
              </p>

              <div className="row wrap" style={{ gap: 'var(--space-6)' }}>
                <span className="t-small"><span className="t-micro ink-2">{t('sheet.rowOutcome')}</span> · {outcomeOf(p)}</span>
                <span className="t-small"><span className="t-micro ink-2">{t('sheet.rowClaim')}</span> · {claimOf(p)}</span>
              </div>

              {p.ai?.verdictLine && (
                <MarginNote tone={verdictOf(p)} anchorId={p.id}>{p.ai.verdictLine}</MarginNote>
              )}
            </div>
          ))}
        </section>

        {/* 5 — Key */}
        <section style={{ marginTop: 'var(--space-7)' }}>
          <h2 className="t-micro">{t('sheet.keyTitle')}</h2>
          <div className="doc-key" style={{ marginTop: 'var(--space-3)' }}>
            <span className="doc-chip ink-defended">{t('map.keyDefended')}</span>
            <span className="doc-chip ink-partial">{t('map.keyPartial')}</span>
            <span className="doc-chip ink-undefended">{t('map.keyUndefended')}</span>
            <span className="doc-chip ink-underclaimed">{t('map.keyUnderclaimed')}</span>
          </div>
          <p className="t-small ink-2" style={{ marginTop: 'var(--space-4)' }}>{t('sheet.noPercentage')}</p>
        </section>

        {/* 6 — Sign-off. The AI never publishes (P3 §5.1). */}
        <section className="doc-signoff">
          <p className="t-micro">{t('sheet.signTitle')}</p>
          <p className="t-small ink-2" style={{ marginTop: 'var(--space-3)' }}>{t('sheet.signNote')}</p>
          <div className="row wrap" style={{ gap: 'var(--space-6)', marginTop: 'var(--space-3)' }}>
            <div className="grow"><div className="doc-signoff-line" /><span className="t-micro">{t('sheet.signName')}</span></div>
            <div style={{ width: '12rem' }}><div className="doc-signoff-line" /><span className="t-micro">{t('sheet.signDate')}</span></div>
          </div>
        </section>
      </article>
    </div>
  );
}
