/**
 * Route table. WP0 owns this file — no other package edits it (§8).
 * Every lazy import points at a complete production surface; route-level suspense
 * keeps the offline-preloaded bundle responsive without shipping a component gallery.
 *
 * v4 IA collapse (FABLE-REDESIGN.md §4.2). Three tabs + gear:
 *   Today (今天) · Work (作业) · You (你) · gear Settings.
 *   Follow-ups is reached from Today, not a tab. Instructor class/* screens
 *   are off the student's nav entirely. Packs remain invisible infrastructure;
 *   Record, Transcript, Import, Map and UiGallery production routes are removed.
 */
import React, { lazy, useEffect, useState } from 'react';
import { AppShell } from './app/AppShell';
import { useRoute, navigate } from './router';
import { Button, EmptyState } from './ui';
import { useT } from './i18n';
import { useStore } from './store';
import './i18n/common';
import './i18n/screens';
import './i18n/v3';
import './i18n/v4';

// --- Student tabs / surfaces ---------------------------------------------
const TodayScreen       = lazy(() => import('./screens/today/TodayScreen'));
const WorkScreen        = lazy(() => import('./screens/work/WorkScreen'));
const WorkDetailScreen  = lazy(() => import('./screens/work/WorkDetailScreen'));
const YouScreen         = lazy(() => import('./screens/you/YouScreen'));
const FollowupsScreen   = lazy(() => import('./screens/followups/FollowupsScreen'));
const SettingsScreen    = lazy(() => import('./screens/settings/SettingsScreen'));

// --- Run-through + result + bring + read ----------------------------------
const BringScreen       = lazy(() => import('./screens/bring/BringScreen'));
const ReadScreen        = lazy(() => import('./screens/read/ReadScreen'));
const VivaScreen        = lazy(() => import('./screens/viva/VivaScreen'));
const ResultScreen      = lazy(() => import('./screens/result/ResultScreen'));
const WelcomeScreen = lazy(() => import('./screens/welcome/WelcomeScreen'));
const JoinScreen = lazy(() => import('./screens/join/JoinScreen'));
const ReturnScreen = lazy(() => import('./screens/return/ReturnScreen'));

// --- Instructor (off the student tab bar; reachable from Settings + URL) -
const ClassScreen        = lazy(() => import('./screens/class/ClassScreen'));
const CohortScreen       = lazy(() => import('./screens/class/CohortScreen'));
const StudentSheetScreen = lazy(() => import('./screens/class/StudentSheetScreen'));
const ReteachScreen      = lazy(() => import('./screens/class/ReteachScreen'));

function Outlet() {
  const route = useRoute();
  const t = useT();
  const p = route.params;

  switch (route.name) {
    case 'today':         return <TodayScreen />;
    case 'bring':         return <BringScreen />;
    case 'read':          return <ReadScreen key={p.sessionId} />;
    case 'run':           return <VivaScreen key={p.sessionId} />;
    case 'result':        return <ResultScreen key={p.sessionId} />;
    case 'work':          return <WorkScreen />;
    case 'workDetail':    return <WorkDetailScreen key={p.sessionId} />;
    case 'you':           return <YouScreen />;
    case 'followups':     return <FollowupsScreen />;
    case 'welcome': return <WelcomeScreen />;
    case 'join': return <JoinScreen />;
    case 'return': return <ReturnScreen />;
    case 'settings':      return <SettingsScreen />;
    case 'class':         return <ClassScreen />;
    case 'cohort':        return <CohortScreen key={p.cohortId} />;
    case 'studentSheet':  return <StudentSheetScreen key={p.submissionId} />;
    case 'reteach':       return <ReteachScreen key={p.cohortId} />;
    default:              return <NotFound />;
  }

  function NotFound() {
    return (
      <div className="col-read">
        <EmptyState
          title={t('common.state.notfound.title')}
          action={<Button variant="primary" onClick={() => navigate('today')}>{t('common.state.notfound.action')}</Button>}
        />
      </div>
    );
  }
}

export default function App() {
  const route = useRoute();
  const firstOpenSeen = useStore((state) => state.ui.firstOpenSeen);
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (hydrated && !firstOpenSeen && route.name === 'today') navigate('welcome');
  }, [hydrated, firstOpenSeen, route.name]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}