/**
 * Hash router (spec §2.1). Hash, not history API: the app deploys to a GitHub
 * Pages project sub-path, and `base: './'` + deep links + refresh must all work.
 * WP0 owns this file and `src/App.tsx`.
 *
 * v3 IA collapse (FABLE-REDESIGN.md §4.2). 13 screens → 9. Five tabs collapse
 * to three (Today · Work · You) plus a gear. Packs, record, transcript, import,
 * map, queue and devUi routes are gone. Instructor class/... routes remain reachable by URL and from
 * Settings but are off the student tab bar.
 */
import { useSyncExternalStore, useCallback } from 'react';

export type RouteName =
  | 'today' | 'bring' | 'read' | 'run' | 'result' | 'work'
  | 'you' | 'welcome'
  | 'class' | 'cohort' | 'studentSheet' | 'reteach'
  | 'join' | 'return'
  | 'settings' | 'schemes' | 'notfound';

/**
 * Reserved `run` session id meaning "the returning questions" rather than a
 * stored session. Lives here so screens can reach it without importing App,
 * which lazy-imports them back.
 */
export const FOLLOWUPS_ID = 'followups';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
  hash: string;
}

interface Pattern { name: RouteName; segments: string[] }

const PATTERNS: Pattern[] = [
  { name: 'today',        segments: [] },
  { name: 'bring',        segments: ['bring'] },
  { name: 'read',         segments: ['read', ':sessionId'] },
  /* `run` is the one place a question gets answered. A follow-up is a
     run-through of a single returning question, so it lives here too, under
     the reserved id `followups` — brief §6.4 puts the due list on 今天 and
     gives the student one answering surface, not two that look alike. */
  { name: 'run',          segments: ['run', ':sessionId'] },
  { name: 'result',       segments: ['result', ':sessionId'] },
  { name: 'work',         segments: ['work'] },
  /* Not a second screen: `作业` with one piece open. href('work') still emits
     `#/work` because the bare pattern is declared first, so the tab link is
     unchanged and the deep link to a single piece keeps working. */
  { name: 'work',         segments: ['work', ':sessionId'] },
  { name: 'you',          segments: ['you'] },
  { name: 'join',         segments: ['join', ':ticket'] },
  { name: 'return',       segments: ['return', ':ticket'] },
  { name: 'welcome',      segments: ['welcome'] },
  { name: 'class',        segments: ['class'] },
  { name: 'cohort',       segments: ['class', ':cohortId'] },
  { name: 'reteach',      segments: ['class', ':cohortId', 'reteach'] },
  { name: 'studentSheet', segments: ['class', ':cohortId', 's', ':submissionId'] },
  { name: 'settings',     segments: ['settings'] },
  /* v7 gallery: the ten grounded UI schemes, side by side, each switchable.
     Off every nav — reached from Settings and by URL, like the instructor
     screens. It is a chooser for Wang, not a product surface for a student. */
  { name: 'schemes',      segments: ['schemes'] },
  /**
   * Alias, deliberately last. `today` is canonically `#/` (href() returns the
   * first pattern matching a name, so links stay `#/`), but `#/today` is the
   * URL a human types, bookmarks and pastes — the tab is literally labelled
   * 今天/Today. Before this line it fell through to `notfound`, so the app's
   * own main tab was a dead 404 when reached by URL. parseHash accepts both.
   */
  { name: 'today',        segments: ['today'] },
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
      if (seg.startsWith(':')) {
        try { params[seg.slice(1)] = decodeURIComponent(parts[i]); }
        catch { ok = false; break; }
      }
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
export const ROUTE_GROUP: Record<RouteName, 'today' | 'work' | 'you' | 'class' | 'settings' | 'none'> = {
  today: 'today',
  bring: 'today',
  read: 'today',
  run: 'today',
  result: 'today',
  work: 'work',
  you: 'you',
  welcome: 'none',
  join: 'none',
  return: 'none',
  class: 'class',
  cohort: 'class',
  studentSheet: 'class',
  reteach: 'class',
  settings: 'settings',
  schemes: 'settings',
  notfound: 'none',
};