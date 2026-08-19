import React, { Suspense, useEffect, useState } from 'react';
import { useRoute, navigate, type Route } from '../router';
import { NavRail, SettingsOrb, TabBar } from './Nav';
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
const IMMERSIVE = new Set(['bring', 'run', 'read', 'result', 'followups', 'welcome', 'join']);
const INSTRUCTOR = new Set(['class', 'cohort', 'studentSheet', 'reteach', 'return']);

class RouteBoundary extends React.Component<{ children: React.ReactNode; onReset: () => void; errorTitle: string; errorAction: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="col-read" style={{ padding: 'var(--space-8) var(--space-5)' }}>
        <EmptyState
          title={this.props.errorTitle}
          action={<Button variant="primary" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}>{this.props.errorAction}</Button>}
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
  const t = useT();
  useEffect(() => {
    if (migrated) return;
    const n = runV1Migration();
    if (n > 0) toast.push(t('shell4.migrated', { n }), { tone: 'defended' });
  }, [migrated, runV1Migration, toast, t]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const route = useRoute();
  const wide = useViewport();
  const t = useT();
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  const immersive = IMMERSIVE.has(route.name);
  const instructor = INSTRUCTOR.has(route.name);

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.hash]);
  useEffect(() => {
    if (hydrated && route.name !== 'run') useStore.getState().setUi({ lastRoute: route.hash });
  }, [route.hash, route.name, hydrated]);

  const showStudentNav = !immersive && !instructor;
  const padInline = wide && showStudentNav ? `calc(var(--rail-w) + var(--gutter))` : (wide ? 'var(--gutter)' : 'var(--gutter-mobile)');
  const padBottom = !wide && showStudentNav ? `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-6))` : 'var(--space-8)';

  return (
    <ThemeProvider>
      <ToastHost>
        {hydrated && <V1MigrationGate />}
        {showStudentNav && (wide ? <NavRail route={route} /> : <><TabBar route={route} />{route.name !== 'settings' && <SettingsOrb />}</>)}
        <main
          data-surface={instructor ? 'instructor' : immersive ? 'immersive' : 'student'}
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
            <RouteBoundary
              onReset={() => navigate('today')}
              errorTitle={t('common.state.error.title')}
              errorAction={t('common.state.notfound.action')}
            >
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