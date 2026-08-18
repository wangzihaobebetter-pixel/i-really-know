import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, selectSession, selectHasKey } from '../../store';
import { getPack } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Mic, Square } from 'lucide-react';
import {
  AnchoredText, Button, Callout, Mark, ScorePip, SegmentStrip,
  Sheet, Spinner, Tag, TimerRing,
} from '../../ui';
import { verdictOf } from '../../lib/analysis';
import { isSpeechSupported, startDictation, type Dictation } from '../../lib/speech';
import { score as scoreProbe, describeError } from '../../lib/llm';
import { MED_SAFETY_NOTE } from '../../packs';
import type { SelfGrade, Verdict } from '../../types';

type Phase = 'answering' | 'selfgrade' | 'revealed';

export default function VivaScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const route = useRoute();
  const sessionId = route.params.sessionId;

  const session = useStore(selectSession(sessionId));
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const updateProbe = useStore((s) => s.updateProbe);
  const updateSession = useStore((s) => s.updateSession);
  const finalizeSession = useStore((s) => s.finalizeSession);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  const usedVoice = useRef(false);
  const speechAvailable = isSpeechSupported();
  const voiceOn = settings.voiceEnabled && speechAvailable;
  const startedAt = useRef<number>(Date.now());
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const probe = session?.probes[index];
  const total = session?.probes.length ?? 0;

  /* Resume where the user left off. */
  useEffect(() => {
    if (!session) return;
    const firstOpen = session.probes.findIndex((p) => !p.committedAt);
    setIndex(firstOpen < 0 ? Math.max(0, session.probes.length - 1) : firstOpen);
    if (session.status === 'ready') updateSession(session.id, { status: 'running' });
  }, [session?.id]);

  /* Reset per-probe state. */
  useEffect(() => {
    if (!probe) return;
    setAnswer(probe.answer ?? '');
    setPhase(probe.committedAt ? (probe.selfGrade ? 'revealed' : 'selfgrade') : 'answering');
    setRemaining(probe.timerSec);
    setScoreError(null);
    startedAt.current = Date.now();
    answerRef.current?.focus();
  }, [probe?.id]);

  /* Timer — advisory only, it never forces a commit. */
  useEffect(() => {
    if (!settings.timersEnabled || phase !== 'answering' || paused || !probe) return;
    const h = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(h);
  }, [phase, paused, probe?.id, settings.timersEnabled]);

  /* Stop dictation whenever the probe changes or the screen unmounts —
     a recogniser left running across a navigation keeps the mic open. */
  useEffect(() => () => { dictation.current?.stop(); dictation.current = null; }, []);
  useEffect(() => {
    dictation.current?.stop();
    dictation.current = null;
    setRecording(false);
    setVoiceError(null);
    setSourceOpen(false);
  }, [probe?.id]);

  function toggleDictation() {
    if (recording) {
      dictation.current?.stop();
      dictation.current = null;
      setRecording(false);
      return;
    }
    setVoiceError(null);
    const prefix = answer.trim() ? `${answer.trim()} ` : '';
    const d = startDictation(
      lang,
      (text) => setAnswer(prefix + text),
      (kind) => { setVoiceError(kind); setRecording(false); },
      () => setRecording(false),
    );
    if (!d) { setVoiceError('unsupported'); return; }
    dictation.current = d;
    usedVoice.current = true;
    setRecording(true);
  }

  const commit = useCallback(() => {
    if (!session || !probe) return;
    const timeUsedSec = Math.round((Date.now() - startedAt.current) / 1000);
    dictation.current?.stop();
    dictation.current = null;
    setRecording(false);
    updateProbe(session.id, probe.id, {
      answer,
      answerMode: usedVoice.current ? 'voice' : 'text',
      committedAt: Date.now(),
      timeUsedSec,
    });
    setPhase('selfgrade');
  }, [session?.id, probe?.id, answer, updateProbe]);

  const applySelfGrade = useCallback(async (grade: SelfGrade) => {
    if (!session || !probe) return;
    updateProbe(session.id, probe.id, { selfGrade: grade });
    setPhase('revealed');

    if (!hasKey || !settings.scoreOnCommit || !answer.trim()) return;
    setScoring(true);
    setScoreError(null);
    try {
      const ai = await scoreProbe(settings, session, probe, answer, false);
      updateProbe(session.id, probe.id, { ai });
    } catch (err) {
      setScoreError(describeError(err));
    } finally {
      setScoring(false);
    }
  }, [session?.id, probe?.id, answer, hasKey, settings, updateProbe]);

  function next() {
    if (!session) return;
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    finalizeSession(session.id);
    nav('map', { sessionId: session.id });
  }

  if (!session) {
    return (
      <div className="col-read stack">
        <Callout tone="danger" title={t('common.state.notfound.title')}>
          <Button size="sm" onClick={() => nav('home')}>{t('common.state.notfound.action')}</Button>
        </Callout>
      </div>
    );
  }
  if (!probe) {
    return (
      <div className="col-read stack">
        <Sheet elevation={1}><Spinner label={t('common.state.loading')} /></Sheet>
      </div>
    );
  }

  const pack = getPack(session.packId);
  const dimension = pack.dimensions.find((d) => d.id === probe.dimensionId);
  const states: Verdict[] = session.probes.map((p) => (p.committedAt ? verdictOf(p) : 'none'));
  const committed = session.probes[index];

  return (
    <div className="col-read stack viva">
      <div className="stack-tight">
        <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <button type="button" className="viva-leave" onClick={() => nav('home')}>
              {t('viva.leave')}
            </button>
            <span className="t-small ink-3">{t('viva.of', { n: index + 1, total })}</span>
          </div>
          <div className="row" style={{ gap: 'var(--space-3)' }}>
            <Tag mono>{pack.shortName}</Tag>
            {dimension && <Tag>{dimension.label}</Tag>}
            <Tag mono tone="neutral">{probe.kind}</Tag>
          </div>
        </div>
        <SegmentStrip total={total} current={index} states={states} />
      </div>

      {/* P3 §6: the source span sits ABOVE the question, clamped to a few
          lines with a "show more" affordance — it is context, not the task. */}
      {probe.anchor.placed && probe.anchor.start !== undefined && (() => {
        const from = Math.max(0, probe.anchor.start! - 260);
        const to = Math.min(session.material.length, (probe.anchor.end ?? probe.anchor.start!) + 260);
        return (
          <Sheet elevation={0} padding="var(--space-4) var(--space-5)">
            <span className="t-micro ink-3">{t('viva.sourceLabel')}</span>
            <div className="probe-source" data-expanded={sourceOpen}>
              <AnchoredText
                text={`${from > 0 ? '…' : ''}${session.material.slice(from, to)}${to < session.material.length ? '…' : ''}`}
                mode={session.materialKind === 'code' ? 'code' : 'prose'}
                anchors={[{
                  id: probe.id,
                  start: (from > 0 ? 1 : 0) + probe.anchor.start! - from,
                  end: (from > 0 ? 1 : 0) + (probe.anchor.end ?? probe.anchor.start!) - from,
                  verdict: 'none',
                }]}
              />
            </div>
            <button type="button" className="viva-leave" onClick={() => setSourceOpen((o) => !o)}>
              {sourceOpen ? t('viva.sourceLess') : t('viva.sourceMore')}
            </button>
          </Sheet>
        );
      })()}
      {!probe.anchor.placed && probe.anchor.quote && (
        <Sheet elevation={0} padding="var(--space-4) var(--space-5)">
          <span className="t-micro ink-3">{t('viva.sourceLabel')}</span>
          <p className="t-mono t-small">{probe.anchor.quote}</p>
        </Sheet>
      )}

      {/* THE PROBE. P3 §6: the probe question is the largest text on screen,
          and never in the display face — corpus 04 §C1: "never set a probe in
          a personality font — it reads as the app being cute about something
          serious". In v2 the largest element on this screen was an empty
          textarea and the question was body text in a card. */}
      <Sheet elevation={1}>
        <div className="stack-tight">
          <div className="row-between">
            <span className="t-micro ink-3">{t('viva.probeLabel')}</span>
            {settings.timersEnabled && phase === 'answering' && (
              <button
                type="button"
                className="timer-btn"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'resume timer' : 'pause timer'}
              >
                <TimerRing totalSec={probe.timerSec} remainingSec={remaining} paused={paused} />
              </button>
            )}
          </div>
          <p className="probe-question measure">{probe.question}</p>
        </div>
      </Sheet>

      {phase === 'answering' && (
        <div className="stack-tight">
          {/* Voice is the default input. Where the browser has no recogniser
              the UI says so plainly instead of hiding the feature. */}
          {settings.voiceEnabled && (
            <div className="voice-slot">
              {speechAvailable ? (
                <>
                  <button
                    type="button"
                    className="mic-btn"
                    data-recording={recording}
                    onClick={toggleDictation}
                    aria-pressed={recording}
                    aria-label={recording ? t('viva.voiceStop') : t('viva.voiceAnswer')}
                  >
                    {recording ? <Square size={22} /> : <Mic size={26} />}
                  </button>
                  <div className="stack-tight grow">
                    <span className="t-body-strong">
                      {recording ? t('viva.voiceListening') : t('viva.voiceAnswer')}
                    </span>
                    <span className="t-small ink-3">
                      {recording ? t('viva.voiceSilence') : t('viva.voiceReview')}
                    </span>
                  </div>
                </>
              ) : (
                <span className="t-small ink-3 measure">{t('viva.voiceUnsupported')}</span>
              )}
            </div>
          )}
          {voiceError && voiceError !== 'unsupported' && (
            <Callout tone="danger">{t('common.error.network')}</Callout>
          )}

          {/* The transcript is ALWAYS shown as editable text before it is
              committed. Corpus 05 §2.1: articulating under pressure is the
              difficulty, not knowing the material. */}
          <label className="field-label" htmlFor="viva-answer">
            {voiceOn && usedVoice.current ? t('viva.voiceReview') : t('viva.answerLabel')}
          </label>
          <textarea
            id="viva-answer"
            ref={answerRef}
            className="control viva-answer"
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="…"
          />
          <p className="field-hint">{t('viva.answerHint')}</p>
          <div className="row wrap">
            <Button variant="primary" size="lg" onClick={commit} disabled={!answer.trim()}>
              {t('viva.commit')}
            </Button>
            <Button variant="ghost" onClick={() => { setAnswer(''); commit(); }}>
              {t('viva.skip')}
            </Button>
          </div>
        </div>
      )}

      {/* SELF-GRADE BEFORE ANY VERDICT. Full-bleed, one question, nothing else
          on screen. Corpus 04 §E1 — "no Next button visible until they commit"
          — because a carelessly-given self-grade destroys the measurement, and
          the measurement is the entire product. */}
      {phase === 'selfgrade' && (
        <Sheet elevation={1}>
          <div className="selfgrade">
            <p className="t-title measure">{t('viva.selfTitleV3')}</p>
            <div className="selfgrade-opts">
              {([
                ['owned', t('viva.selfOwned')],
                ['shaky', t('viva.selfShaky')],
                ['notmine', t('viva.selfNotmine')],
              ] as [SelfGrade, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="selfgrade-opt"
                  aria-pressed={committed.selfGrade === value}
                  onClick={() => applySelfGrade(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="t-small ink-3 measure">{t('viva.selfWhy')}</p>
          </div>
        </Sheet>
      )}

      {phase === 'revealed' && (
        <div className="stack-tight">
          <Sheet elevation={1}>
            <div className="stack-tight">
              <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
                <span className="t-micro ink-3">{t('viva.reveal')}</span>
                <div className="row" style={{ gap: 'var(--space-3)' }}>
                  <Mark verdict={verdictOf(committed)} />
                  {committed.ai && <ScorePip score={committed.ai.score} />}
                </div>
              </div>

              {scoring && <Spinner label={t('viva.committing')} />}
              {scoreError && <Callout tone="danger">{t('viva.scoreFailed')}</Callout>}
              {!hasKey && <p className="t-small ink-3">{t('viva.noScore')}</p>}

              {committed.ai && (
                <div className="stack-tight">
                  <p className="t-body-strong">{committed.ai.verdictLine}</p>
                  {committed.ai.evidence.present.length > 0 && (
                    <ul className="evidence evidence-present">
                      {committed.ai.evidence.present.map((e, i) => <li key={i} className="t-small">{e}</li>)}
                    </ul>
                  )}
                  {committed.ai.evidence.missing.length > 0 && (
                    <ul className="evidence evidence-missing">
                      {committed.ai.evidence.missing.map((e, i) => <li key={i} className="t-small">{e}</li>)}
                    </ul>
                  )}
                  {committed.ai.examinerFollowUp && (
                    <Callout tone="action" title={t('viva.followUp')}>{committed.ai.examinerFollowUp}</Callout>
                  )}
                </div>
              )}

              <div className="stack-tight">
                <span className="t-micro ink-3">{t('viva.whyAsked')}</span>
                <p className="t-small ink-2 measure">{probe.whyThisProbe}</p>
              </div>

              <div className="stack-tight">
                <span className="t-micro ink-3">{t('viva.reference')}</span>
                <ul className="reference-list">
                  {probe.reference.keyPoints.map((k, i) => <li key={i} className="t-small">{k}</li>)}
                </ul>
                {probe.reference.ownedLooksLike && (
                  <p className="t-small ink-3 measure"><em>{probe.reference.ownedLooksLike}</em></p>
                )}
              </div>

              {session.packId === 'med' && <p className="t-micro ink-3">{MED_SAFETY_NOTE}</p>}
            </div>
          </Sheet>

          <div className="row">
            <Button variant="primary" size="lg" onClick={next}>
              {index + 1 < total ? t('viva.next') : t('viva.finish')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
