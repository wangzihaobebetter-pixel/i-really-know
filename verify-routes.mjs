/**
 * Route reachability gate.
 *
 * The bug this exists for: `today` is declared as `segments: []`, so `href()`
 * emits `#/` and `parseHash('#/today')` fell straight through to `notfound`.
 * The app's own main tab — the one labelled 今天/Today in the nav — was a dead
 * 404 when reached by URL, bookmark or paste. Twenty-three verifier scripts
 * were green while that was true, because not one of them ever asked whether a
 * route name could be reached from a URL a human would type.
 *
 * Two assertions, both cheap:
 *   1. every RouteName in the table round-trips href() -> parseHash()
 *   2. every route name is also reachable at `#/<name>` (or is explicitly
 *      listed below as parameterised / canonical-root only)
 */
import { readFileSync } from 'node:fs';

const src = readFileSync('src/router.ts', 'utf8');

const table = src.slice(src.indexOf('const PATTERNS'), src.indexOf('export function parseHash'));
const patterns = [...table.matchAll(/\{\s*name:\s*'([\w]+)',\s*segments:\s*\[([^\]]*)\]\s*\}/g)]
  .map(([, name, segs]) => ({
    name,
    segments: segs.split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean),
  }));

if (patterns.length < 15) {
  console.error(`verify-routes: only parsed ${patterns.length} patterns — the table shape changed`);
  process.exit(1);
}

/** Ports of href()/parseHash() so the gate tests the shipped table, not a copy. */
const href = (name, params = {}) => {
  const p = patterns.find((x) => x.name === name);
  if (!p) return '#/';
  return `#/${p.segments.map((s) => (s.startsWith(':') ? encodeURIComponent(params[s.slice(1)] ?? '') : s)).join('/')}`;
};
const parse = (hash) => {
  const parts = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0].split('/').filter(Boolean);
  for (const p of patterns) {
    if (p.segments.length !== parts.length) continue;
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const seg = p.segments[i];
      if (!seg.startsWith(':') && seg !== parts[i]) { ok = false; break; }
    }
    if (ok) return p.name;
  }
  return 'notfound';
};

const sample = { sessionId: 's1', cohortId: 'c1', submissionId: 'sub1', ticket: 'tkt1' };
const fails = [];

for (const p of new Set(patterns.map((x) => x.name))) {
  const got = parse(href(p, sample));
  if (got !== p) fails.push(`href('${p}') = ${href(p, sample)} parses back as '${got}', not '${p}'`);
}

/* Routes with no bare `#/<name>` form, and why. */
const PARAMETERISED = new Set(['read', 'run', 'result', 'workDetail', 'cohort', 'studentSheet', 'reteach', 'join', 'return']);
for (const p of new Set(patterns.map((x) => x.name))) {
  if (PARAMETERISED.has(p)) continue;
  const got = parse(`#/${p}`);
  if (got !== p) fails.push(`'#/${p}' is a 404 — a human typing the name of this screen lands on notfound`);
}

console.log(`verify-routes: ${patterns.length} patterns, ${new Set(patterns.map((x) => x.name)).size} route names checked`);
if (fails.length) {
  fails.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('verify-routes: every route name round-trips and every named screen is reachable by URL ✓');
