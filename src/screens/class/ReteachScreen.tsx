import React, { useMemo, useState } from 'react';
import { useStore, selectCohort } from '../../store';
import { dimensionLabel } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT } from '../../i18n';
import { Button, Callout } from '../../ui';
import { divergence, verdictOf } from '../../lib/analysis';
import type { Session } from '../../types';

/**
 * THE RETEACH MAP (P3 §5.4). The artefact with no competitor equivalent, and
 * the reason an instructor tells a colleague about this product: it changes
 * what you teach next, not just who you grade.
 *
 * PANEL 1 RANKS CONCEPTS, NEVER PEOPLE. Corpus 04 §G and 03 §C2 (stereotype
 * threat, p = 0.046 in tech-oriented classrooms) both forbid ranking students;
 * ranking passages carries the whole pedagogical signal with none of that risk.
 * The one number per row is a count of people, not a correctness percentage.
 *
 * PANEL 2 is the reason the sign was kept. It separates two things every other
 * product blends:
 *   - a passage the class is OVERCONFIDENT about — they don't know it and
 *     don't know they don't. Reteach it.
 *   - a passage the class is UNDERCONFIDENT about — they do know it and don't
 *     trust it. That is a confidence and articulation problem, and reteaching
 *     the content is the wrong response.
 *
 * Presented descriptively and making no predictive claim in copy: corpus 03
 * §D3's forward-looking result was not fetched in full and its effect
 * direction is unverified, which the corpus itself says.
 */
export default function ReteachScreen() {
  const t = useT();
  const nav = useNavigate();
  const cohortId = useRoute().params.cohortId;
  const cohort = useStore(selectCohort(cohortId));
  const sessions = useStore((s) => s.sessions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [named, setNamed] = useState<Set<string>>(new Set());

  const runs: { label: string; session: Session }[] = useMemo(() => {
    if (!cohort) return [];
    return cohort.submissions
      .map((sub) => ({ label: sub.label, session: sessions.find((x) => x.id === sub.sessionId) }))
      .filter((x): x is { label: string; session: Session } => !!x.session);
  }, [cohort, sessions]);

  /* Group by dimension: the closest thing to a "concept" this data model has.
     Each row counts DISTINCT STUDENTS who could not defend a passage in it. */
  const rows = useMemo(() => {
    const byDim = new Map<string, { students: Set<string>; spans: { who: string; quote: string; line?: string }[] }>();
    for (const { label, session } of runs) {
      for (const p of session.probes) {
        if (verdictOf(p) !== 'undefended') continue;
        const entry = byDim.get(p.dimensionId) ?? { students: new Set<string>(), spans: [] };
        entry.students.add(label);
        entry.spans.push({ who: label, quote: p.anchor.quote, line: p.ai?.verdictLine });
        byDim.set(p.dimensionId, entry);
      }
    }
    return [...byDim.entries()]
      .map(([dimensionId, v]) => ({ dimensionId, count: v.students.size, spans: v.spans }))
      .sort((a, b) => b.count - a.count);
  }, [runs]);

  const histogram = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const { session } of runs) {
      const d = divergence(session.probes);
      if (!d) continue;
      buckets.set(d.delta, (buckets.get(d.delta) ?? 0) + 1);
    }
    if (!buckets.size) return [];
    const lo = Math.min(-2, ...buckets.keys());
    const hi = Math.max(2, ...buckets.keys());
    const out: { delta: number; n: number }[] = [];
    for (let d = lo; d <= hi; d++) out.push({ delta: d, n: buckets.get(d) ?? 0 });
    return out;
  }, [runs]);

  if (!cohort) {
    return (
      <div className="col-read stack">
        <Callout tone="danger" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('class')}>{t('common.action.back')}</Button>
        </Callout>
      </div>
    );
  }

  const totalStudents = runs.length;
  const peak = Math.max(1, ...rows.map((r) => r.count));
  const peakN = Math.max(1, ...histogram.map((h) => h.n));

  return (
    <div className="col-doc stack">
      <div className="row-between no-print">
        <Button variant="ghost" onClick={() => nav('cohort', { cohortId: cohort.id })}>
          {t('common.action.back')}
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>{t('sheet.print')}</Button>
      </div>

      <article className="doc">
        <header className="doc-masthead">
          <p className="t-micro" style={{ letterSpacing: '.08em' }}>{t('reteach.title')}</p>
          <h1 className="t-title" style={{ marginTop: 'var(--space-2)' }}>{cohort.name}</h1>
          <p className="t-small ink-2 measure" style={{ marginTop: 'var(--space-3)' }}>{t('reteach.subtitle')}</p>
        </header>

        {totalStudents === 0 || rows.length === 0 ? (
          <p className="t-body ink-2">{t('reteach.empty')}</p>
        ) : (
          <>
            {/* Panel 1 — above the fold, prints first. */}
            <section>
              <h2 className="t-micro">{t('reteach.panel1')}</h2>
              <p className="t-small ink-2" style={{ marginTop: 'var(--space-2)' }}>{t('reteach.noPeople')}</p>
              <div className="stack-tight" style={{ marginTop: 'var(--space-5)' }}>
                {rows.map((r) => {
                  const open = expanded === r.dimensionId;
                  const showNames = named.has(r.dimensionId);
                  return (
                    <div key={r.dimensionId}>
                      <div className="reteach-row">
                        <div className="reteach-track">
                          <div className="reteach-bar t-small"
                               style={{ width: `${Math.max(14, (r.count / peak) * 100)}%`, background: 'var(--undefended)' }}>
                            {r.count}
                          </div>
                        </div>
                        <span className="t-small">{dimensionLabel(cohort.packId, r.dimensionId)}</span>
                      </div>
                      <div className="row wrap" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                        <span className="t-small ink-2">
                          {t('reteach.countLine', { n: r.count, m: totalStudents })}
                        </span>
                        <button type="button" className="viva-leave no-print"
                                onClick={() => setExpanded(open ? null : r.dimensionId)}>
                          {open ? t('reteach.collapse') : t('reteach.expand')}
                        </button>
                      </div>

                      {open && (
                        <div className="stack-tight" style={{ marginTop: 'var(--space-3)' }}>
                          {/* De-identified by default. Names appear only on an
                              explicit per-row toggle — this is the artefact
                              most likely to be shown on a projector. */}
                          <div className="row wrap" style={{ gap: 'var(--space-4)' }}>
                            <span className="t-micro ink-2">{t('reteach.deidentified')}</span>
                            <button type="button" className="viva-leave no-print"
                                    onClick={() => setNamed((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(r.dimensionId)) next.delete(r.dimensionId);
                                      else next.add(r.dimensionId);
                                      return next;
                                    })}>
                              {showNames ? t('reteach.hideNames') : t('reteach.showNames')}
                            </button>
                          </div>
                          {r.spans.map((s, i) => (
                            <blockquote key={i} className="doc-quote t-small">
                              {showNames && <span className="t-micro ink-2">{s.who} · </span>}
                              {s.quote}
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Panel 2 — page 2. Zero line centred. */}
            {histogram.length > 0 && (
              <section style={{ marginTop: 'var(--space-8)', breakBefore: 'page' }}>
                <h2 className="t-micro">{t('reteach.panel2')}</h2>
                <p className="t-small ink-2 measure" style={{ marginTop: 'var(--space-2)' }}>{t('reteach.panel2Hint')}</p>
                <div className="histogram" style={{ marginTop: 'var(--space-6)' }}>
                  {histogram.map((h) => (
                    <div key={h.delta}
                         className={`histogram-col${h.delta === 0 ? ' histogram-zero' : ''}`}>
                      <span className="t-micro">{h.n || ''}</span>
                      <span className="histogram-bar"
                            style={{
                              height: `${(h.n / peakN) * 88}%`,
                              background: h.delta < -1 ? 'var(--over)' : h.delta > 1 ? 'var(--under)' : '#4A4F56',
                            }} />
                      <span className="t-micro">{h.delta > 0 ? `+${h.delta}` : h.delta}</span>
                    </div>
                  ))}
                </div>
                <div className="row-between t-micro ink-2" style={{ marginTop: 'var(--space-3)' }}>
                  <span>{t('reteach.axisOver')}</span>
                  <span>{t('reteach.axisZero')}</span>
                  <span>{t('reteach.axisUnder')}</span>
                </div>
              </section>
            )}
          </>
        )}
      </article>
    </div>
  );
}
