import React, { useMemo, useRef, useState } from 'react';
import { selectCohort, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useT } from '../../i18n';
import { Button, Callout } from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { exportElementPdf } from '../../lib/pdf';
import type { Probe, Session } from '../../types';

function conceptLabel(probe: Probe): string {
  const raw = probe.concept?.trim() || probe.reference.keyPoints[0]?.trim() || probe.question.trim();
  const clean = raw.replace(/^[•\-\s]+/, '').replace(/[.。:：].*$/, '').trim();
  if (clean.length <= 84) return clean;
  const clipped = clean.slice(0, 84).replace(/\s+\S*$/, '').trim();
  return `${clipped || clean.slice(0, 84)}…`;
}

function conceptKey(probe: Probe): string {
  return conceptLabel(probe).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export default function ReteachScreen() {
  const t = useT();
  const nav = useNavigate();
  const cohortId = useRoute().params.cohortId;
  const cohort = useStore(selectCohort(cohortId));
  const sessions = useStore((state) => state.sessions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [named, setNamed] = useState<Set<string>>(new Set());
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const documentRef = useRef<HTMLElement>(null);

  const runs: { label: string; session: Session }[] = useMemo(() => {
    if (!cohort) return [];
    return cohort.submissions
      .filter((submission) => !submission.result || submission.resultReview === 'reviewed')
      .map((submission) => ({ label: submission.studentName || submission.label, session: sessions.find((item) => item.id === submission.sessionId) }))
      .filter((item): item is { label: string; session: Session } => Boolean(item.session));
  }, [cohort, sessions]);

  const rows = useMemo(() => {
    const concepts = new Map<string, { label: string; students: Set<string>; spans: { who: string; quote: string; line?: string }[] }>();
    for (const run of runs) {
      for (const probe of run.session.probes) {
        const outcome = verdictOf(probe);
        if (outcome !== 'undefended' && outcome !== 'partial') continue;
        const key = conceptKey(probe);
        if (!key) continue;
        const item = concepts.get(key) ?? { label: conceptLabel(probe), students: new Set<string>(), spans: [] };
        item.students.add(run.label);
        item.spans.push({ who: run.label, quote: probe.anchor.quote, line: probe.ai?.verdictLine });
        concepts.set(key, item);
      }
    }
    return [...concepts.entries()]
      .map(([key, value]) => ({ key, label: value.label, count: value.students.size, spans: value.spans }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [runs]);

  if (!cohort) {
    return <div className="col-read"><Callout tone="danger" title={t('common.state.notfound.title')}><Button onClick={() => nav('class')}>{t('common.action.back')}</Button></Callout></div>;
  }

  async function downloadPdf() {
    if (!documentRef.current || !cohort) return;
    setPdfBusy(true);
    setPdfError('');
    try { await exportElementPdf(documentRef.current, `${cohort.name}-reteach-map.pdf`); }
    catch { setPdfError(t('teacher4.pdfError')); }
    finally { setPdfBusy(false); }
  }

  const peak = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="col-doc stack">
      <div className="row-between no-print">
        <Button variant="ghost" onClick={() => nav('cohort', { cohortId: cohort.id })}>{t('common.action.back')}</Button>
        <div className="row wrap">
          <Button variant="secondary" onClick={() => window.print()}>{t('sheet.print')}</Button>
          <Button variant="primary" disabled={pdfBusy} onClick={() => void downloadPdf()}>{pdfBusy ? t('teacher4.pdfMaking') : t('teacher4.pdf')}</Button>
        </div>
      </div>
      {pdfError && <Callout tone="danger">{pdfError}</Callout>}

      <article className="doc" ref={documentRef}>
        <header className="doc-masthead">
          <p className="t-micro">{t('reteach.title')}</p>
          <h1 className="t-title">{cohort.name}</h1>
          <p className="t-small ink-2 measure">{t('teacher4.conceptNote')}</p>
        </header>

        {cohort.isDemo && <p className="doc-method t-small">{t('sheet.illustrative')}</p>}

        {!runs.length || !rows.length ? <p className="t-body ink-2">{t('reteach.empty')}</p> : (
          <section>
            <div className="row-between wrap"><h2 className="t-micro">{t('teacher4.concepts')}</h2><span className="t-small ink-3">{runs.length} {t('class.submissions').toLowerCase()}</span></div>
            <div className="concept-map">
              {rows.map((row) => {
                const open = expanded === row.key;
                const showNames = named.has(row.key);
                return (
                  <div className="concept-row" key={row.key}>
                    <div className="concept-heading">
                      <div className="concept-bar" style={{ width: `${Math.max(18, (row.count / peak) * 100)}%` }} />
                      <div className="row-between"><strong>{row.label}</strong><span className="concept-count">{row.count}</span></div>
                    </div>
                    <div className="row wrap">
                      <span className="t-small ink-2">{t('reteach.countLine', { n: row.count, m: runs.length })}</span>
                      <button type="button" className="text-action no-print" onClick={() => setExpanded(open ? null : row.key)}>{open ? t('reteach.collapse') : t('reteach.expand')}</button>
                    </div>
                    {open && (
                      <div className="concept-evidence stack-tight">
                        <div className="row-between"><span className="t-micro ink-3">{t('reteach.deidentified')}</span><button type="button" className="text-action no-print" onClick={() => setNamed((previous) => { const next = new Set(previous); if (next.has(row.key)) next.delete(row.key); else next.add(row.key); return next; })}>{showNames ? t('reteach.hideNames') : t('reteach.showNames')}</button></div>
                        {row.spans.map((span, index) => <blockquote className="doc-quote" key={index}>{showNames && <span className="t-micro ink-2">{span.who} · </span>}{span.quote}{span.line && <footer className="t-small ink-2">{span.line}</footer>}</blockquote>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
