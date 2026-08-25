/**
 * v7 · The ten schemes, side by side.
 *
 * Each row states the reference product and its App Store rating count, because
 * "有所依据" means the reference has to be a product with a real audience, not a
 * mood board. Picking one writes `irk-scheme` and reloads: index.html sets
 * data-ui before first paint, so a scheme never flashes the default.
 */
import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { SCHEMES } from '../../app/scheme';
import { useLang } from '../../i18n';

function apply(id: string | null) {
  if (id) localStorage.setItem('irk-scheme', id);
  else localStorage.removeItem('irk-scheme');
  const url = new URL(window.location.href);
  url.searchParams.delete('ui');
  url.hash = '#/';
  window.location.replace(url.toString());
  window.location.reload();
}

export default function SchemesScreen() {
  const lang = useLang();
  const zh = lang === 'zh-CN';
  const current = typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-ui');
  const fmt = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US');

  return (
    <div className="col-read stack" data-testid="schemes-screen">
      <div className="stack-tight">
        <h1 className="t-sentence">{zh ? '十个 UI 方案' : 'Ten UI schemes'}</h1>
        <p className="t-body ink-2 measure">
          {zh
            ? '每个方案回答一个不同的产品问题，依据是一个真正有受众的同类产品。改的是结构、版式、动效和功能摆放，不是配色。应用逻辑十个方案共用一份。'
            : 'Each scheme answers a different product question, grounded in a shipped product with a real audience. What changes is structure, type, motion and where functionality sits — not colour. All ten share one application logic.'}
        </p>
      </div>

      <div className="stack">
        {SCHEMES.map((scheme) => (
          <button
            key={scheme.id}
            type="button"
            className="scheme-row"
            data-current={current === scheme.id}
            onClick={() => apply(scheme.id)}
          >
            <span className="scheme-id">{scheme.id}</span>
            <span className="scheme-body">
              <strong>{zh ? scheme.nameZh : scheme.name}</strong>
              <span className="scheme-asks">{scheme.asksZh}</span>
              <small>{zh ? '对标 ' : 'After '}{scheme.ref} · {fmt.format(scheme.ratings)} {zh ? '条评分' : 'ratings'}</small>
              <em>{scheme.ideaZh}</em>
              <span className="scheme-axes">
                <i>{scheme.nav}</i><i>{scheme.home}</i><i>{scheme.run}</i>
                <i>{scheme.motion.fast}/{scheme.motion.slow}ms</i><i>r{scheme.radius}</i>
              </span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
        ))}
      </div>

      <button type="button" className="scheme-row scheme-reset" onClick={() => apply(null)}>
        <RotateCcw size={17} aria-hidden />
        <span>{zh ? '回到没有方案的原始版本' : 'Back to the product with no scheme'}</span>
      </button>
    </div>
  );
}
