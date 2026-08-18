/**
 * Route table. WP0 owns this file — no other package edits it (§8).
 * Each lazy import points at a path a package will fill in; WP0 ships a
 * working placeholder at every one of those paths so the shell is never broken.
 */
import React, { lazy } from 'react';
import { AppShell } from './app/AppShell';
import { useRoute, navigate } from './router';
import { Button, EmptyState } from './ui';
import { useT } from './i18n';
import './i18n/common';
import './i18n/screens';

const HomeScreen         = lazy(() => import('./screens/home/HomeScreen'));
const VivaScreen         = lazy(() => import('./screens/viva/VivaScreen'));
const MapScreen          = lazy(() => import('./screens/map/MapScreen'));
const RecordScreen       = lazy(() => import('./screens/record/RecordScreen'));
const TranscriptScreen   = lazy(() => import('./screens/record/TranscriptScreen'));
const QueueScreen        = lazy(() => import('./screens/queue/QueueScreen'));
const ClassScreen        = lazy(() => import('./screens/class/ClassScreen'));
const CohortScreen       = lazy(() => import('./screens/class/CohortScreen'));
const StudentSheetScreen = lazy(() => import('./screens/class/StudentSheetScreen'));
const PacksScreen        = lazy(() => import('./screens/packs/PacksScreen'));
const PackDetailScreen   = lazy(() => import('./screens/packs/PackDetailScreen'));
const SettingsScreen     = lazy(() => import('./screens/settings/SettingsScreen'));
const ImportScreen       = lazy(() => import('./screens/import/ImportScreen'));
const UiGallery          = lazy(() => import('./screens/dev/UiGallery'));

function Outlet() {
  const route = useRoute();
  const t = useT();
  const p = route.params;

  switch (route.name) {
    case 'home':         return <HomeScreen />;
    case 'run':          return <VivaScreen key={p.sessionId} />;
    case 'map':          return <MapScreen key={p.sessionId} />;
    case 'record':       return <RecordScreen />;
    case 'transcript':   return <TranscriptScreen key={p.sessionId} />;
    case 'queue':        return <QueueScreen />;
    case 'class':        return <ClassScreen />;
    case 'cohort':       return <CohortScreen key={p.cohortId} />;
    case 'studentSheet': return <StudentSheetScreen key={p.submissionId} />;
    case 'packs':        return <PacksScreen />;
    case 'packDetail':   return <PackDetailScreen key={p.packId} />;
    case 'settings':     return <SettingsScreen />;
    case 'import':       return <ImportScreen />;
    case 'devUi':        return import.meta.env.DEV ? <UiGallery /> : <NotFound />;
    default:             return <NotFound />;
  }

  function NotFound() {
    return (
      <div className="col-read">
        <EmptyState
          title={t('common.state.notfound.title')}
          action={<Button variant="primary" onClick={() => navigate('home')}>{t('common.state.notfound.action')}</Button>}
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
