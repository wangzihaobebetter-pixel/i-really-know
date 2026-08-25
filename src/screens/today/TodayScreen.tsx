import React, { useState } from 'react';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import { selectDueTargets, selectRealSessions, useStore } from '../../store';
import { useNavigate, FOLLOWUPS_ID } from '../../router';
import { useLang, useT } from '../../i18n';
import { SAMPLES, buildSampleSession, sampleSessionId } from '../../samples';
import { AnchoredText } from '../../ui';
import type { TextAnchor } from '../../ui';
import { detectMaterialKind } from '../../lib/analysis';
import { packShort } from '../../packs';
import { BottomSheet } from '../../ui';
import { formatDate, studentDestination } from '../../lib/session-ops';
import { activeScheme, DEFAULT_SCHEME } from '../../app/scheme';
import { HomeLayout, type HomeData } from './layouts';

function occasionText(value: string | undefined, lang: 'en' | 'zh-CN') {
  const labels: Record<string, [string, string]> = {
    lab: ['Lab meeting', '组会'],
    defense: ['Defence', '答辩'],
    review: ['Code review', '代码 review'],
    exam: ['Exam', '考试'],
    other: ['Just checking', '就想看看'],
  };
  const pair = value ? labels[value] : undefined;
  return pair ? pair[lang === 'zh-CN' ? 1 : 0] : (value || (lang === 'zh-CN' ? '就想看看' : 'Just checking'));
}

export default function TodayScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessions = useStore(selectRealSessions);
  const due = useStore(selectDueTargets());
  const upsertSession = useStore((state) => state.upsertSession);
  const lastId = useStore((state) => state.ui.lastSessionId);
  const [pickerOpen, setPickerOpen] = useState(false);

  /*
   * The specimen on Today.
   *
   * Measured against `main`, this screen was 2.8% different after twelve
   * rounds of work — and it is where a returning person lands, so it was the
   * only screen most people ever saw. What was on it: a promise, a card asking
   * for their work, and a thin outlined row offering a sample. No evidence
   * that any of it does anything.
   *
   * Every mature competitor screenshotted into memory/ireallyknow-v6/refs/
   * puts the product WORKING above the fold. This is ours, made of the same
   * material the app is made of: a real excerpt from a real student paper with
   * the probed line already underlined, and underneath it the actual question
   * that line produced. It is the shortest honest answer to "what is this".
   *
   * It rotates by day so a returning student does not meet the same specimen
   * every morning — day-of-year, not random, so it is stable within a session
   * and identical across a reload.
   */
  const specimen = React.useMemo(() => {
    const pool = SAMPLES.filter((item) => item.probes.length > 0);
    if (!pool.length) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    const def = pool[day % pool.length];
    const probe = def.probes[0];
    const at = def.material.indexOf(probe.quote);
    if (at < 0) return null;
    /* Start exactly AT the probed line so the underline is the first thing in
       the window. Starting at the paragraph — never mind 90 characters before
       it — pushed the mark past the fade and off the fold, which left the card
       showing an excerpt with no evidence that anything had been done to it.
       A leading ellipsis keeps it honest about being a window. */
    const from = at;
    const to = Math.min(def.material.length, at + probe.quote.length + 240);
    const prefix = from > 0 ? '…' : '';
    return {
      id: def.id,
      pack: def.packId,
      text: prefix + def.material.slice(from, to),
      kind: detectMaterialKind(def.material),
      anchors: [{ id: 'specimen', start: prefix.length, end: prefix.length + probe.quote.length, verdict: 'none' as const }] as TextAnchor[],
      question: lang === 'zh-CN' ? probe.zh.question : probe.question,
    };
  }, [lang]);

  const real = sessions.filter((session) => !session.sampleId);
  const recent = [...real].sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const unfinished = recent.find((session) => session.status !== 'complete');
  const remembered = sessions.find((session) => session.id === lastId) ?? recent[0];
  const completedExample = remembered?.sampleId && remembered.status === 'complete' ? remembered : undefined;
  const dueSession = sessions.find((session) => session.id === due[0]?.sessionId);
  const first = real.length === 0;
  const lead = unfinished ?? recent.find((session) => session.occasionAt && session.occasionAt > Date.now());
  const left = unfinished ? Math.max(0, unfinished.probes.length - unfinished.probes.filter((probe) => probe.committedAt).length) : 0;
  const leadMinutes = Math.max(2, Math.ceil(left * 1.6));

  /*
   * Ten real samples ship — nursing, computer science, statistics, machine
   * learning, biology, physics, argument writing, epidemiology — each a real
   * student artifact with a source URL and hand-written probes. Until now the
   * UI could reach exactly one of them: every entry point called
   * buildFeaturedSampleSession(), so nine were dead data. A biology student
   * opening the app with no key was shown a C program.
   *
   * This is a chooser, not the discipline-catalogue screen the brief cut
   * (§6.4). It costs no screen — it is a bottom sheet over Today — and it
   * offers work to try, never a taxonomy to browse. Packs stay invisible; the
   * subject name is a label on a piece of work, which is how a person would
   * actually pick one.
   */
  function openSample(sampleId: string) {
    const def = SAMPLES.find((item) => item.id === sampleId) ?? SAMPLES[0];
    const existing = sessions.find((item) => item.id === sampleSessionId(def.id));
    const session = existing ?? buildSampleSession(def, lang);
    if (!existing) upsertSession(session);
    setPickerOpen(false);
    /* Through the reading pass, not straight to the questions. Being read is
       the first thing this product does for you (brief §6.2 #10); a sample run
       that skips it is a sample of a different product. The one-question
       taster on Welcome still goes direct — one probe has nothing to read. */
    nav('read', { sessionId: session.id });
  }

  const scheme = React.useMemo(() => activeScheme(), []);

  /*
   * v7. Under a scheme, Today is composed by src/screens/today/layouts.tsx —
   * a path, a deck, a table, a shutter, a page, a timeline, a daily hero, an
   * outline, four tiles or a panel list. Same sessions, same due targets, same
   * specimen; a different primary object. The base composition below is what
   * ships when no scheme is selected.
   */
  if (scheme.id !== DEFAULT_SCHEME.id) {
    const data: HomeData = {
      lang, first, lead, unfinished, left, leadMinutes,
      dueCount: due.length, dueSession, recent, completedExample, specimen,
      tried: sessions
        .filter((session) => Boolean(session.sampleId))
        .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt)),
      occasionText: (value) => occasionText(value, lang),
      formatDate: (at) => formatDate(at, lang),
      openPiece: (session) => nav(studentDestination(session), { sessionId: session.id }),
      openFollowups: () => nav('run', { sessionId: FOLLOWUPS_ID }),
      openBring: () => nav('bring'),
      openPicker: () => setPickerOpen(true),
      openWork: () => nav('work'),
    };
    return (
      <div className={`s-home s-home-${scheme.home} page-enter`} data-testid="today-screen" data-scheme={scheme.id}>
        <HomeLayout shape={scheme.home} data={data} />
        <BottomSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={lang === 'zh-CN' ? '挑一份真实作业' : 'Pick a real piece of work'}
        >
          <p className="sample-picker-lead">
            {lang === 'zh-CN'
              ? '都是真实学生交上去的东西，带原始出处。挑一份离你近的。'
              : 'Every one is real student work with its source. Pick whichever sits closest to yours.'}
          </p>
          <div className="sample-picker">
            {SAMPLES.map((def) => (
              <button className="sample-option" type="button" key={def.id} onClick={() => openSample(def.id)}>
                <span className="sample-option-top">
                  <em>{packShort(def.packId, lang)}</em>
                  <small>{def.probes.length} {lang === 'zh-CN' ? '问' : def.probes.length === 1 ? 'question' : 'questions'}</small>
                </span>
                <strong>{def.title}</strong>
                <small>{lang === 'zh-CN' ? def.zhBlurb : def.blurb}</small>
              </button>
            ))}
          </div>
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className="col-read today-v5 page-enter" data-testid="today-screen">
      <header className="product-wordmark" aria-label={t('v5.brand')}>
        <span className="living-mark" aria-hidden />
        <strong>{t('v5.brand')}</strong>
      </header>

      <section className="today-opening">
        <span className="v5-eyebrow">{first ? t('v5.todayFirstKicker') : t('v5.todayReturnKicker')}</span>
        <h1>{first ? t('v5.todayFirstTitle') : t('v5.todayReturnTitle')}</h1>
        <p>{first ? t('v5.todayFirstBody') : t('v5.todayReturnBody')}</p>
      </section>

      {lead ? (
        <button
          className="next-room-card"
          data-long={lead.title.length > 24}
          type="button"
          onClick={() => nav(studentDestination(lead), { sessionId: lead.id })}
        >
          <span className="next-room-top">
            <span className="room-date">
              {lead.occasionAt ? formatDate(lead.occasionAt, lang) : t('v5.nextRoom')} · {occasionText(lead.occasion, lang)}
            </span>
            {unfinished && <span>{t('v5.questionsLeft', { n: left })}</span>}
          </span>
          <span className="next-room-copy">
            <strong>{lead.title}</strong>
            <small>{unfinished
              ? (lang === 'zh-CN' ? '上次停下的地方已经替你留好' : 'Your place from last time is saved')
              : (lang === 'zh-CN' ? '标过的原文和站住的话都在' : 'Your marked page and held words are here')}</small>
          </span>
          <span className="room-orbit" aria-hidden><i /></span>
          <span className="room-commit">
            <span>{unfinished ? t('v5.continue', { n: leadMinutes }) : t('v5.openHeld')}</span>
            <ArrowRight size={21} aria-hidden />
          </span>
        </button>
      ) : (
        <button className="new-room-card" type="button" onClick={() => nav('bring')}>
          <span className="new-room-glyph" aria-hidden><Plus size={24} /></span>
          <span className="new-room-copy">
            <strong>{t('v5.newPieceTitle')}</strong>
            <small>{t('v5.newPieceBody')}</small>
          </span>
          <span className="new-room-action">{t('v5.newPieceAction')} <ArrowRight size={19} /></span>
        </button>
      )}

      {due.length > 0 && (
        <section className="today-kept">
          <div className="v5-section-head"><h2>{t('v5.remembered')}</h2><span>{due.length}</span></div>
          <button className="kept-question" type="button" onClick={() => nav('run', { sessionId: FOLLOWUPS_ID })}>
            <span className="return-tile" aria-hidden><RotateCcw size={21} /></span>
            <span className="kept-copy">
              <strong>{t('v5.dueDifferent')}</strong>
              <small>{t('v5.dueFrom', { title: dueSession?.title ?? remembered?.title ?? '' })}</small>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </section>
      )}

      {completedExample && !lead && (
        <button className="held-memory" type="button" onClick={() => nav('result', { sessionId: completedExample.id })}>
          <span className="held-memory-line" aria-hidden />
          <span><small>{lang === 'zh-CN' ? '刚才有一句站住了' : 'Something just held'}</small><strong>{completedExample.title}</strong></span>
          <ArrowRight size={18} aria-hidden />
        </button>
      )}

      {(lead || due.length > 0) && (
        <button className="bring-quiet" type="button" onClick={() => nav('bring')}>
          <Plus size={17} aria-hidden />{t('v5.bringNew')}
        </button>
      )}

      {first && !completedExample && specimen && (
        <button className="today-specimen" type="button" onClick={() => setPickerOpen(true)} aria-label={specimen.question}>
          <span className="specimen-head">
            <em>{packShort(specimen.pack, lang)}</em>
            <small>{lang === 'zh-CN' ? '一份真实学生作业' : 'A real student piece'}</small>
          </span>
          <span className="specimen-page">
            <AnchoredText text={specimen.text} mode={specimen.kind === 'code' ? 'code' : 'prose'} anchors={specimen.anchors} />
          </span>
          <span className="specimen-ask">
            <i aria-hidden />
            <strong>{specimen.question}</strong>
          </span>
          <span className="specimen-go">
            {lang === 'zh-CN' ? '换一份，或者就从这份开始' : 'Pick another, or start with this one'}
            <ArrowRight size={17} aria-hidden />
          </span>
        </button>
      )}

      {first && !completedExample && !specimen && (
        <button className="sample-invitation" type="button" onClick={() => setPickerOpen(true)}>
          <span>{lang === 'zh-CN' ? '还不想交自己的？先过一份真实作业' : 'Not ready to bring yours? Try a real piece first'}</span>
          <ArrowRight size={17} aria-hidden />
        </button>
      )}

      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={lang === 'zh-CN' ? '挑一份真实作业' : 'Pick a real piece of work'}
      >
        <p className="sample-picker-lead">
          {lang === 'zh-CN'
            ? '都是真实学生交上去的东西，带原始出处。挑一份离你近的。'
            : 'Every one is real student work with its source. Pick whichever sits closest to yours.'}
        </p>
        <div className="sample-picker">
          {SAMPLES.map((def) => (
            <button className="sample-option" type="button" key={def.id} onClick={() => openSample(def.id)}>
              <span className="sample-option-top">
                <em>{packShort(def.packId, lang)}</em>
                <small>{def.probes.length} {lang === 'zh-CN' ? '问' : def.probes.length === 1 ? 'question' : 'questions'}</small>
              </span>
              <strong>{def.title}</strong>
              <small>{lang === 'zh-CN' ? def.zhBlurb : def.blurb}</small>
            </button>
          ))}
        </div>
      </BottomSheet>

      {recent.length > 0 && (
        <section className="today-recent">
          <div className="v5-section-head"><h2>{lang === 'zh-CN' ? '最近带来的' : 'Recently brought'}</h2><button type="button" onClick={() => nav('work')}>{lang === 'zh-CN' ? '全部' : 'All'}</button></div>
          {recent.slice(0, 2).map((session) => (
            <button className="recent-piece" type="button" key={session.id} onClick={() => nav(studentDestination(session), { sessionId: session.id })}>
              <span><strong>{session.title}</strong><small>{occasionText(session.occasion, lang)}{session.occasionAt ? ` · ${formatDate(session.occasionAt, lang)}` : ''}</small></span>
              <ArrowRight size={17} aria-hidden />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
