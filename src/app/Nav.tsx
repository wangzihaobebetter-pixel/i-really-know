import React from 'react';
import { PenLine, Files, User, Settings2 } from 'lucide-react';
import { href, ROUTE_GROUP, type Route } from '../router';
import { useT } from '../i18n';
import { useStore, selectDueTargets } from '../store';

type Group = 'today' | 'work' | 'you' | 'settings';

interface NavItem { group: Group; route: Parameters<typeof href>[0]; icon: React.ReactNode; key: string }

/**
 * v3 IA collapse (FABLE-REDESIGN.md §4.2).
 * Three tabs + gear: Today (今天) · Work (作业) · You (你) · ⚙ Settings.
 * The followups button is reached from Today, not a tab. Instructor
 * class/* screens are off the student nav entirely. Packs is no longer
 * a tab — packs are invisible infrastructure, surfaced only as a chip
 * on the bring screen.
 */
const ITEMS: NavItem[] = [
  { group: 'today',    route: 'today',    icon: <PenLine size={20} strokeWidth={1.75} />,    key: 'common.nav.today' },
  { group: 'work',     route: 'work',     icon: <Files size={20} strokeWidth={1.75} />,      key: 'common.nav.work' },
  { group: 'you',      route: 'you',      icon: <User size={20} strokeWidth={1.75} />,       key: 'common.nav.you' },
];

const SETTINGS_ITEM: NavItem = { group: 'settings', route: 'settings', icon: <Settings2 size={20} strokeWidth={1.75} />, key: 'common.nav.settings' };

function DueDot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', top: 6, right: '50%', transform: 'translateX(18px)',
      width: 8, height: 8, borderRadius: 'var(--r-pill)', background: 'var(--ink)',
    }} />
  );
}

export function NavRail({ route }: { route: Route }) {
  const t = useT();
  const due = useStore(selectDueTargets()).length;
  const active = ROUTE_GROUP[route.name];

  const item = (it: NavItem) => (
    <a
      key={it.group} href={href(it.route)}
      aria-current={active === it.group ? 'page' : undefined}
      style={{
        position: 'relative', display: 'grid', justifyItems: 'center', gap: 4,
        padding: '10px 0 8px', color: active === it.group ? 'var(--ink)' : 'var(--ink-3)',
        textDecoration: 'none', borderRadius: 'var(--r-control)',
        borderBottom: `2px solid ${active === it.group ? 'var(--action)' : 'transparent'}`,
        transition: 'color var(--dur-fast) var(--ease)',
      }}
    >
      {it.icon}
      <span className="t-micro">{t(it.key)}</span>
      {it.group === 'today' && <DueDot n={due} />}
    </a>
  );

  return (
    <nav
      className="no-print"
      aria-label={t('common.app.name')}
      style={{
        position: 'fixed', insetInline: 'auto', insetBlock: 0, left: 0, width: 'var(--rail-w)',
        background: 'var(--paper-2)', borderRight: '1px solid var(--hairline)',
        display: 'flex', flexDirection: 'column', gap: 2, padding: 'var(--space-5) 4px', zIndex: 30,
      }}
    >
      <div style={{ display: 'grid', gap: 2, flex: 1, alignContent: 'start' }}>{ITEMS.map(item)}</div>
      {item(SETTINGS_ITEM)}
    </nav>
  );
}

export function TabBar({ route }: { route: Route }) {
  const t = useT();
  const due = useStore(selectDueTargets()).length;
  const active = ROUTE_GROUP[route.name];
  const tabs: NavItem[] = [...ITEMS, SETTINGS_ITEM];

  return (
    <nav
      className="no-print"
      aria-label={t('common.app.name')}
      style={{
        position: 'fixed', insetInline: 0, bottom: 0, zIndex: 30,
        background: 'var(--paper-2)', borderTop: '1px solid var(--hairline)',
        display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((it) => (
        <a
          key={it.group} href={href(it.route)}
          aria-current={active === it.group ? 'page' : undefined}
          style={{
            position: 'relative', height: 'var(--tabbar-h)', display: 'grid', justifyItems: 'center',
            alignContent: 'center', gap: 2, textDecoration: 'none',
            color: active === it.group ? 'var(--ink)' : 'var(--ink-3)',
          }}
        >
          {it.icon}
          <span className="t-micro" style={{ fontSize: '.625rem' }}>{t(it.key)}</span>
          {it.group === 'today' && <DueDot n={due} />}
        </a>
      ))}
    </nav>
  );
}