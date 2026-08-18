import React from 'react';
import { PenLine, RotateCcw, Files, Users, Layers, Settings2 } from 'lucide-react';
import { href, ROUTE_GROUP, type Route } from '../router';
import { useT } from '../i18n';
import { useStore, selectDueTargets } from '../store';

type Group = 'verify' | 'queue' | 'record' | 'class' | 'packs' | 'settings';

interface NavItem { group: Group; route: Parameters<typeof href>[0]; icon: React.ReactNode; key: string }

const ITEMS: NavItem[] = [
  { group: 'verify',   route: 'home',     icon: <PenLine size={20} strokeWidth={1.75} />,    key: 'common.nav.verify' },
  { group: 'queue',    route: 'queue',    icon: <RotateCcw size={20} strokeWidth={1.75} />,  key: 'common.nav.queue' },
  { group: 'record',   route: 'record',   icon: <Files size={20} strokeWidth={1.75} />,      key: 'common.nav.record' },
  { group: 'class',    route: 'class',    icon: <Users size={20} strokeWidth={1.75} />,      key: 'common.nav.class' },
  { group: 'packs',    route: 'packs',    icon: <Layers size={20} strokeWidth={1.75} />,     key: 'common.nav.packs' },
];

const SETTINGS_ITEM: NavItem = { group: 'settings', route: 'settings', icon: <Settings2 size={20} strokeWidth={1.75} />, key: 'common.nav.settings' };

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="t-mono t-num" style={{
      position: 'absolute', top: 4, right: 12, minWidth: 16, height: 16, padding: '0 4px',
      borderRadius: 'var(--r-pill)', background: 'var(--shaky)', color: 'var(--paper)',
      fontSize: '.6875rem', display: 'grid', placeItems: 'center', lineHeight: 1,
    }}>{n > 99 ? '99+' : n}</span>
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
      {it.group === 'queue' && <Badge n={due} />}
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
      <div style={{ display: 'grid', gap: 2, flex: 1 }}>{ITEMS.map(item)}</div>
      {item(SETTINGS_ITEM)}
    </nav>
  );
}

export function TabBar({ route }: { route: Route }) {
  const t = useT();
  const due = useStore(selectDueTargets()).length;
  const active = ROUTE_GROUP[route.name];
  const tabs = [ITEMS[0], ITEMS[1], ITEMS[2], ITEMS[3], SETTINGS_ITEM];

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
          {it.group === 'queue' && <Badge n={due} />}
        </a>
      ))}
    </nav>
  );
}
