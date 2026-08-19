import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button, Mark, Sheet } from '../../ui';
import { SAMPLES, buildSampleSession } from '../../samples';
import { useStore } from '../../store';

const STEPS = 6;

export default function WelcomeScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const upsertSession = useStore((state) => state.upsertSession);
  const setUi = useStore((state) => state.setUi);
  const [step, setStep] = useState(0);
  const sample = SAMPLES[0];
  const probe = sample.probes[0];
  const titles = ['oneTitle', 'twoTitle', 'threeTitle', 'fourTitle', 'fiveTitle', 'sixTitle'];
  const bodies = ['oneBody', 'twoBody', 'threeBody', 'fourBody', 'fiveBody', 'sixBody'];

  const quote = useMemo(() => {
    const clean = probe.quote.replace(/\s+/g, ' ').trim();
    return clean.length > 460 ? `${clean.slice(0, 460)}…` : clean;
  }, [probe.quote]);

  function leave() {
    setUi({ firstOpenSeen: true });
    nav('today');
  }

  function start() {
    const base = buildSampleSession(sample);
    const session = {
      ...base,
      id: `welcome_${Date.now().toString(36)}`,
      title: sample.title,
      probes: base.probes.slice(0, 1),
      occasion: lang === 'zh-CN' ? '高风险产科病例讨论' : 'high-risk obstetrics case discussion',
      occasionAt: Date.now() + 7 * 86_400_000,
    };
    upsertSession(session);
    setUi({ firstOpenSeen: true });
    nav('run', { sessionId: session.id });
  }

  return (
    <main className="welcome-stage page-enter" data-testid="welcome-screen">
      <div className="welcome-topbar">
        <span className="wordmark">{lang === 'zh-CN' ? '我真会' : 'I Really Know'}</span>
        <button type="button" className="text-action" onClick={leave}>{t('welcome4.skip')}</button>
      </div>

      <div className="welcome-progress" aria-label={`${step + 1} / ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, index) => <span key={index} data-active={index <= step} />)}
      </div>

      <section className="welcome-copy stack-tight" aria-live="polite">
        <span className="t-micro ink-accent">{step + 1} / {STEPS}</span>
        <h1 className="t-sentence">{t(`welcome4.${titles[step]}`)}</h1>
        <p className="t-body-lg ink-2 measure">{t(`welcome4.${bodies[step]}`)}</p>
      </section>

      <div className="welcome-demo">
        {(step === 0 || step === 1) && (
          <Sheet elevation={1} className="welcome-paper" padding="var(--space-6)">
            <span className="t-micro ink-3">{t('welcome4.source')}</span>
            <p className={step === 1 ? 'demo-reading-line' : ''}>{quote}</p>
            <a href={sample.source.url} target="_blank" rel="noreferrer" className="demo-source-link">{sample.source.corpus} ↗</a>
          </Sheet>
        )}
        {step === 2 && (
          <Sheet elevation={1} className="welcome-question stack-tight" padding="var(--space-6)">
            <span className="t-micro ink-3">{lang === 'zh-CN' ? '从你的原文出发' : 'FROM YOUR PAGE'}</span>
            <p className="probe-question">{probe.question}</p>
            <span className="why-chip"><Sparkles size={14} />{lang === 'zh-CN' ? '答案不能从原文直接抄到' : 'Not answerable by copying'}</span>
          </Sheet>
        )}
        {step === 3 && (
          <Sheet elevation={1} className="welcome-self stack-tight" padding="var(--space-6)">
            <p className="t-title">{t('viva.selfTitleV3')}</p>
            <div className="selfgrade-opts" aria-hidden>
              <span className="selfgrade-opt">{t('viva.selfOwned')}</span>
              <span className="selfgrade-opt">{t('viva.selfShaky')}</span>
              <span className="selfgrade-opt">{t('viva.selfNotmine')}</span>
            </div>
            <p className="t-small ink-3">{lang === 'zh-CN' ? '这里还没有任何判断。' : 'No verdict exists yet.'}</p>
          </Sheet>
        )}
        {step === 4 && (
          <Sheet elevation={1} className="welcome-mark stack-tight" padding="var(--space-6)">
            <Mark verdict="undefended" />
            <p className="demo-underline">{probe.quote.slice(0, 180)}</p>
            <div className="followup-promise row"><RotateCcw size={17} /><span>{lang === 'zh-CN' ? '1 天后 · 换一个角度' : 'In 1 day · a different angle'}</span></div>
          </Sheet>
        )}
        {step === 5 && (
          <div className="welcome-ready-mark" aria-hidden><Check size={34} /></div>
        )}
      </div>

      <div className="welcome-actions">
        {step < STEPS - 1
          ? <Button size="lg" variant="primary" block iconRight={<ArrowRight size={19} />} onClick={() => setStep((value) => value + 1)}>{t('welcome4.next')}</Button>
          : <Button size="lg" variant="primary" block iconRight={<ArrowRight size={19} />} onClick={start}>{t('welcome4.start')}</Button>}
      </div>
    </main>
  );
}
