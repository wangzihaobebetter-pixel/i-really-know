import React, { useMemo, useState } from 'react';
import { useStore, selectHasKey } from '../../store';
import { dimensionLabel, getPack } from '../../packs';
import { useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Button, Callout, EmptyState, Segmented, Sheet, Spinner, Tag } from '../../ui';
import { gradeTarget, probeForTarget, relativeWhen } from '../../lib/session-ops';
import { variant as makeVariant, describeError } from '../../lib/llm';
import type { Probe, RetrainTarget, SelfGrade } from '../../types';
import { now } from '../../lib/ids';

export default function QueueScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const queue = useStore((s) => s.queue);
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const updateTarget = useStore((s) => s.updateTarget);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Probe | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graded, setGraded] = useState(false);

  const at = now();
  const due = useMemo(() => queue.filter((x) => !x.retired && x.dueAt <= at), [queue, at]);
  const later = useMemo(() => queue.filter((x) => !x.retired && x.dueAt > at), [queue, at]);
  const retired = useMemo(() => queue.filter((x) => x.retired), [queue]);

  async function begin(target: RetrainTarget) {
    setActiveId(target.id);
    setAnswer('');
    setGraded(false);
    setError(null);
    const { session, probe } = probeForTarget(target);
    if (!session || !probe) {
      setError(t('common.state.notfound.title'));
      return;
    }
    // Keyless path: use the pre-baked alternate phrasing where a sample supplies one.
    if (!hasKey) {
      setPrompt(probe.variant
        ? { ...probe, question: probe.variant.question, whyThisProbe: probe.variant.whyThisProbe }
        : probe);
      return;
    }
    setLoading(true);
    try {
      setPrompt(await makeVariant(settings, session, probe, lang));
    } catch (err) {
      setError(describeError(err));
      setPrompt(probe);
    } finally {
      setLoading(false);
    }
  }

  function grade(target: RetrainTarget, held: boolean, self: SelfGrade) {
    updateTarget(target.id, {
      ...gradeTarget(target, held, prompt?.id ?? target.probeId),
      history: [
        ...target.history,
        { at: now(), probeId: prompt?.id ?? target.probeId, selfGrade: self },
      ],
    });
    setGraded(true);
  }

  function renderTarget(target: RetrainTarget, actionable: boolean) {
    const { session, probe } = probeForTarget(target);
    const active = activeId === target.id;
    return (
      <Sheet key={target.id} elevation={1}>
        <div className="stack-tight">
          <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
            <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
              <Tag mono>{getPack(target.packId).shortName}</Tag>
              <span className="t-small ink-3">{dimensionLabel(target.packId, target.dimensionId)}</span>
            </div>
            <span className="t-mono-small ink-3">
              {target.retired
                ? t('queue.retiredAt')
                : t('queue.nextDue', { when: relativeWhen(target.dueAt, lang) })}
            </span>
          </div>

          {session && <p className="t-small ink-3">{t('queue.fromRun', { title: session.title })}</p>}
          {target.anchor.quote && (
            <blockquote className="transcript-anchor t-mono t-small">
              {target.anchor.quote.slice(0, 160)}
            </blockquote>
          )}

          {!active && actionable && (
            <div className="row">
              <Button size="sm" variant="secondary" onClick={() => begin(target)}>{t('queue.start')}</Button>
            </div>
          )}

          {active && (
            <div className="stack-tight">
              {loading && <Spinner label={t('map.diagnosing')} />}
              {error && <Callout tone="shaky">{error}</Callout>}
              {prompt && (
                <>
                  <p className="t-body-strong measure">{prompt.question}</p>
                  <p className="t-micro ink-3">{t('queue.variantNote')}</p>
                  <textarea
                    className="control viva-answer"
                    rows={6}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="…"
                  />
                  {!graded ? (
                    <div className="stack-tight">
                      <span className="field-label">{t('viva.selfTitle')}</span>
                      <Segmented<SelfGrade>
                        ariaLabel={t('viva.selfTitle')}
                        value="shaky"
                        onChange={(v) => grade(target, v === 'owned', v)}
                        options={[
                          { value: 'owned', label: t('queue.passed') },
                          { value: 'shaky', label: t('queue.failed') },
                          { value: 'notmine', label: t('viva.selfNotmine') },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="stack-tight">
                      <p className="t-small ink-2 measure">{prompt.reference.ownedLooksLike}</p>
                      <ul className="reference-list">
                        {prompt.reference.keyPoints.map((k, i) => <li key={i} className="t-small">{k}</li>)}
                      </ul>
                      <div className="row">
                        <Button size="sm" variant="ghost" onClick={() => { setActiveId(null); setPrompt(null); }}>
                          {t('common.action.close')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {probe && !prompt && !loading && <p className="t-small ink-3">{probe.question}</p>}
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  if (!queue.length) {
    return (
      <div className="col-read stack">
        <h1 className="t-display-2">{t('queue.title')}</h1>
        <EmptyState
          title={t('queue.empty')}
          action={<Button variant="primary" onClick={() => nav('home')}>{t('home.ctaSample')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <h1 className="t-display-2">{t('queue.title')}</h1>
        <p className="t-small ink-3 measure">{t('queue.subtitle')}</p>
      </header>

      {due.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('queue.due')} · {due.length}</h2>
          {due.map((x) => renderTarget(x, true))}
        </section>
      )}
      {later.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('queue.later')} · {later.length}</h2>
          {later.map((x) => renderTarget(x, false))}
        </section>
      )}
      {retired.length > 0 && (
        <section className="stack-tight">
          <h2 className="t-title">{t('queue.retired')} · {retired.length}</h2>
          {retired.map((x) => renderTarget(x, false))}
        </section>
      )}
    </div>
  );
}
