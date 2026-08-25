/**
 * v7 · Six navigation models, one per structural family in SCHEMES.
 *
 * These are not skins of the same bar. A Duolingo tab bar, a Quizlet top bar
 * and a Notion sidebar put navigation in different places, give it different
 * weight, and — in Duolingo's case during a run — remove it entirely. That is
 * the difference Wang asked for, and it is decided here rather than in CSS.
 *
 * All six read the same route table and the same due count, so switching a
 * scheme never changes where a link goes.
 */
import React from 'react';
import { PenLine, Files, User, Settings, X, ChevronRight, Search } from 'lucide-react';
import { href, ROUTE_GROUP, type Route } from '../router';
import { useT, useLang } from '../i18n';
import { useStore, selectDueTargets, selectRealSessions } from '../store';
import type { Scheme } from './scheme';

type Group = 'today' | 'work' | 'you' | 'settings';
interface Item { group: Group; route: 'today' | 'work' | 'you' | 'settings'; icon: React.ReactNode; key: string }

const ITEMS: Item[] = [
  { group: 'today', route: 'today', icon: <PenLine size={20} strokeWidth={1.75} />, key: 'common.nav.today' },
  { group: 'work',  route: 'work',  icon: <Files size={20} strokeWidth={1.75} />,   key: 'common.nav.work' },
  { group: 'you',   route: 'you',   icon: <User size={20} strokeWidth={1.75} />,    key: 'common.nav.you' },
];

function useNavState(route: Route) {
  const due = useStore(selectDueTargets()).length;
  return { due, active: ROUTE_GROUP[route.name] as Group | undefined };
}

/** Brand mark, rendered the way the scheme says — including not at all. */
export function SchemeLogo({ scheme, compact }: { scheme: Scheme; compact?: boolean }) {
  const t = useT();
  if (scheme.logo === 'none') return null;
  if (scheme.logo === 'mark') {
    return <span className="s-logo s-logo-mark" aria-label={t('v5.brand')}><i aria-hidden /></span>;
  }
  if (scheme.logo === 'inline') {
    return <span className="s-logo s-logo-inline">{t('v5.brand')}</span>;
  }
  if (scheme.logo === 'lockup' && !compact) {
    return (
      <span className="s-logo s-logo-lockup">
        <i aria-hidden />
        <strong>{t('v5.brand')}</strong>
      </span>
    );
  }
  return (
    <span className="s-logo s-logo-word">
      <i aria-hidden />
      <strong>{t('v5.brand')}</strong>
    </span>
  );
}

/** 01 · 07 · 09 — bottom tab bar. Chunky targets, label under icon. */
export function ChunkTabs({ route }: { route: Route }) {
  const t = useT();
  const { due, active } = useNavState(route);
  return (
    <nav className="no-print s-tabs" aria-label={t('common.app.name')}>
      {ITEMS.map((it) => (
        <a key={it.group} href={href(it.route)} className="s-tab" aria-current={active === it.group ? 'page' : undefined}>
          <span className="s-tab-glyph">{it.icon}{it.group === 'today' && due > 0 && <i className="s-dot" aria-hidden />}</span>
          <span>{t(it.key)}</span>
        </a>
      ))}
      <a href={href('settings')} className="s-tab" aria-current={active === 'settings' ? 'page' : undefined}>
        <span className="s-tab-glyph"><Settings size={20} strokeWidth={1.75} /></span>
        <span>{t('common.nav.settings')}</span>
      </a>
    </nav>
  );
}

/** 02 · 04 · 10 — top bar only: leave · where you are · gear. */
export function TopBar({ route, scheme }: { route: Route; scheme: Scheme }) {
  const t = useT();
  const { due, active } = useNavState(route);
  const label = active === 'work' ? t('common.nav.work') : active === 'you' ? t('common.nav.you') : active === 'settings' ? t('common.nav.settings') : t('common.nav.today');
  return (
    <header className="no-print s-topbar" aria-label={t('common.app.name')}>
      <a href={href('today')} className="s-topbar-left" aria-label={t('common.nav.today')}>
        {active === 'today' ? <SchemeLogo scheme={scheme} compact /> : <X size={20} strokeWidth={2} />}
      </a>
      <span className="s-topbar-mid">{label}{due > 0 && <em>{due}</em>}</span>
      <span className="s-topbar-right">
        <a href={href('work')} aria-label={t('common.nav.work')}><Files size={19} strokeWidth={1.9} /></a>
        <a href={href('settings')} aria-label={t('common.nav.settings')}><Settings size={19} strokeWidth={1.9} /></a>
      </span>
    </header>
  );
}

/** 03 — Anki's toolbar: text, evenly spaced, no ornament at all. */
export function PlainToolbar({ route }: { route: Route }) {
  const t = useT();
  const { due, active } = useNavState(route);
  const all: Item[] = [...ITEMS, { group: 'settings', route: 'settings', icon: null, key: 'common.nav.settings' }];
  return (
    <nav className="no-print s-toolbar" aria-label={t('common.app.name')}>
      {all.map((it) => (
        <a key={it.group} href={href(it.route)} aria-current={active === it.group ? 'page' : undefined}>
          {t(it.key)}{it.group === 'today' && due > 0 ? ` (${due})` : ''}
        </a>
      ))}
    </nav>
  );
}

/** 05 — Speechify's floating dock. Content runs under it, edge to edge. */
export function FloatingDock({ route, scheme }: { route: Route; scheme: Scheme }) {
  const t = useT();
  const { due, active } = useNavState(route);
  return (
    <nav className="no-print s-dock" aria-label={t('common.app.name')}>
      <SchemeLogo scheme={scheme} compact />
      {ITEMS.map((it) => (
        <a key={it.group} href={href(it.route)} className="s-dock-btn" aria-current={active === it.group ? 'page' : undefined} aria-label={t(it.key)}>
          {it.icon}{it.group === 'today' && due > 0 && <i className="s-dot" aria-hidden />}
        </a>
      ))}
      <a href={href('settings')} className="s-dock-btn" aria-label={t('common.nav.settings')}><Settings size={19} strokeWidth={1.9} /></a>
    </nav>
  );
}

/**
 * 06 — Structured's spine. The rail is a time axis, not a list of tabs:
 * today's date sits at the top and the rail's dot marks where you are.
 */
export function TimeRail({ route }: { route: Route }) {
  const t = useT();
  const lang = useLang();
  const { due, active } = useNavState(route);
  const now = new Date();
  const day = now.getDate();
  const month = lang === 'zh-CN' ? `${now.getMonth() + 1}月` : now.toLocaleString('en', { month: 'short' });
  return (
    <nav className="no-print s-rail" aria-label={t('common.app.name')}>
      <span className="s-rail-date"><strong>{day}</strong><small>{month}</small></span>
      <span className="s-rail-line" aria-hidden />
      {[...ITEMS, { group: 'settings' as Group, route: 'settings' as const, icon: <Settings size={19} strokeWidth={1.75} />, key: 'common.nav.settings' }].map((it) => (
        <a key={it.group} href={href(it.route)} className="s-rail-stop" aria-current={active === it.group ? 'page' : undefined}>
          <i aria-hidden />
          <span>{t(it.key)}{it.group === 'today' && due > 0 ? ` · ${due}` : ''}</span>
        </a>
      ))}
    </nav>
  );
}

/**
 * 08 — Notion's sidebar. Real pieces of work are listed as pages under Work,
 * because in this scheme the tree IS the navigation; a tab called "Work" that
 * hides its contents would be the wrong product.
 */
export function OutlineSidebar({ route }: { route: Route }) {
  const t = useT();
  const lang = useLang();
  const { due, active } = useNavState(route);
  const sessions = useStore(selectRealSessions).filter((s) => !s.sampleId).slice(0, 6);
  return (
    <nav className="no-print s-side" aria-label={t('common.app.name')}>
      <span className="s-side-head"><Search size={15} strokeWidth={2} />{lang === 'zh-CN' ? '搜索' : 'Search'}</span>
      <a href={href('today')} className="s-side-row" aria-current={active === 'today' ? 'page' : undefined}>
        <ChevronRight size={14} aria-hidden />{t('common.nav.today')}{due > 0 && <em>{due}</em>}
      </a>
      <a href={href('work')} className="s-side-row" aria-current={active === 'work' ? 'page' : undefined}>
        <ChevronRight size={14} aria-hidden />{t('common.nav.work')}
      </a>
      <span className="s-side-kids">
        {sessions.length === 0
          ? <em>{lang === 'zh-CN' ? '还没有页面' : 'No pages yet'}</em>
          : sessions.map((s) => <a key={s.id} href={`#/work/${s.id}`} className="s-side-kid">{s.title}</a>)}
      </span>
      <a href={href('you')} className="s-side-row" aria-current={active === 'you' ? 'page' : undefined}>
        <ChevronRight size={14} aria-hidden />{t('common.nav.you')}
      </a>
      <a href={href('settings')} className="s-side-row s-side-foot" aria-current={active === 'settings' ? 'page' : undefined}>
        <Settings size={14} strokeWidth={2} aria-hidden />{t('common.nav.settings')}
      </a>
    </nav>
  );
}

export function SchemeNav({ scheme, route, wide }: { scheme: Scheme; route: Route; wide: boolean }) {
  switch (scheme.nav) {
    case 'topbar':   return <TopBar route={route} scheme={scheme} />;
    case 'toolbar':  return <PlainToolbar route={route} />;
    case 'dock':     return <FloatingDock route={route} scheme={scheme} />;
    case 'railtime': return <TimeRail route={route} />;
    case 'sidebar':  return <OutlineSidebar route={route} />;
    case 'tabbar':
    default:         return <ChunkTabs route={route} />;
  }
  void wide;
}
