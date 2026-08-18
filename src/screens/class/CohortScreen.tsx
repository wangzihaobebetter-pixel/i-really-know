import React, { useState } from 'react';
import { useStore, selectCohort, selectHasKey } from '../../store';
import { dimensionLabel, getPack } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT } from '../../i18n';
import {
  Button, Callout, Sheet, Spinner, Tag, Textarea, useToast,
} from '../../ui';
import { PRESET_COUNTS } from '../../store/presets';
import { generate, aggregate, describeError } from '../../lib/llm';
import { detectMaterialKind, ownershipIndex, calibration, titleFromMaterial } from '../../lib/analysis';
import { id, now } from '../../lib/ids';
import type { Session, Submission } from '../../types';

export default function CohortScreen() {
  const t = useT();
  const nav = useNavigate();
  const toast = useToast();
  const cohortId = useRoute().params.cohortId;

  const cohort = useStore(selectCohort(cohortId));
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const sessions = useStore((s) => s.sessions);
  const updateCohort = useStore((s) => s.updateCohort);
  const updateSubmission = useStore((s) => s.updateSubmission);
  const upsertSession = useStore((s) => s.upsertSession);

  const [draft, setDraft] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cohort) {
    return (
      <div className="col-read stack">
        <Callout tone="borrowed" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('class')}>{t('common.action.back')}</Button>
        </Callout>
      </div>
    );
  }

  const pack = getPack(cohort.packId);

  function addSubmission() {
    if (!cohort || !draft.trim()) return;
    const submission: Submission = {
      id: id('sub'),
      label: label.trim() || titleFromMaterial(draft),
      material: draft,
      materialKind: detectMaterialKind(draft),
      status: 'pending',
    };
    updateCohort(cohort.id, { submissions: [...cohort.submissions, submission] });
    setDraft('');
    setLabel('');
  }

  /** One GENERATE call per submission, sequentially: a 429 must not kill the batch. */
  async function generateAll() {
    if (!cohort || !hasKey) return;
    setBusy(true);
    setError(null);
    for (const sub of cohort.submissions) {
      if (sub.status === 'ready') continue;
      updateSubmission(cohort.id, sub.id, { status: 'generating', error: undefined });
      const session: Session = {
        id: id('s'),
        title: sub.label,
        packId: cohort.packId,
        material: sub.material,
        materialKind: sub.materialKind,
        createdAt: now(),
        status: 'generating',
        mode: 'class',
        preset: cohort.preset,
        difficulty: cohort.difficulty,
        probes: [],
        fragilities: [],
        cohortId: cohort.id,
        submissionId: sub.id,
      };
      try {
        const result = await generate(
          settings, session, PRESET_COUNTS[cohort.preset], cohort.difficulty, 'en',
        );
        upsertSession({ ...session, probes: result.probes, fragilities: result.fragilities, status: 'ready' });
        updateSubmission(cohort.id, sub.id, { status: 'ready', sessionId: session.id });
      } catch (err) {
        updateSubmission(cohort.id, sub.id, { status: 'error', error: describeError(err) });
      }
    }
    setBusy(false);
  }

  async function summarise() {
    if (!cohort || !hasKey) return;
    setBusy(true);
    setError(null);
    try {
      const rows = cohort.submissions.map((sub) => {
        const s = sessions.find((x) => x.id === sub.sessionId);
        const dims = s
          ? s.probes.map((p) => `${p.dimensionId}:${p.ai?.score ?? p.selfGrade ?? '-'}`).join(' ')
          : 'no run';
        return {
          submissionId: sub.id,
          label: sub.label,
          dims,
          fragilities: s?.fragilities.map((f) => f.note).join('; ') ?? '',
        };
      });
      const agg = await aggregate(settings, cohort.packId, rows);
      updateCohort(cohort.id, { aggregate: agg });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <h1 className="t-display-2">{cohort.name}</h1>
          <Tag mono>{pack.shortName}</Tag>
        </div>
      </header>

      {!hasKey && <Callout tone="action">{t('class.needKey')}</Callout>}

      <Sheet elevation={1}>
        <div className="stack-tight">
          <Textarea
            label={t('class.addSubmission')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            mono
            counter
          />
          <div className="row wrap">
            <Button variant="secondary" onClick={addSubmission} disabled={!draft.trim()}>
              {t('class.addSubmission')}
            </Button>
          </div>
        </div>
      </Sheet>

      <section className="stack-tight">
        <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
          <h2 className="t-title">{t('class.submissions')} · {cohort.submissions.length}</h2>
          <div className="row wrap">
            <Button size="sm" variant="secondary" onClick={generateAll} disabled={busy || !hasKey || !cohort.submissions.length}>
              {t('class.generateAll')}
            </Button>
            <Button size="sm" variant="ghost" onClick={summarise} disabled={busy || !hasKey}>
              {t('class.aggregate')}
            </Button>
          </div>
        </div>
        {busy && <Spinner label={t('common.state.loading')} />}
        {error && <Callout tone="borrowed">{error}</Callout>}

        {cohort.submissions.map((sub) => {
          const s = sessions.find((x) => x.id === sub.sessionId);
          const oi = s ? ownershipIndex(s.probes) : undefined;
          const cal = s ? calibration(s.probes) : undefined;
          return (
            <Sheet key={sub.id} elevation={1} padding="var(--space-4) var(--space-5)">
              <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
                <div className="stack-tight">
                  <span className="t-body-strong">{sub.label}</span>
                  <span className="t-small ink-3">
                    {sub.status}
                    {oi !== undefined ? ` · ownership ${oi}` : ''}
                    {cal !== undefined ? ` · calibration ${cal}` : ''}
                    {cohort.aggregate?.perSubmissionFlags[sub.id]
                      ? ` · ${cohort.aggregate.perSubmissionFlags[sub.id]}`
                      : ''}
                  </span>
                  {sub.error && <span className="t-small ink-borrowed">{sub.error}</span>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!sub.sessionId}
                  onClick={() => nav('studentSheet', { cohortId: cohort.id, submissionId: sub.id })}
                >
                  {t('class.openSheet')}
                </Button>
              </div>
            </Sheet>
          );
        })}
      </section>

      {cohort.aggregate && (
        <section className="stack-tight">
          <h2 className="t-title">{t('class.weakest')}</h2>
          <Sheet elevation={1}>
            <div className="stack-tight">
              <ul className="reference-list">
                {cohort.aggregate.classWeakDimensions.map((d) => (
                  <li key={d.dimensionId} className="t-small">
                    {dimensionLabel(cohort.packId, d.dimensionId)} — {Math.round(d.share * 100)}%
                  </li>
                ))}
              </ul>
              {cohort.aggregate.commonFragilities.length > 0 && (
                <>
                  <span className="t-micro ink-3">{t('class.common')}</span>
                  <ul className="reference-list">
                    {cohort.aggregate.commonFragilities.map((f, i) => (
                      <li key={i} className="t-small">{f.theme} ({f.submissionIds.length})</li>
                    ))}
                  </ul>
                </>
              )}
              {cohort.aggregate.suggestedInClassProbes.length > 0 && (
                <>
                  <span className="t-micro ink-3">{t('class.inClass')}</span>
                  <ol className="reference-list">
                    {cohort.aggregate.suggestedInClassProbes.map((p, i) => (
                      <li key={i} className="t-small">{p}</li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </Sheet>
        </section>
      )}
    </div>
  );
}
