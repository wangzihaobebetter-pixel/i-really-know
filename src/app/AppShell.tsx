import React, { Suspense, useEffect, useState } from 'react';
import { useRoute, navigate, type Route } from '../router';
import { NavRail, TabBar } from './Nav';
import { ThemeProvider } from './theme';
import { ToastHost, Skeleton, EmptyState, Button, useToast } from '../ui';
import { useStore } from '../store';
import { useT } from '../i18n';

function useViewport() {
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 900));
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Routes that take over the screen: no rail, no tab bar (§2.2). */
const IMMERSIVE = new Set(['run']);

class RouteBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="col-read" style={{ padding: 'var(--space-8) var(--space-5)' }}>
        <EmptyState
          title="That screen failed to load."
          action={<Button variant="primary" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}>Back to Verify</Button>}
        />
        <pre className="t-mono t-small ink-3" style={{ whiteSpace: 'pre-wrap', marginTop: 'var(--space-6)' }}>
          {String(this.state.error?.message ?? this.state.error)}
        </pre>
      </div>
    );
  }
}

/** Runs the v1 import exactly once, after hydration, and reports it honestly. */
function V1MigrationGate() {
  const runV1Migration = useStore((s) => s.runV1Migration);
  const migrated = useStore((s) => s.ui.migratedV1);
  const toast = useToast();
  useEffect(() => {
    if (migrated) return;
    const n = runV1Migration();
    if (n > 0) toast.push(`Imported ${n} session${n === 1 ? '' : 's'} from v1.`, { tone: 'defended' });
  }, [migrated, runV1Migration, toast]);
  return null;
}

function KeyboardShortcuts({ route }: { route: Route }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (route.name === 'run') return;   // never yank the user out of a viva
      const map: Record<string, Parameters<typeof navigate>[0]> = {
        '1': 'home', '2': 'queue', '3': 'record', '4': 'class', '5': 'packs',
      };
      if (map[e.key]) { e.preventDefault(); navigate(map[e.key]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [route.name]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const route = useRoute();
  const wide = useViewport();
  const t = useT();
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  const immersive = IMMERSIVE.has(route.name);

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.hash]);
  useEffect(() => {
    if (hydrated && route.name !== 'run') useStore.getState().setUi({ lastRoute: route.hash });
  }, [route.hash, route.name, hydrated]);

  const padInline = wide ? `calc(var(--rail-w) + var(--gutter))` : 'var(--gutter-mobile)';
  const padBottom = !wide && !immersive ? `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-6))` : 'var(--space-8)';

  return (
    <ThemeProvider>
      <ToastHost>
        {hydrated && <V1MigrationGate />}
        <KeyboardShortcuts route={route} />
        {!immersive && (wide ? <NavRail route={route} /> : <TabBar route={route} />)}
        <main
          style={{
            paddingLeft: immersive ? 'var(--gutter-mobile)' : padInline,
            paddingRight: immersive ? 'var(--gutter-mobile)' : (wide ? 'var(--gutter)' : 'var(--gutter-mobile)'),
            paddingTop: 'var(--space-7)',
            paddingBottom: padBottom,
            minHeight: '100dvh',
          }}
        >
          {!hydrated ? (
            <div className="col-read stack" aria-label={t('common.state.loading')}>
              <Skeleton height={44} width="60%" />
              <Skeleton lines={3} />
              <Skeleton height={180} />
            </div>
          ) : (
            <RouteBoundary onReset={() => navigate('home')}>
              <Suspense fallback={<div className="col-read stack"><Skeleton lines={4} /><Skeleton height={160} /></div>}>
                {children}
              </Suspense>
            </RouteBoundary>
          )}
        </main>
      </ToastHost>
    </ThemeProvider>
  );
}
