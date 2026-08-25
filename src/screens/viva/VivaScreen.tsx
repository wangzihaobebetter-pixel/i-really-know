import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown, Mic, Square } from 'lucide-react';
import { selectHasKey, selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { AnchoredText, Button, Mark, Sheet, Spinner } from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { describeError, score as scoreProbe } from '../../lib/llm';
import { isSpeechSupported, startDictation, type Dictation } from '../../lib/speech';
import { targetsFromSession } from '../../lib/session-ops';
import type { Probe, Score, SelfGrade } from '../../types';
import { activeScheme, DEFAULT_SCHEME } from '../../app/scheme';
import { RunFrame, type RunSlots } from './presentations';

type Phase = 'stance' | 'answering' | 'blankplan' | 'selfgrade' | 'scoring' | 'manualgrade' | 'revealed';

export default function VivaScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const settings = useStore((state) => state.settings);
  const hasKey = useStore(selectHasKey);
  const updateSession = useStore((state) => state.updateSession);
  const updateProbe = useStore((state) => state.updateProbe);
  const finalizeSession = useStore((state) => state.finalizeSession);
  const addTargets = useStore((state) => state.addTargets);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [answer, setAnswer] = useState('');
  const [blankPlan, setBlankPlan] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const dictation = useRef<Dictation | null>(null);
  const usedVoice = useRef(false);
  const startedAt = useRef(Date.now());

  const probe = session?.probes[index];
  const committed = session?.probes[index];
  const total = session?.probes.length ?? 0;
  const speechAvailable = isSpeechSupported();

  useEffect(() => {
    if (!session) return;
    const open = session.probes.findIndex((item) => !item.committedAt || !item.selfGrade || (!item.ai && item.manualScore === undefined));
    setIndex(open < 0 ? Math.max(0, session.probes.length - 1) : open);
    if (session.status === 'ready') updateSession(session.id, { status: 'running' });
  // Session id is the resume boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    if (!probe) return;
    setAnswer(probe.answer ?? '');
    setBlankPlan('');
    setScoreError('');
    setVoiceError('');
    setSourceOpen(false);
    usedVoice.current = probe.answerMode === 'voice';
    startedAt.current = Date.now();
    /* Scheme 10 asks for a stance before the answer opens; every other scheme
       goes straight to answering. The stance is stored on the probe, so
       resuming a run lands back in the right place either way. */
    if (!probe.committedAt) setPhase(needsStance && !probe.preStance ? 'stance' : 'answering');
    else if (!probe.selfGrade) setPhase('selfgrade');
    else if (probe.ai || probe.manualScore !== undefined) setPhase('revealed');
    else setPhase('manualgrade');
  }, [probe?.id]);

  useEffect(() => () => {
    dictation.current?.stop();
    dictation.current = null;
  }, []);

  const source = useMemo(() => {
    if (!session || !probe) return null;
    if (probe.anchor.placed && probe.anchor.start !== undefined) {
      const from = Math.max(0, probe.anchor.start - 220);
      const to = Math.min(session.material.length, (probe.anchor.end ?? probe.anchor.start) + 260);
      const prefix = from > 0 ? '…' : '';
      const text = `${prefix}${session.material.slice(from, to)}${to < session.material.length ? '…' : ''}`;
      const shift = prefix.length - from;
      return {
        text,
        anchor: {
          id: probe.id,
          start: probe.anchor.start + shift,
          end: (probe.anchor.end ?? probe.anchor.start) + shift,
          verdict: 'none' as const,
        },
      };
    }
    return { text: probe.anchor.quote, anchor: undefined };
  }, [session, probe]);

  function stopVoice() {
    dictation.current?.stop();
    dictation.current = null;
    setRecording(false);
  }

  function toggleVoice() {
    if (recording) { stopVoice(); return; }
    setVoiceError('');
    const prefix = answer.trim() ? `${answer.trim()} ` : '';
    const next = startDictation(
      lang,
      (text) => setAnswer(prefix + text),
      (kind) => { setVoiceError(kind); setRecording(false); },
      () => setRecording(false),
    );
    if (!next) { setVoiceError('unsupported'); return; }
    dictation.current = next;
    usedVoice.current = true;
    setRecording(true);
  }

  function saveAnswer(value: string, extra: Partial<Probe> = {}) {
    if (!session || !probe) return;
    stopVoice();
    updateProbe(session.id, probe.id, {
      answer: value.trim(),
      answerMode: usedVoice.current ? 'voice' : 'text',
      committedAt: Date.now(),
      timeUsedSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
      ...extra,
    });
    setAnswer(value.trim());
    setPhase('selfgrade');
  }

  function takeStance(stance: 'holds' | 'unsure') {
    if (!session || !probe) return;
    updateProbe(session.id, probe.id, { preStance: stance });
    setPhase('answering');
  }

  function commitAnswer() {
    if (answer.trim()) saveAnswer(answer);
  }

  function commitBlankPlan() {
    if (!blankPlan.trim()) return;
    const value = lang === 'zh-CN'
      ? `这题我会卡住。我会这样弄清楚：${blankPlan.trim()}`
      : `I would blank on this. I would find out by: ${blankPlan.trim()}`;
    // The plan is stored as its own field as well as inside the answer text, so
    // the result page can show it as a positive outcome rather than a blank.
    saveAnswer(value, { blankPlan: blankPlan.trim() });
  }

  async function chooseSelfGrade(grade: SelfGrade) {
    if (!session || !probe) return;
    updateProbe(session.id, probe.id, { selfGrade: grade });
    if (!hasKey || !answer.trim()) {
      setPhase('manualgrade');
      return;
    }
    setPhase('scoring');
    setScoreError('');
    try {
      const ai = await scoreProbe(
        settings,
        { ...session, probes: session.probes.map((item) => item.id === probe.id ? { ...item, answer, selfGrade: grade } : item) },
        { ...probe, answer, selfGrade: grade },
        answer,
        usedVoice.current,
      );
      updateProbe(session.id, probe.id, { ai });
      setPhase('revealed');
    } catch (error) {
      setScoreError(describeError(error));
      setPhase('revealed');
    }
  }

  function manualMark(score: Score) {
    if (!session || !probe) return;
    updateProbe(session.id, probe.id, { manualScore: score });
    setScoreError('');
    setPhase('revealed');
  }

  function next() {
    if (!session) return;
    if (index < total - 1) {
      setIndex((value) => value + 1);
      return;
    }
    const completed = finalizeSession(session.id);
    if (completed) addTargets(targetsFromSession(completed));
    nav('result', { sessionId: session.id });
  }

  if (!session || !probe || !committed) {
    return (
      <div className="col-read stack">
        <p>{t('common.state.notfound.title')}</p>
        <Button onClick={() => nav('today')}>{t('common.state.notfound.action')}</Button>
      </div>
    );
  }

  const verdict = verdictOf(committed);
  const hasJudgment = Boolean(committed.ai) || committed.manualScore !== undefined;
  const oneLine = committed.ai?.verdictLine
    ?? (committed.manualScore !== undefined
      ? t(committed.manualScore >= 2 ? 'run4.oneLineHeld' : committed.manualScore === 1 ? 'run4.oneLineHalf' : 'run4.oneLineSlipped')
      : scoreError || t('run4.scoreFailed'));
  const showExchange = phase === 'answering' || phase === 'blankplan' || phase === 'revealed';

  const scheme = React.useMemo(() => activeScheme(), []);
  const needsStance = scheme.run === 'card';

  /*
   * v7. The phase bodies below are identical under every scheme — the model
   * call, the self-grade, the reveal and the reference are the product and do
   * not get ten variants. What changes is the frame they sit in, chosen in
   * src/screens/viva/presentations.tsx.
   *
   * Anki's rating row is the one place a scheme changes wording rather than
   * arrangement: its buttons name the interval you are choosing, and our three
   * self-grades already map onto exactly that. Saying "7 天后再问你" on the
   * button is more honest than "站住了", because that is what the choice does.
   */
  const intervals = scheme.run === 'ratingbar';
  const selfOptions: [SelfGrade, string][] = intervals
    ? [
        ['owned', lang === 'zh-CN' ? '站住了 · 7 天后再问' : 'Held · ask again in 7d'],
        ['shaky', lang === 'zh-CN' ? '有点虚 · 3 天后再问' : 'Shaky · ask again in 3d'],
        ['notmine', lang === 'zh-CN' ? '没站住 · 明天再问' : 'Slipped · ask again tomorrow'],
      ]
    : [
        ['owned', t('v5.selfHeld')],
        ['shaky', t('v5.selfUnsure')],
        ['notmine', t('v5.selfSlipped')],
      ];

  /** The phase bodies, frame-agnostic. Every scheme renders these. */
  function PhaseBody() {
    if (phase === 'stance') return (
      <section className="s-stance">
        <p className="s-stance-ask">
          {lang === 'zh-CN' ? '先别打字。就这一句，你现在怎么看？' : 'Before you type. Right now, what do you think?'}
        </p>
        <div className="s-stance-options">
          <button type="button" data-stance="holds" onClick={() => takeStance('holds')}>
            {lang === 'zh-CN' ? '这句我站得住' : 'I can defend this'}
          </button>
          <button type="button" data-stance="unsure" onClick={() => takeStance('unsure')}>
            {lang === 'zh-CN' ? '这句我说不清' : 'I cannot explain this'}
          </button>
        </div>
        <p className="s-stance-hint">
          {lang === 'zh-CN'
            ? '按完再展开说。说完之后，两次表态会一起给你看。'
            : 'You will explain after. Both of your answers get shown together at the end.'}
        </p>
      </section>
    );

    if (phase === 'answering') return (
      <section className="s-dock">
        <div className="s-dock-row">
          {settings.voiceEnabled && speechAvailable ? (
            <button type="button" className="s-mic" data-recording={recording} onClick={toggleVoice} aria-pressed={recording} aria-label={recording ? t('run4.voiceStop') : t('run4.voiceStart')}>
              {recording ? <Square size={19} /> : <Mic size={22} />}
            </button>
          ) : <span className="s-mic is-disabled" aria-hidden><Mic size={21} /></span>}
          <textarea
            id="run-answer"
            className="s-answer-input"
            rows={1}
            value={answer}
            placeholder={t('v5.runPlaceholder')}
            onChange={(event) => setAnswer(event.target.value)}
            aria-label={t('run4.answer')}
          />
          <button type="button" className="s-send" onClick={commitAnswer} disabled={!answer.trim()} aria-label={t('run4.commit')}><ArrowUp size={21} /></button>
        </div>
        {voiceError && voiceError !== 'unsupported' && <p className="s-dock-error">{t('run4.voiceUnsupported')}</p>}
        {/*
          Measured on our own build: this escape was 78×19px next to a 52×52
          submit — the smallest target on a screen whose entire purpose is to
          make admitting "I can't defend this" cheaper than inventing an answer.
          Khan ships [Skip 44×40] beside [Check 130×40]; Elevate ships
          [Skip][Submit] at equal width. Two independent products, 650k ratings.
          So it becomes a real button, at least 44px, sitting on the same row as
          the count — and it is not a skip: it opens the blank-plan step, which
          is scored, because knowing how you would find out is a real answer.
        */}
        <div className="s-dock-meta">
          <button type="button" className="s-stuck" onClick={() => { stopVoice(); setPhase('blankplan'); }}>
            {t('v5.runBlank')}
          </button>
          <span className="s-left">{lang === 'zh-CN' ? `还剩 ${Math.max(0, total - index)} 问` : `${Math.max(0, total - index)} left`}</span>
          {/* Scheme 04 spells the commit out in words on the same row, so the two
              actions are literally the same size. Other schemes keep the arrow. */}
          {scheme.run === 'honest' && (
            <button type="button" className="s-honest-commit" onClick={commitAnswer} disabled={!answer.trim()}>
              {lang === 'zh-CN' ? '提交' : 'Submit'}
            </button>
          )}
        </div>
      </section>
    );

    if (phase === 'blankplan') return (
      <section className="s-blank">
        <h2>{t('run4.blankTitle')}</h2>
        <p>{t('run4.blankBody')}</p>
        <textarea className="control s-blank-box" rows={4} value={blankPlan} placeholder={t('run4.blankPlaceholder')} onChange={(event) => setBlankPlan(event.target.value)} autoFocus />
        <Button size="lg" variant="primary" disabled={!blankPlan.trim()} onClick={commitBlankPlan}>{t('run4.blankCommit')}</Button>
      </section>
    );

    if (phase === 'selfgrade') return (
      <section className="s-self">
        <span className="s-self-eyebrow">{t('v5.selfEyebrow')}</span>
        <h2>{t('v5.selfTitle')}</h2>
        <div className="s-self-options">
          {selfOptions.map(([value, label]) => (
            <button type="button" key={value} data-grade={value} onClick={() => void chooseSelfGrade(value)}>
              <span>{label}</span><ArrowRight size={19} aria-hidden />
            </button>
          ))}
        </div>
        <p className="s-self-hint">{t('v5.selfHint')}</p>
      </section>
    );

    /*
      Chegg turns the wait into a screen with content: a three-stage line
      (Sent → Working → Answered), one plain sentence, and two things to do
      instead of waiting. Ours was a spinner — spent on the most anxious moment
      in the product, the seconds right after a student has committed a claim
      about their own work. The stages here are real: the answer is already
      saved locally before the request leaves.
    */
    if (phase === 'scoring') return (
      <section className="s-scoring">
        <ol className="s-stages" aria-label={t('v5.scoring')}>
          <li data-state="done">{lang === 'zh-CN' ? '你的原话已经存下' : 'Your words are saved'}</li>
          <li data-state="active">{lang === 'zh-CN' ? '正在对着你的原文读一遍' : 'Reading it against your page'}</li>
          <li data-state="later">{lang === 'zh-CN' ? '给一句判定' : 'One sentence back'}</li>
        </ol>
        <span className="living-typing" aria-hidden><i /><i /><i /></span>
        <blockquote className="answer-quote">“{answer}”</blockquote>
        <p className="s-scoring-note">
          {lang === 'zh-CN'
            ? '不用等在这里。回到今天页，判定回来时它还在这一问。'
            : 'You do not have to wait here. Leave and this question keeps your place.'}
        </p>
      </section>
    );

    if (phase === 'manualgrade') return (
      <section className="s-manual">
        <span className="s-self-eyebrow">{t('v5.manualEyebrow')}</span>
        <h2>{t('v5.manualTitle')}</h2>
        <p>{t('v5.manualBody')}</p>
        <div className="s-manual-ref">
          <p className="t-body-strong">{probe!.reference.ownedLooksLike}</p>
          <ul className="reference-list">{probe!.reference.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul>
        </div>
        <div className="s-manual-opts">
          <button type="button" onClick={() => manualMark(3)}>{t('run4.manualHeld')}</button>
          <button type="button" onClick={() => manualMark(1)}>{t('run4.manualHalf')}</button>
          <button type="button" onClick={() => manualMark(0)}>{t('run4.manualSlipped')}</button>
        </div>
      </section>
    );

    /* Explicit rather than a fallthrough. The verdict is the one thing in this
       product that must never appear before the student has committed one of
       their own, so the condition that shows it is written out where it can be
       read — and verify-no-early-verdict.mjs holds it there. */
    if (phase !== 'revealed') return null;
    return (
      <section className="s-reveal">
        <div className="s-reveal-line" data-verdict={verdict}>
          <Mark verdict={verdict} />
          <p>{oneLine}</p>
        </div>
        {/* The whole point of asking for a stance first: name the change of mind. */}
        {committed!.preStance && committed!.selfGrade && (
          (committed!.preStance === 'holds') !== (committed!.selfGrade === 'owned') ? (
            <p className="s-stance-shift">
              {committed!.preStance === 'holds'
                ? (lang === 'zh-CN' ? '你先说站得住，说完之后自己改了口。' : 'You said you could defend it, then changed your mind while writing.')
                : (lang === 'zh-CN' ? '你先说说不清，说完之后发现其实站得住。' : 'You said you could not explain it, then found you could.')}
            </p>
          ) : null
        )}
        {scoreError && !hasJudgment && (
          <Button variant="secondary" onClick={() => setPhase('manualgrade')}>{t('run4.markMyself')}</Button>
        )}
        <details className="s-reveal-details">
          <summary>{t('v5.replyDetails')}<ChevronDown size={16} aria-hidden /></summary>
          <div className="stack">
            <div className="stack-tight"><span className="t-micro ink-3">{t('run4.answer')}</span><blockquote className="answer-quote">“{committed!.answer}”</blockquote></div>
            <div className="stack-tight"><span className="t-micro ink-3">{t('run4.why')}</span><p className="t-small ink-2 measure">{probe!.whyThisProbe}</p></div>
            <div className="stack-tight"><span className="t-micro ink-3">{t('run4.standard')}</span><ul className="reference-list">{probe!.reference.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></div>
          </div>
        </details>
        {hasJudgment && (
          <Button size="lg" block variant="primary" iconRight={<ArrowRight size={18} />} onClick={next}>
            {index < total - 1 ? t('v5.replyNext') : t('v5.replyFinish')}
          </Button>
        )}
      </section>
    );
  }

  if (scheme.id !== DEFAULT_SCHEME.id) {
    const sourceNode = source?.text ? (
      <div className={`s-src ${phase === 'revealed' ? `is-${verdict}` : ''}`}>
        {source.anchor
          ? <AnchoredText text={source.text} mode={session.materialKind === 'code' ? 'code' : 'prose'} anchors={[phase === 'revealed' ? { ...source.anchor, verdict } : source.anchor]} />
          : <p className="t-small ink-2">{source.text}</p>}
        {source.text.length > 260 && <button type="button" className="text-action" onClick={() => setSourceOpen((value) => !value)}>{sourceOpen ? t('run4.sourceLess') : t('run4.sourceMore')}</button>}
      </div>
    ) : null;

    const slots: RunSlots = {
      lang, phase, index, total,
      steps: session.probes.map((item) => ({ id: item.id, question: item.question, done: Boolean(item.committedAt) })),
      title: session.title,
      onLeave: () => nav('today'),
      sourceLabel: t('v5.runSource'),
      source: sourceNode,
      question: probe.question,
      guidance: t('v5.runGuidance'),
      answer: committed.answer,
      verdict,
      flagged: Boolean(committed.flagged),
      onFlag: () => updateProbe(session.id, probe.id, { flagged: !committed.flagged }),
      body: <PhaseBody />,
    };
    return <RunFrame shape={scheme.run} slots={slots} />;
  }

  return (
    <main className="run-v5 page-enter" data-testid="run-screen">
      <header className="v5-run-top">
        <button type="button" className="run-leave" onClick={() => nav('today')}><ArrowLeft size={17} />{t('v5.runLeave')}</button>
        <span className="visually-hidden">{t('run4.questionOf', { n: index + 1, total })}</span>
      </header>

      <div className="v5-run-progress" style={{ gridTemplateColumns: `repeat(${Math.max(1, total)}, minmax(20px, 1fr))` }} aria-label={t('run4.questionOf', { n: index + 1, total })}>
        {session.probes.map((item, itemIndex) => (
          <span key={item.id} data-state={itemIndex < index ? 'done' : itemIndex === index ? 'current' : 'later'} />
        ))}
      </div>

      {showExchange && (
        <div className="v5-exchange">
          {source?.text && (
            <Sheet elevation={0} className={`v5-run-source living-source ${phase === 'revealed' ? `is-${verdict}` : ''}`} padding="var(--space-4) var(--space-5)">
              <span className="v5-source-label">{t('v5.runSource')}</span>
              <div data-expanded={sourceOpen}>
                {source.anchor
                  ? <AnchoredText text={source.text} mode={session.materialKind === 'code' ? 'code' : 'prose'} anchors={[phase === 'revealed' ? { ...source.anchor, verdict } : source.anchor]} />
                  : <p className="t-small ink-2">{source.text}</p>}
              </div>
              {source.text.length > 260 && <button type="button" className="text-action" onClick={() => setSourceOpen((value) => !value)}>{sourceOpen ? t('run4.sourceLess') : t('run4.sourceMore')}</button>}
            </Sheet>
          )}
          <section className="v5-question-block">
            <p className="run-question">{probe.question}</p>
            <p className="v5-question-guidance">{t('v5.runGuidance')}</p>
          </section>
        </div>
      )}

      {phase === 'answering' && (
        <section className="v5-answer-dock">
          <div className="v5-answer-row">
            {settings.voiceEnabled && speechAvailable ? (
              <button type="button" className="v5-mic" data-recording={recording} onClick={toggleVoice} aria-pressed={recording} aria-label={recording ? t('run4.voiceStop') : t('run4.voiceStart')}>
                {recording ? <Square size={19} /> : <Mic size={23} />}
              </button>
            ) : <span className="v5-mic is-disabled" aria-hidden><Mic size={22} /></span>}
            <textarea
              id="run-answer"
              className="v5-answer-input"
              rows={1}
              value={answer}
              placeholder={t('v5.runPlaceholder')}
              onChange={(event) => setAnswer(event.target.value)}
              aria-label={t('run4.answer')}
            />
            <button type="button" className="v5-send" onClick={commitAnswer} disabled={!answer.trim()} aria-label={t('run4.commit')}><ArrowUp size={22} /></button>
          </div>
          {voiceError && voiceError !== 'unsupported' && <p className="v5-dock-error">{t('run4.voiceUnsupported')}</p>}
          <div className="v5-dock-meta">
            <span>{t('v5.runSavedAfter')}</span>
            <button type="button" onClick={() => { stopVoice(); setPhase('blankplan'); }}>{t('v5.runBlank')}</button>
          </div>
        </section>
      )}

      {phase === 'blankplan' && (
        <section className="run-focus-card stack">
          <div className="stack-tight">
            <h1 className="t-sentence-small">{t('run4.blankTitle')}</h1>
            <p className="t-body ink-2 measure">{t('run4.blankBody')}</p>
          </div>
          <textarea className="control run-answer-box" rows={5} value={blankPlan} placeholder={t('run4.blankPlaceholder')} onChange={(event) => setBlankPlan(event.target.value)} autoFocus />
          <div className="run-actions"><Button size="lg" variant="primary" disabled={!blankPlan.trim()} onClick={commitBlankPlan}>{t('run4.blankCommit')}</Button></div>
        </section>
      )}

      {phase === 'selfgrade' && (
        <section className="v5-self-read">
          <span className="v5-eyebrow">{t('v5.selfEyebrow')}</span>
          <h1>{t('v5.selfTitle')}</h1>
          <div className="v5-self-options">
            {selfOptions.map(([value, label]) => (
              <button type="button" key={value} onClick={() => void chooseSelfGrade(value)}><span>{label}</span><ArrowRight size={20} /></button>
            ))}
          </div>
          <p>{t('v5.selfHint')}</p>
        </section>
      )}

      {phase === 'scoring' && (
        <section className="v5-reading-answer">
          <span className="living-typing" aria-hidden><i /><i /><i /></span>
          <Spinner label={t('v5.scoring')} />
          <blockquote className="answer-quote">“{answer}”</blockquote>
        </section>
      )}

      {phase === 'manualgrade' && (
        <section className="v5-manual-mark">
          <div>
            <span className="v5-eyebrow">{t('v5.manualEyebrow')}</span>
            <h1>{t('v5.manualTitle')}</h1>
            <p>{t('v5.manualBody')}</p>
          </div>
          <div className="rubric-quiet">
            <p className="t-body-strong">{probe.reference.ownedLooksLike}</p>
            <ul className="reference-list">{probe.reference.keyPoints.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}</ul>
          </div>
          <div className="manualgrade-opts">
            <button type="button" onClick={() => manualMark(3)}>{t('run4.manualHeld')}</button>
            <button type="button" onClick={() => manualMark(1)}>{t('run4.manualHalf')}</button>
            <button type="button" onClick={() => manualMark(0)}>{t('run4.manualSlipped')}</button>
          </div>
        </section>
      )}

      {phase === 'revealed' && (
        <section className="v5-reply-state">
          <div className="v5-reply-line" data-verdict={verdict}>
            <Mark verdict={verdict} />
            <p>{oneLine}</p>
          </div>
          {scoreError && !hasJudgment && (
            <Button variant="secondary" onClick={() => setPhase('manualgrade')}>{t('run4.markMyself')}</Button>
          )}
          <details className="run-details v5-reply-details">
            <summary>{t('v5.replyDetails')}<ChevronDown size={17} aria-hidden /></summary>
            <div className="stack">
              <div className="stack-tight"><span className="t-micro ink-3">{t('run4.answer')}</span><blockquote className="answer-quote">“{committed.answer}”</blockquote></div>
              <div className="stack-tight"><span className="t-micro ink-3">{t('run4.why')}</span><p className="t-small ink-2 measure">{probe.whyThisProbe}</p></div>
              <div className="stack-tight"><span className="t-micro ink-3">{t('run4.standard')}</span><ul className="reference-list">{probe.reference.keyPoints.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}</ul></div>
            </div>
          </details>
          {hasJudgment && (
            <Button size="lg" block variant="primary" iconRight={<ArrowRight size={18} />} onClick={next}>
              {index < total - 1 ? t('v5.replyNext') : t('v5.replyFinish')}
            </Button>
          )}
        </section>
      )}
    </main>
  );
}
