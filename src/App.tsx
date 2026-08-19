/**
 * Route table. WP0 owns this file — no other package edits it (§8).
 * Each lazy import points at a path a package will fill in; WP0 ships a
 * working placeholder at every one of those paths so the shell is never broken.
 *
 * v3 IA collapse (FABLE-REDESIGN.md §4.2). Three tabs + gear:
 *   Today (今天) · Work (作业) · You (你) · gear Settings.
 *   Follow-ups is reached from Today, not a tab. Instructor class/* screens
 *   are off the student's nav entirely. Packs, Record, Transcript, Import,
 *   Map, UiGallery screens are deleted or replaced by placeholders.
 */
import React, { lazy } from 'react';
import { AppShell } from './app/AppShell';
import { useRoute, navigate } from './router';
import { Button, EmptyState } from './ui';
import { useT } from './i18n';
import './i18n/common';
import './i18n/screens';
import './i18n/v3';

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
const WelcomeScreen     = lazy(() => import('./screens/welcome/WelcomeScreen'));

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
    case 'read':          return <ReadScreen key={p.id} />;
    case 'run':           return <VivaScreen key={p.sessionId} />;
    case 'result':        return <ResultScreen key={p.id} />;
    case 'work':          return <WorkScreen />;
    case 'workDetail':    return <WorkDetailScreen key={p.id} />;
    case 'you':           return <YouScreen />;
    case 'followups':     return <FollowupsScreen />;
    case 'welcome':       return <WelcomeScreen />;
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
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}