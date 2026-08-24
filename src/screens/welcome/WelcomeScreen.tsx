import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { FEATURED_SAMPLE, buildFeaturedSampleSession } from '../../samples';
import { AnchoredText } from '../../ui';
import type { TextAnchor } from '../../ui';
import { detectMaterialKind } from '../../lib/analysis';
import { useStore } from '../../store';

export default function WelcomeScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const upsertSession = useStore((state) => state.upsertSession);
  const setUi = useStore((state) => state.setUi);
  const [phase, setPhase] = useState<'passage' | 'question'>('passage');
  const sample = FEATURED_SAMPLE;
  const probe = sample.probes[0];
  const question = lang === 'zh-CN'
    ? '这行代码按 count × sizeof(char) 给 char** 分配了内存。在 64 位机器上，它实际买到了什么？'
    : probe.question;

  /*
   * The first screen showed one line of the excerpt in a small card floating in
   * the middle of a 437px container — about 128px of dead space above it and
   * the same below. Held next to the four competitors captured in
   * memory/ireallyknow-v6/refs/, that was the tile that lost: Duolingo puts
   * characters above the fold, Brilliant puts a live product card, Quizlet
   * puts illustrated cards. We put a paragraph and a gap.
   *
   * What goes there instead is not a mascot — this product is not going to be
   * cute at a frightened person. It is the artifact itself: a real window of
   * the student's page with the probed span already underlined. Same move as
   * Brilliant's, made of our own material, and it is the one thing on the
   * screen that proves the claim above it.
   */
  const window_ = useMemo(() => {
    const material = sample.material;
    const at = material.indexOf(probe.quote);
    if (at < 0) return { text: probe.quote, start: 0, end: probe.quote.length };
    const from = Math.max(0, material.lastIndexOf('\n', Math.max(0, at - 120)) + 1);
    const to = Math.min(material.length, at + probe.quote.length + 260);
    const text = material.slice(from, to);
    return { text, start: at - from, end: at - from + probe.quote.length };
  }, [sample.material, probe.quote]);

  const anchors: TextAnchor[] = useMemo(
    () => [{ id: 'welcome-hero', start: window_.start, end: window_.end, verdict: 'none' as const }],
    [window_.start, window_.end],
  );

  function ownWork() {
    setUi({ firstOpenSeen: true });
    nav('bring');
  }

  function start() {
    const base = buildFeaturedSampleSession(lang);
    const session = {
      ...base,
      id: `welcome_${Date.now().toString(36)}`,
      title: sample.title,
      probes: base.probes.slice(0, 1),
      occasion: 'review',
      occasionAt: Date.now() + 7 * 86_400_000,
    };
    upsertSession(session);
    setUi({ firstOpenSeen: true });
    nav('run', { sessionId: session.id });
  }

  return (
    <main className="welcome-v5 page-enter" data-testid="welcome-screen">
      <header className="welcome-v5-top">
        <span className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></span>
        <button type="button" onClick={ownWork}>{t('v5.welcomeOwn')}</button>
      </header>

      <section className="welcome-v5-copy" data-phase={phase}>
        <span className="v5-eyebrow">{phase === 'passage' ? t('v5.welcomeEyebrow') : t('v5.welcomeQuestionEyebrow')}</span>
        <h1>{phase === 'passage' ? t('v5.welcomeTitle') : question}</h1>
        <p>{phase === 'passage' ? t('v5.welcomeBody') : t('v5.welcomeQuestionBody')}</p>
      </section>

      <section className={`welcome-live-demo is-${phase}`}>
        <article className="welcome-passage">
          <span>{t('v5.welcomeSource')}</span>
          <div className="welcome-page-window">
            <AnchoredText
              text={window_.text}
              mode={detectMaterialKind(sample.material) === 'code' ? 'code' : 'prose'}
              anchors={anchors}
            />
          </div>
          <a href={sample.source.url} target="_blank" rel="noreferrer">{sample.source.corpus} ↗</a>
        </article>
        {phase === 'question' && (
          <aside className="welcome-question-note">
            <Sparkles size={17} aria-hidden />
            <span>{lang === 'zh-CN' ? '抄原文答不了' : 'Not answerable by copying'}</span>
          </aside>
        )}
      </section>

      <footer className="welcome-v5-actions">
        {phase === 'passage' ? (
          <button className="welcome-primary" type="button" onClick={() => setPhase('question')}>{t('v5.welcomeFind')}<ArrowRight size={20} /></button>
        ) : (
          <>
            <button className="welcome-primary" type="button" onClick={start}>{t('v5.welcomeTry')}<ArrowRight size={20} /></button>
            <button className="welcome-secondary" type="button" onClick={() => setPhase('passage')}><ArrowLeft size={16} />{t('v5.welcomeBack')}</button>
          </>
        )}
      </footer>
    </main>
  );
}
