/**
 * Hash router (spec §2.1). Hash, not history API: the app deploys to a GitHub
 * Pages project sub-path, and `base: './'` + deep links + refresh must all work.
 * WP0 owns this file and `src/App.tsx`.
 */
import { useSyncExternalStore, useCallback } from 'react';

export type RouteName =
  | 'home' | 'run' | 'map' | 'record' | 'transcript' | 'queue'
  | 'class' | 'cohort' | 'studentSheet' | 'reteach' | 'packs' | 'packDetail'
  | 'settings' | 'import' | 'devUi' | 'notfound';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
  hash: string;
}

interface Pattern { name: RouteName; segments: string[] }

const PATTERNS: Pattern[] = [
  { name: 'home',         segments: [] },
  { name: 'run',          segments: ['run', ':sessionId'] },
  { name: 'map',          segments: ['map', ':sessionId'] },
  { name: 'record',       segments: ['record'] },
  { name: 'transcript',   segments: ['record', ':sessionId'] },
  { name: 'queue',        segments: ['queue'] },
  { name: 'class',        segments: ['class'] },
  { name: 'cohort',       segments: ['class', ':cohortId'] },
  { name: 'reteach',      segments: ['class', ':cohortId', 'reteach'] },
  { name: 'studentSheet', segments: ['class', ':cohortId', 's', ':submissionId'] },
  { name: 'packs',        segments: ['packs'] },
  { name: 'packDetail',   segments: ['packs', ':packId'] },
  { name: 'settings',     segments: ['settings'] },
  { name: 'import',       segments: ['import'] },
  { name: 'devUi',        segments: ['dev', 'ui'] },
];

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0];
  const parts = clean ? clean.split('/').filter(Boolean) : [];

  for (const pattern of PATTERNS) {
    if (pattern.segments.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const seg = pattern.segments[i];
      if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]);
      else if (seg !== parts[i]) { ok = false; break; }
    }
    if (ok) return { name: pattern.name, params, hash };
  }
  return { name: 'notfound', params: {}, hash };
}

export function href(name: RouteName, params: Record<string, string> = {}): string {
  const pattern = PATTERNS.find((p) => p.name === name);
  if (!pattern) return '#/';
  const path = pattern.segments
    .map((s) => (s.startsWith(':') ? encodeURIComponent(params[s.slice(1)] ?? '') : s))
    .join('/');
  return `#/${path}`;
}

export function navigate(name: RouteName, params?: Record<string, string>): void {
  const target = href(name, params);
  if (window.location.hash !== target) window.location.hash = target;
}

export function replace(name: RouteName, params?: Record<string, string>): void {
  const target = href(name, params);
  const url = `${window.location.pathname}${window.location.search}${target}`;
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function snapshot() {
  return window.location.hash || '#/';
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot, () => '#/');
  return parseHash(hash);
}

export function useNavigate() {
  return useCallback(
    (name: RouteName, params?: Record<string, string>) => navigate(name, params),
    [],
  );
}

/** Which rail/tab item should read as active for a given route. */
export const ROUTE_GROUP: Record<RouteName, 'verify' | 'queue' | 'record' | 'class' | 'packs' | 'settings' | 'none'> = {
  home: 'verify', run: 'verify', map: 'verify', import: 'verify',
  queue: 'queue',
  record: 'record', transcript: 'record',
  class: 'class', cohort: 'class', studentSheet: 'class', reteach: 'class',
  packs: 'packs', packDetail: 'packs',
  settings: 'settings',
  devUi: 'none', notfound: 'none',
};
