import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
mkdirSync('.tmp-router', { recursive: true });
execSync('npx esbuild src/router.ts --bundle --platform=node --format=esm --outfile=.tmp-router/router.mjs', { stdio: 'pipe' });
const { parseHash, href } = await import('./.tmp-router/router.mjs');
const failures = [];
if (parseHash('#/join/%').name !== 'notfound') failures.push('malformed percent encoding did not fail closed');
if (parseHash('#/return/%E0%A4%A').name !== 'notfound') failures.push('truncated UTF-8 escape did not fail closed');
const encoded = href('join', { ticket: 'g.a/b+c=' });
if (parseHash(encoded).params.ticket !== 'g.a/b+c=') failures.push('valid encoded route parameter did not round-trip');
rmSync('.tmp-router', { recursive: true, force: true });
console.log('verify-router: checked valid round-trip and malformed untrusted hashes');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-router: hash decoding fails closed ✓');
