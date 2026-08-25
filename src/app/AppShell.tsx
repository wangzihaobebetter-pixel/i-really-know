import React, { Suspense, useEffect, useState } from 'react';
import { useRoute, navigate, type Route } from '../router';
import { NavRail, SettingsOrb, TabBar } from './Nav';
import { SchemeNav } from './NavVariants';
import { activeScheme, DEFAULT_SCHEME } from './scheme';
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
const IMMERSIVE = new Set(['bring', 'run', 'read', 'result', 'welcome', 'join']);
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
  /* Read once. index.html already wrote data-ui before first paint, so the
     scheme cannot change under a mounted tree — switching goes through a
     reload, exactly like a theme that ships in the HTML. */
  const scheme = React.useMemo(() => activeScheme(), []);
  const schemed = scheme.id !== DEFAULT_SCHEME.id;

  /* Publish the four structural axes on <html> so shapes.css can lay the whole
     product out per axis instead of ten near-identical copies of the same CSS. */
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-nav', scheme.nav);
    el.setAttribute('data-home', scheme.home);
    el.setAttribute('data-run', scheme.run);
    el.setAttribute('data-logo', scheme.logo);
  }, [scheme]);
  const t = useT();
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  const immersive = IMMERSIVE.has(route.name);
  const instructor = INSTRUCTOR.has(route.name);

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route.hash]);
  useEffect(() => {
    if (hydrated && route.name !== 'run') useStore.getState().setUi({ lastRoute: route.hash });
  }, [route.hash, route.name, hydrated]);

  /* Duolingo, Blinkist and Headspace clear the screen for a run-through;
     Quizlet, Anki, Speechify, Structured, Notion and Brilliant keep their
     chrome on. That is a per-scheme decision, not a global one (§2.2 held for
     the base product and stays the default). */
  const showStudentNav = schemed
    ? (!instructor && (scheme.navInRun || !immersive) && route.name !== 'welcome' && route.name !== 'join')
    : (!immersive && !instructor);

  const sideNav = schemed && (scheme.nav === 'sidebar' || scheme.nav === 'railtime');
  const topNav = schemed && (scheme.nav === 'topbar' || scheme.nav === 'toolbar');
  const bottomNav = schemed ? (scheme.nav === 'tabbar' || scheme.nav === 'dock') : true;

  const padInline = schemed
    ? (sideNav && showStudentNav && wide ? 'calc(var(--s-side-w) + var(--gutter))' : (wide ? 'var(--gutter)' : 'var(--gutter-mobile)'))
    : (wide && showStudentNav ? `calc(var(--rail-w) + var(--gutter))` : (wide ? 'var(--gutter)' : 'var(--gutter-mobile)'));
  const padBottom = schemed
    ? (bottomNav && showStudentNav ? 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-6))' : 'var(--space-8)')
    : (!wide && showStudentNav ? `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-6))` : 'var(--space-8)');
  const padTop = schemed && topNav && showStudentNav ? 'calc(var(--s-top-h) + var(--space-5))' : 'var(--space-7)';

  return (
    <ThemeProvider>
      <ToastHost>
        {hydrated && <V1MigrationGate />}
        {showStudentNav && (schemed
          ? <SchemeNav scheme={scheme} route={route} wide={wide} />
          : (wide ? <NavRail route={route} /> : <><TabBar route={route} />{route.name !== 'settings' && <SettingsOrb />}</>))}
        <main
          data-surface={instructor ? 'instructor' : immersive ? 'immersive' : 'student'}
          style={{
            paddingLeft: immersive ? 'var(--gutter-mobile)' : padInline,
            paddingRight: immersive ? 'var(--gutter-mobile)' : (wide ? 'var(--gutter)' : 'var(--gutter-mobile)'),
            paddingTop: padTop,
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