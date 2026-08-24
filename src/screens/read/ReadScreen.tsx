import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCw } from 'lucide-react';
import { selectSession, useStore } from '../../store';
import { useNavigate, useRoute } from '../../router';
import { useLang, useT } from '../../i18n';
import { AnchoredText, Button } from '../../ui';
import type { TextAnchor } from '../../ui';
import { describeError, generate } from '../../lib/llm';
import { PRESET_COUNTS } from '../../store/presets';

const pending = new Map<string, Promise<void>>();

/** How long one found spot takes to land, and the floor for the whole pass. */
const LAND_MS = 780;
const OPENING_MS = 1250;

/**
 * "当着他的面把作业读一遍" — brief §6.2 #10.
 *
 * What this screen was before v6: an `await generate()` behind a three-step
 * label, a 82px gradient that jumped 130px twice, and body text faded in
 * blocks of three lines. On the keyless path it never ran at all — the sample
 * session goes straight to the questions — so the single most emotionally
 * loaded second in the brief was, for a first-time visitor, not in the product.
 *
 * What it is now: the person's actual text, at readable size, with a light
 * passing down it, and the spots the examiner picked landing one at a time in
 * their own words while a count ticks up. The pass has a floor
 * (OPENING_MS + n * LAND_MS) so it exists even when the probes are already
 * cached and `generate()` returns instantly — being read is the point, not
 * waiting is not.
 *
 * Rules it must not break: nothing translucent or animated is ever placed over
 * the student's text (AnchoredText's boundary rule), and no spot is presented
 * as an accusation — during the pass every mark carries verdict `none`, which
 * renders as a plain thin underline.
 */
export default function ReadScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const sessionId = useRoute().params.sessionId;
  const session = useStore(selectSession(sessionId));
  const settings = useStore((s) => s.settings);
  const updateSession = useStore((s) => s.updateSession);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [landed, setLanded] = useState(0);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const probes = session?.probes ?? [];
  const found = session?.status === 'ready' ? probes.length : 0;

  /* Only spots the classifier could actually locate in the material can be
     marked. An unplaced quote has no offsets, so it would smear the page. */
  const placeable = useMemo(
    () => probes.filter((p) => p.anchor.placed && p.anchor.start !== undefined && p.anchor.end !== undefined),
    [probes],
  );

  const anchors: TextAnchor[] = useMemo(
    () => placeable.slice(0, landed).map((p) => ({
      id: p.id, start: p.anchor.start!, end: p.anchor.end!, verdict: 'none' as const,
    })),
    [placeable, landed],
  );

  async function readWork() {
    if (!session) return;
    setError('');
    updateSession(session.id, { status: 'generating' });
    const work = (async () => {
      try {
        const result = await generate(settings, session, PRESET_COUNTS[session.preset], session.difficulty, lang);
        updateSession(session.id, { ...result, status: 'ready', model: settings.model });
      } catch (err) {
        updateSession(session.id, { status: 'error' });
        throw err;
      } finally {
        pending.delete(session.id);
      }
    })();
    pending.set(session.id, work);
    try { await work; } catch (err) { setError(describeError(err)); }
  }

  useEffect(() => {
    if (!session || session.status === 'ready' || session.probes.length) return;
    const existing = pending.get(session.id);
    if (existing) { existing.catch((err) => setError(describeError(err))); return; }
    void readWork();
  // The session id is the job boundary. Settings are captured when the job starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  /* The opening beat exists so the page is seen as a page before anything is
     marked on it. Without it the first mark lands on text the eye has not read. */
  useEffect(() => {
    const id = window.setTimeout(() => setOpened(true), OPENING_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!opened || !placeable.length || landed >= placeable.length) return;
    const id = window.setTimeout(() => setLanded((n) => n + 1), LAND_MS);
    return () => window.clearTimeout(id);
  }, [opened, landed, placeable.length]);

  /* Follow the newest mark so a long piece of work reads as being worked
     through, not as a wall that scrolled past on its own. */
  useEffect(() => {
    if (!landed) return;
    const last = placeable[landed - 1];
    const node = pageRef.current?.querySelector(`[data-anchor-id="${last?.id}"]`);
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [landed, placeable]);

  if (!session) {
    return <div className="col-read stack"><p>{t('common.state.notfound.title')}</p><Button onClick={() => nav('today')}>{t('common.state.notfound.action')}</Button></div>;
  }

  const failed = session.status === 'error' || Boolean(error);
  const scanning = !failed && (session.status !== 'ready' || landed < placeable.length);
  const done = !failed && session.status === 'ready' && landed >= placeable.length;

  const status = !opened
    ? t('read4.stage1')
    : session.status !== 'ready'
      ? t('read4.stage2')
      : landed < placeable.length
        ? t('read4.stage3')
        : t('read4.ready');

  return (
    <main className="reading-v6 page-enter" data-testid="read-screen">
      <div className="col-read reading-v6-layout">
        <header className="reading-v6-head">
          <span className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></span>
          <span className="v5-eyebrow">{t('read4.eyebrow')}</span>
          <h1>{t('read4.title')}</h1>
          <p title={session.title}>{session.title}</p>
        </header>

        <div className="reading-v6-status" aria-live="polite">
          <span className="reading-v6-dot" data-scanning={scanning} data-ready={done} aria-hidden />
          <strong>{status}</strong>
          {landed > 0 && (
            <span className="reading-v6-count" key={landed}>
              {lang === 'zh-CN' ? `找到 ${landed} 处` : `${landed} found`}
            </span>
          )}
        </div>

        <div className={`reading-v6-page${scanning ? ' is-scanning' : ''}`} ref={pageRef}>
          <div className="reading-v6-beam" aria-hidden />
          <AnchoredText
            text={session.material}
            mode={session.materialKind === 'code' ? 'code' : 'prose'}
            anchors={anchors}
          />
        </div>

        {failed ? (
          <section className="reading-v6-finish is-error" role="alert">
            <h2>{t('read4.error')}</h2>
            <p>{error}</p>
            <div className="row wrap">
              <Button variant="primary" icon={<RotateCw size={17} />} onClick={() => void readWork()}>{t('read4.retry')}</Button>
              <Button variant="ghost" onClick={() => nav('settings')}>{t('read4.settings')}</Button>
            </div>
          </section>
        ) : done ? (
          <section className="reading-v6-finish is-ready">
            {/*
              This line counts QUESTIONS, and the chip above counts the marks
              that landed. They are different numbers on purpose and were
              briefly contradictory: not every probe's quote can be placed in
              the text (overlapping spans get dropped so the page does not
              smear), so an essay with four probes can show three marks. The
              copy now says what each number is, instead of calling both of
              them "places".
            */}
            <p>{lang === 'zh-CN'
              ? `接下来问你 ${found} 个，一次一个。`
              : `${found} question${found === 1 ? '' : 's'} next, one at a time.`}</p>
            <Button size="lg" variant="primary" block iconRight={<ArrowRight size={19} />} onClick={() => nav('run', { sessionId: session.id })}>
              {t('read4.start')}
            </Button>
          </section>
        ) : (
          <p className="reading-v6-patience">
            {lang === 'zh-CN' ? '不是在概括。是在找哪里值得问一个「为什么」。' : 'Not summarising. Looking for the places that deserve a “why.”'}
          </p>
        )}
      </div>
    </main>
  );
}
