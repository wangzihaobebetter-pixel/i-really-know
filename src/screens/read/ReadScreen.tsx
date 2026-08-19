import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Circle, RotateCw } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button } from '../../ui';
import { describeError, generate } from '../../lib/llm';

const pending = new Map<string, Promise<void>>();

export default function ReadScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const settings = useStore((s) => s.settings);
  const updateSession = useStore((s) => s.updateSession);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');

  const excerpt = useMemo(() => (session?.material ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12), [session?.material]);

  async function readWork() {
    if (!session) return;
    setError('');
    updateSession(session.id, { status: 'generating' });
    const work = (async () => {
      try {
        const result = await generate(
          settings,
          session,
          Math.min(7, Math.max(4, settings.count)),
          session.difficulty,
          lang,
        );
        updateSession(session.id, {
          ...result,
          status: 'ready',
          model: settings.model,
        });
      } catch (err) {
        updateSession(session.id, { status: 'error' });
        throw err;
      } finally {
        pending.delete(session.id);
      }
    })();
    pending.set(session.id, work);
    try {
      await work;
    } catch (err) {
      setError(describeError(err));
    }
  }

  useEffect(() => {
    if (!session || session.status === 'ready' || session.probes.length) return;
    const existing = pending.get(session.id);
    if (existing) {
      existing.catch((err) => setError(describeError(err)));
      return;
    }
    void readWork();
  // The session id is the job boundary. Settings are captured when the job starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    if (session?.status === 'ready') { setStage(3); return; }
    const id = window.setInterval(() => setStage((value) => Math.min(2, value + 1)), 1450);
    return () => window.clearInterval(id);
  }, [session?.status]);

  if (!session) {
    return <div className="col-read stack"><p>{t('common.state.notfound.title')}</p><Button onClick={() => nav('today')}>{t('common.state.notfound.action')}</Button></div>;
  }

  const stages = [t('read4.stage1'), t('read4.stage2'), t('read4.stage3')];
  const ready = session.status === 'ready' && session.probes.length > 0;
  const failed = session.status === 'error' || Boolean(error);

  return (
    <main className="reading-room page-enter" data-testid="read-screen">
      <div className="col-read reading-layout">
        <header className="stack-tight">
          <span className="t-micro ink-accent">{t('read4.eyebrow')}</span>
          <h1 className="t-sentence">{t('read4.title')}</h1>
          <p className="t-small ink-3 truncate">{session.title}</p>
        </header>

        <div className="reading-progress" aria-live="polite">
          {stages.map((label, index) => (
            <div className="reading-step" data-state={stage > index || ready ? 'done' : stage === index ? 'active' : 'later'} key={label}>
              <span aria-hidden>{stage > index || ready ? <Check size={15} /> : <Circle size={13} />}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="scan-page" aria-hidden>
          <div className="scan-beam" style={{ '--scan-stage': Math.min(stage, 2) } as React.CSSProperties} />
          {excerpt.map((line, index) => (
            <p key={`${index}-${line.slice(0, 12)}`} data-found={index < (stage + 1) * 3}>{line}</p>
          ))}
        </div>

        {failed ? (
          <section className="reading-finish stack-tight" role="alert">
            <h2 className="t-title">{t('read4.error')}</h2>
            <p className="t-small ink-2 measure">{error}</p>
            <div className="row wrap">
              <Button variant="primary" icon={<RotateCw size={17} />} onClick={() => void readWork()}>{t('read4.retry')}</Button>
              <Button variant="ghost" onClick={() => nav('settings')}>{t('read4.settings')}</Button>
            </div>
          </section>
        ) : ready ? (
          <section className="reading-finish stack-tight m-page-turn-in">
            <h2 className="t-title">{t('read4.ready')}</h2>
            <Button size="lg" variant="primary" block iconRight={<ArrowRight size={19} />} onClick={() => nav('run', { sessionId: session.id })}>
              {t('read4.start')}
            </Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
