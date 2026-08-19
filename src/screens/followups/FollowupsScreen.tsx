import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown, RotateCcw } from 'lucide-react';
import { selectHasKey, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Sheet, Spinner } from '../../ui';
import { gradeTarget, localFollowupVariant, probeForTarget, relativeWhen } from '../../lib/session-ops';
import { score as scoreProbe, variant as makeVariant } from '../../lib/llm';
import type { Probe, RetrainTarget, Score, SelfGrade } from '../../types';

type Phase = 'idle' | 'preparing' | 'answering' | 'selfgrade' | 'scoring' | 'manualgrade' | 'revealed';

export default function FollowupsScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const queue = useStore((state) => state.queue);
  const settings = useStore((state) => state.settings);
  const hasKey = useStore(selectHasKey);
  const updateTarget = useStore((state) => state.updateTarget);

  const at = Date.now();
  const due = useMemo(() => queue.filter((target) => !target.retired && target.dueAt <= at), [queue, at]);
  const later = useMemo(() => queue.filter((target) => !target.retired && target.dueAt > at).sort((a, b) => a.dueAt - b.dueAt), [queue, at]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Probe | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [answer, setAnswer] = useState('');
  const [selfGrade, setSelfGrade] = useState<SelfGrade | null>(null);
  const [mark, setMark] = useState<Score | null>(null);
  const [line, setLine] = useState('');
  const [modelError, setModelError] = useState(false);
  const active = queue.find((target) => target.id === activeId);
  const source = active ? probeForTarget(active) : {};

  async function begin(target: RetrainTarget) {
    const found = probeForTarget(target);
    if (!found.session || !found.probe) return;
    setActiveId(target.id);
    if (target.draft) {
      setPrompt(target.draft.prompt);
      setAnswer(target.draft.answer);
      setSelfGrade(target.draft.selfGrade ?? null);
      setMark(null);
      setLine('');
      setModelError(false);
      setPhase(target.draft.selfGrade ? 'manualgrade' : 'selfgrade');
      return;
    }
    setAnswer('');
    setSelfGrade(null);
    setMark(null);
    setLine('');
    setModelError(false);
    setPhase('preparing');
    const fallback = localFollowupVariant(found.probe, target, lang);
    if (!hasKey) {
      setPrompt(fallback);
      setPhase('answering');
      return;
    }
    try {
      const priorQuestions = [found.probe.question, ...target.history.map((attempt) => attempt.question ?? '')].filter(Boolean);
      const generated = await makeVariant(settings, found.session, found.probe, lang, priorQuestions);
      const seen = new Set(priorQuestions.map((question) => question.trim().toLocaleLowerCase()));
      setPrompt(seen.has(generated.question.trim().toLocaleLowerCase())
        ? fallback
        : { ...generated, id: `${found.probe.id}_again_${target.history.length}` });
    } catch {
      setPrompt(fallback);
    }
    setPhase('answering');
  }

  function commit() {
    if (!active || !prompt || !answer.trim()) return;
    updateTarget(active.id, { draft: { prompt, answer: answer.trim() } });
    setPhase('selfgrade');
  }

  async function chooseSelf(value: SelfGrade) {
    if (!active || !source.session || !prompt) return;
    setSelfGrade(value);
    updateTarget(active.id, { draft: { prompt, answer: answer.trim(), selfGrade: value } });
    if (!hasKey) {
      setPhase('manualgrade');
      return;
    }
    setPhase('scoring');
    try {
      const ai = await scoreProbe(settings, source.session, prompt, answer.trim(), false);
      const score = ai.score;
      updateTarget(active.id, gradeTarget(active, score >= 2, prompt.id, score, value, answer.trim(), prompt.question));
      setMark(score);
      setLine(ai.verdictLine);
      setPhase('revealed');
    } catch {
      setModelError(true);
      setLine(t('follow4.modelMiss'));
      setPhase('revealed');
    }
  }

  function manualMark(score: Score) {
    if (!active || !prompt || !selfGrade) return;
    updateTarget(active.id, gradeTarget(active, score >= 2, prompt.id, score, selfGrade, answer.trim(), prompt.question));
    setMark(score);
    setLine(t(score >= 2 ? 'follow4.oneHeld' : score === 1 ? 'follow4.oneHalf' : 'follow4.oneSlipped'));
    setModelError(false);
    setPhase('revealed');
  }

  function closeAttempt() {
    const another = due.find((target) => target.id !== activeId);
    if (another) {
      void begin(another);
      return;
    }
    setActiveId(null);
    setPrompt(null);
    setPhase('idle');
  }

  if (!queue.length || (!due.length && phase === 'idle')) {
    return (
      <div className="col-read stack page-enter followup-empty-v5" data-testid="followups-screen">
        <button type="button" className="text-action row" onClick={() => nav('today')}><ArrowLeft size={16} />{t('follow4.back')}</button>
        <header className="stack-tight">
          <span className="t-micro ink-accent">{t('follow4.eyebrow')}</span>
          <h1 className="t-sentence">{t('follow4.emptyTitle')}</h1>
          <p className="t-body-lg ink-2 measure">{t('follow4.emptyBody')}</p>
        </header>
        {later.length > 0 && (
          <div className="future-list">
            {later.slice(0, 4).map((target) => {
              const found = probeForTarget(target);
              return <div className="future-row" key={target.id}><span className="grow truncate">{found.session?.title}</span><span>{relativeWhen(target.dueAt, lang)}</span></div>;
            })}
          </div>
        )}
        <Button variant="primary" onClick={() => nav('today')}>{t('follow4.back')}</Button>
      </div>
    );
  }

  if (phase === 'idle') {
    const first = due[0];
    const found = probeForTarget(first);
    return (
      <div className="col-read stack page-enter followup-door-v5" data-testid="followups-screen">
        <button type="button" className="text-action row" onClick={() => nav('today')}><ArrowLeft size={16} />{t('follow4.back')}</button>
        <header className="stack-tight">
          <span className="t-micro ink-accent">{t('follow4.eyebrow')}</span>
          <h1 className="t-sentence">{t('follow4.title')}</h1>
          <p className="t-body-lg ink-2 measure">{t('follow4.body')}</p>
        </header>
        <Sheet elevation={1} className="followup-card-v5" padding="var(--space-6)">
          <div className="stack">
            <span className="return-icon" aria-hidden><RotateCcw size={22} /></span>
            <p className="t-small ink-3">{t('follow4.from', { title: found.session?.title ?? '' })}</p>
            <blockquote>{first.anchor.quote.slice(0, 220)}</blockquote>
            <Button size="lg" variant="primary" iconRight={<ArrowRight size={18} />} onClick={() => void begin(first)}>{t('follow4.title')}</Button>
          </div>
        </Sheet>
      </div>
    );
  }

  return (
    <main className="run-v5 followup-run-v5 page-enter" data-testid="followups-screen">
      <header className="v5-run-top">
        <button type="button" className="run-leave" onClick={() => nav('today')}><ArrowLeft size={16} />{t('follow4.back')}</button>
        {source.session && <span className="t-small ink-3 truncate">{source.session.title}</span>}
      </header>

      {phase === 'preparing' && <section className="v5-reading-answer"><span className="living-typing" aria-hidden><i /><i /><i /></span><Spinner label={t('follow4.preparing')} /></section>}

      {phase === 'answering' && prompt && (
        <>
          <section className="v5-exchange">
            <Sheet elevation={0} className="v5-run-source living-source" padding="var(--space-4) var(--space-5)">
              <span className="v5-source-label">{t('follow4.from', { title: source.session?.title ?? '' })}</span>
              <div data-expanded="true"><p className="t-small ink-2">{prompt.anchor.quote}</p></div>
            </Sheet>
            <section className="v5-question-block"><p className="run-question">{prompt.question}</p><p className="v5-question-guidance">{t('follow4.body')}</p></section>
          </section>
          <section className="v5-answer-dock">
            <div className="v5-answer-row is-text-only">
              <textarea id="follow-answer" className="v5-answer-input" rows={1} value={answer} placeholder={t('v5.runPlaceholder')} onChange={(event) => setAnswer(event.target.value)} />
              <button type="button" className="v5-send" disabled={!answer.trim()} onClick={commit} aria-label={t('follow4.commit')}><ArrowUp size={22} /></button>
            </div>
            <div className="v5-dock-meta"><span>{t('v5.runSavedAfter')}</span></div>
          </section>
        </>
      )}

      {phase === 'selfgrade' && (
        <section className="v5-self-read">
          <span className="v5-eyebrow">{t('v5.selfEyebrow')}</span>
          <h1>{t('follow4.self')}</h1>
          <div className="v5-self-options">
            <button type="button" onClick={() => void chooseSelf('owned')}><span>{t('v5.selfHeld')}</span><ArrowRight size={20} /></button>
            <button type="button" onClick={() => void chooseSelf('shaky')}><span>{t('v5.selfUnsure')}</span><ArrowRight size={20} /></button>
            <button type="button" onClick={() => void chooseSelf('notmine')}><span>{t('v5.selfSlipped')}</span><ArrowRight size={20} /></button>
          </div>
          <p>{t('v5.selfHint')}</p>
        </section>
      )}

      {phase === 'scoring' && <section className="v5-reading-answer"><span className="living-typing" aria-hidden><i /><i /><i /></span><Spinner label={t('v5.scoring')} /></section>}

      {phase === 'manualgrade' && prompt && (
        <section className="v5-manual-mark">
          <div><span className="v5-eyebrow">{t('v5.manualEyebrow')}</span><h1>{t('follow4.manual')}</h1><p>{t('v5.manualBody')}</p></div>
          <div className="rubric-quiet"><p className="t-body-strong">{prompt.reference.ownedLooksLike}</p><ul className="reference-list">{prompt.reference.keyPoints.map((point, index) => <li key={index}>{point}</li>)}</ul></div>
          <div className="manualgrade-opts">
            <button type="button" onClick={() => manualMark(3)}>{t('follow4.held')}</button>
            <button type="button" onClick={() => manualMark(1)}>{t('follow4.half')}</button>
            <button type="button" onClick={() => manualMark(0)}>{t('follow4.slipped')}</button>
          </div>
        </section>
      )}

      {phase === 'revealed' && prompt && (
        <section className="v5-reply-state">
          <div className="v5-reply-line" data-verdict={mark === null ? 'none' : mark >= 2 ? 'defended' : mark === 1 ? 'partial' : 'undefended'}><p>{line}</p></div>
          {modelError && <Button variant="secondary" onClick={() => setPhase('manualgrade')}>{t('run4.markMyself')}</Button>}
          <details className="run-details v5-reply-details"><summary>{t('follow4.details')}<ChevronDown size={17} /></summary><div className="rubric-quiet"><p>{prompt.reference.ownedLooksLike}</p><ul className="reference-list">{prompt.reference.keyPoints.map((point, index) => <li key={index}>{point}</li>)}</ul></div></details>
          {mark !== null && (
            <Button size="lg" block variant="primary" iconRight={<ArrowRight size={18} />} onClick={closeAttempt}>{due.some((target) => target.id !== activeId) ? t('follow4.next') : t('follow4.finish')}</Button>
          )}
        </section>
      )}
    </main>
  );
}
