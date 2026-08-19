/**
 * Hash router (spec §2.1). Hash, not history API: the app deploys to a GitHub
 * Pages project sub-path, and `base: './'` + deep links + refresh must all work.
 * WP0 owns this file and `src/App.tsx`.
 *
 * v3 IA collapse (FABLE-REDESIGN.md §4.2). 13 screens → 9. Five tabs collapse
 * to three (Today · Work · You) plus a gear. Packs, record, transcript, import,
 * map, queue, devUi routes are gone; their screens are deleted or replaced by
 * placeholders. Instructor class/... routes remain reachable by URL and from
 * Settings but are off the student tab bar.
 */
import { useSyncExternalStore, useCallback } from 'react';

export type RouteName =
  | 'today' | 'bring' | 'read' | 'run' | 'result' | 'work' | 'workDetail'
  | 'you' | 'followups' | 'welcome'
  | 'class' | 'cohort' | 'studentSheet' | 'reteach'
  | 'settings' | 'notfound';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
  hash: string;
}

interface Pattern { name: RouteName; segments: string[] }

const PATTERNS: Pattern[] = [
  { name: 'today',        segments: [] },
  { name: 'bring',        segments: ['bring'] },
  { name: 'read',         segments: ['read', ':id'] },
  { name: 'run',          segments: ['run', ':sessionId'] },
  { name: 'result',       segments: ['result', ':id'] },
  { name: 'work',         segments: ['work'] },
  { name: 'workDetail',   segments: ['work', ':id'] },
  { name: 'you',          segments: ['you'] },
  { name: 'followups',    segments: ['followups'] },
  { name: 'welcome',      segments: ['welcome'] },
  { name: 'class',        segments: ['class'] },
  { name: 'cohort',       segments: ['class', ':cohortId'] },
  { name: 'reteach',      segments: ['class', ':cohortId', 'reteach'] },
  { name: 'studentSheet', segments: ['class', ':cohortId', 's', ':submissionId'] },
  { name: 'settings',     segments: ['settings'] },
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

/** Which tab should read as active for a given route. */
export const ROUTE_GROUP: Record<RouteName, 'today' | 'work' | 'you' | 'followups' | 'class' | 'settings' | 'none'> = {
  today: 'today',
  bring: 'today',
  read: 'today',
  run: 'today',
  result: 'today',
  followups: 'today',
  work: 'work',
  workDetail: 'work',
  you: 'you',
  welcome: 'none',
  class: 'class',
  cohort: 'class',
  studentSheet: 'class',
  reteach: 'class',
  settings: 'settings',
  notfound: 'none',
};