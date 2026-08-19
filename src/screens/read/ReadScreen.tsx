import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RotateCw } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button } from '../../ui';
import { describeError, generate } from '../../lib/llm';
import { PRESET_COUNTS } from '../../store/presets';

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
          PRESET_COUNTS[session.preset],
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
    <main className="reading-v5 page-enter" data-testid="read-screen">
      <div className="col-read reading-v5-layout">
        <header className="reading-v5-head">
          <span className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></span>
          <span className="v5-eyebrow">{t('read4.eyebrow')}</span>
          <h1>{t('read4.title')}</h1>
          <p>{session.title}</p>
        </header>

        <div className="reading-now" aria-live="polite">
          <span className="reading-now-dot" data-ready={ready} aria-hidden />
          <strong>{ready ? t('read4.ready') : stages[Math.min(stage, stages.length - 1)]}</strong>
          <span>{ready ? `${session.probes.length}` : `${Math.min(stage + 1, stages.length)} / ${stages.length}`}</span>
        </div>

        <div className="scan-page reading-page-v5" aria-hidden>
          <div className="scan-beam" style={{ '--scan-stage': Math.min(stage, 2) } as React.CSSProperties} />
          {excerpt.map((line, index) => (
            <p key={`${index}-${line.slice(0, 12)}`} data-found={index < (stage + 1) * 3}>{line}</p>
          ))}
        </div>

        {failed ? (
          <section className="reading-finish-v5" role="alert">
            <h2>{t('read4.error')}</h2>
            <p>{error}</p>
            <div className="row wrap">
              <Button variant="primary" icon={<RotateCw size={17} />} onClick={() => void readWork()}>{t('read4.retry')}</Button>
              <Button variant="ghost" onClick={() => nav('settings')}>{t('read4.settings')}</Button>
            </div>
          </section>
        ) : ready ? (
          <section className="reading-finish-v5 is-ready m-page-turn-in">
            <p>{lang === 'zh-CN' ? `找到 ${session.probes.length} 处值得亲口讲清的地方。` : `Found ${session.probes.length} places worth explaining out loud.`}</p>
            <Button size="lg" variant="primary" block iconRight={<ArrowRight size={19} />} onClick={() => nav('run', { sessionId: session.id })}>{t('read4.start')}</Button>
          </section>
        ) : <p className="reading-patience">{lang === 'zh-CN' ? '不是在概括。是在找哪里值得问一个「为什么」。' : 'Not summarising. Looking for the places that deserve a “why.”'}</p>}
      </div>
    </main>
  );
}
