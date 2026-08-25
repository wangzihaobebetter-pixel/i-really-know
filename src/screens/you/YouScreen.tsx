import React from 'react';
import { ArrowRight } from 'lucide-react';
import { selectRealSessions, useStore } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { Button } from '../../ui';
import { divergence, verdictOf } from '../../lib/analysis';
import { dimensionLabel } from '../../packs';
import { formatDate } from '../../lib/session-ops';

export default function YouScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  /*
   * Sample run-throughs count here, and used not to.
   *
   * 你 is defined by brief §6.2 #11 as "给他攒一本『你自己说过、并且站住了的话』"
   * — a book of things the person said out loud that held. The words in a
   * sample run-through are typed by them, the self-read is theirs, the places
   * they slipped are theirs. Only the *material* belonged to someone else.
   *
   * Excluding them meant that a person with no API key — which is the entire
   * zero-setup first run the brief demands in §7 — could finish a whole
   * run-through, see a real verdict, open 你, and be told "这里会长出你的原话",
   * with their own sentences sitting one screen away. Two of the three tabs
   * were permanently empty for exactly the user the cold start is built for.
   *
   * The attribution stays honest: every quote is cited with the title of the
   * piece it came from, so nothing here claims they wrote the material.
   */
  const sessions = useStore(selectRealSessions)
    .filter((session) => session.status === 'complete')
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt));
  const queue = useStore((state) => state.queue);

  const sessionWords = sessions.flatMap((session) => session.probes
    .filter((probe) => ['defended', 'underclaimed'].includes(verdictOf(probe)) && probe.answer?.trim())
    .map((probe) => ({ answer: probe.answer!.trim(), title: session.title, at: session.completedAt ?? session.createdAt })));
  const followupWords = queue.flatMap((target) => {
    const source = sessions.find((session) => session.id === target.sessionId);
    if (!source) return [];
    return target.history
      .filter((attempt) => (attempt.score ?? -1) >= 2 && attempt.answer?.trim())
      .map((attempt) => ({ answer: attempt.answer!.trim(), title: source.title, at: attempt.at }));
  });
  const words = [...sessionWords, ...followupWords].sort((a, b) => b.at - a.at).slice(0, 12);

  const reads = sessions
    .map((session) => ({ session, read: divergence(session.probes) }))
    .filter((item): item is { session: typeof sessions[number]; read: NonNullable<ReturnType<typeof divergence>> } => Boolean(item.read));

  const slips = new Map<string, { label: string; count: number }>();
  for (const session of sessions) {
    for (const probe of session.probes) {
      const verdict = verdictOf(probe);
      if (verdict !== 'undefended' && verdict !== 'partial') continue;
      const key = `${session.packId}:${probe.dimensionId}`;
      const item = slips.get(key) ?? { label: dimensionLabel(session.packId, probe.dimensionId, lang), count: 0 };
      item.count += 1;
      slips.set(key, item);
    }
  }
  const patterns = [...slips.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  const latestRead = reads[0]?.read;
  const readSentence = latestRead?.direction === 'under'
    ? (lang === 'zh-CN' ? '最近一次，你比自己承认的更稳。' : 'Last time, you were steadier than you gave yourself credit for.')
    : latestRead?.direction === 'over'
      ? (lang === 'zh-CN' ? '最近一次，你先在这里发现了自己高估的那道缝。' : 'Last time, you found the gap in your own read here first.')
      : (lang === 'zh-CN' ? '最近一次，你对自己的判断和实际很接近。' : 'Last time, your read on yourself was close.');

  if (!sessions.length) {
    return (
      <div className="col-read you-v5 page-enter" data-testid="you-screen">
        <header className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></header>
        <section className="return-surface-opening"><span className="v5-eyebrow">{t('you4.eyebrow')}</span><h1>{t('you4.title')}</h1></section>
        <section className="you-empty-v5"><span className="empty-loop" aria-hidden><i /></span><h2>{lang === 'zh-CN' ? '这里会长出你的原话。' : 'Your own words will grow here.'}</h2><p>{t('you4.empty')}</p><Button variant="primary" onClick={() => nav('bring')}>{t('you4.start')}</Button></section>
        <p className="no-comparison-v5">{t('you4.noComparison')}</p>
      </div>
    );
  }

  return (
    <div className="col-read you-v5 page-enter" data-testid="you-screen">
      <header className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></header>
      <section className="return-surface-opening"><span className="v5-eyebrow">{t('you4.eyebrow')}</span><h1>{t('you4.title')}</h1><p>{lang === 'zh-CN' ? '不是分数。是你已经能亲口站在后面的东西。' : 'Not a score. The things you can now stand behind in your own words.'}</p></section>

      {words.length > 0 && (
        <section className="voice-bank-v5">
          <div className="v5-section-head"><h2>{t('you4.words')}</h2><span>{words.length}</span></div>
          <div className="voice-bank-scroll">
            {words.map((word, index) => (
              <blockquote key={`${word.at}-${index}`} data-tone={index % 3}>
                <span>“{word.answer}”</span>
                <cite>{word.title} · {formatDate(word.at, lang)}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/*
        Calibration, demoted here too (VERDICT.md §3.3 row 1). The trail of
        self-estimate-vs-verdict reads is still computed and still here, but it
        is folded: this tab opens on the person's own words, and the diagnostic
        is something they can choose to open, not a claim the product makes at
        them. Nothing in `divergence()` or the stored probe data changed.
      */}
      {latestRead && (
        <details className="read-yourself-v5">
          <summary><span className="v5-eyebrow">{t('you4.read')}</span></summary>
          <h2>{readSentence}</h2>
          <div className="read-dots-v5" aria-label={t('you4.read')}>
            {reads.slice(0, 8).reverse().map(({ session, read }) => <span key={session.id} data-direction={read.direction} title={formatDate(session.completedAt ?? session.createdAt, lang)} />)}
          </div>
          <button type="button" onClick={() => nav('work')}>{lang === 'zh-CN' ? '打开每一次' : 'Open each run-through'}<ArrowRight size={17} /></button>
        </details>
      )}

      {patterns.length > 0 && (
        <section className="patterns-v5">
          <div className="v5-section-head"><h2>{t('you4.patterns')}</h2></div>
          {patterns.map((pattern, index) => (
            <div className="pattern-v5" key={pattern.label}><span>{String(index + 1).padStart(2, '0')}</span><strong>{pattern.label}</strong><small>{lang === 'zh-CN' ? `${pattern.count} 次从这里松开` : `${pattern.count} times this link loosened`}</small></div>
          ))}
        </section>
      )}

      <p className="no-comparison-v5">{t('you4.noComparison')}</p>
    </div>
  );
}
