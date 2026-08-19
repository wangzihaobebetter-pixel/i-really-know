/**
 * PWA asset check. Chrome's --window-size crops instead of scaling, so an icon
 * can silently ship as a corner crop of a larger canvas — that happened once.
 * This asserts every declared icon exists at exactly its declared size.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC = 'public';
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
const problems = [];

function pngSize(path) {
  const d = readFileSync(path);
  if (d.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
}

for (const icon of manifest.icons) {
  const rel = icon.src.replace(/^\.\//, '');
  const path = join(PUBLIC, rel);
  if (!existsSync(path)) { problems.push(`missing ${rel}`); continue; }
  if (icon.sizes === 'any') { console.log(`  ${rel}: vector ✓`); continue; }
  const [w, h] = icon.sizes.split('x').map(Number);
  const actual = pngSize(path);
  if (!actual) { problems.push(`${rel} is not a PNG`); continue; }
  if (actual.w !== w || actual.h !== h) {
    problems.push(`${rel} declares ${icon.sizes} but is ${actual.w}x${actual.h}`);
  } else {
    console.log(`  ${rel}: ${actual.w}x${actual.h} ${icon.purpose} ✓`);
  }
}

if (!manifest.icons.some((i) => i.purpose === 'maskable')) problems.push('no maskable icon declared');
if (!existsSync(join(PUBLIC, 'sw.js'))) problems.push('missing sw.js');
if (manifest.display !== 'standalone') problems.push('manifest is not standalone');
if (manifest.start_url !== './' || manifest.scope !== './') problems.push('manifest paths are not GitHub Pages-relative');

const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
if (!sw.includes('/*__PRECACHE__*/')) problems.push('service worker has no emitted-asset precache marker');
if (!sw.includes('__BUILD_ID__')) problems.push('service worker cache is not versioned from build output');
const installBody = sw.match(/addEventListener\('install'[\s\S]*?\n\}\);/)?.[0] ?? '';
if (/\.catch\s*\(/.test(installBody)) problems.push('service worker suppresses precache failure instead of preserving the previous worker');
if (!existsSync('build-sw.mjs')) problems.push('missing emitted-asset service worker builder');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!pkg.scripts.build.includes('node build-sw.mjs')) problems.push('production build does not inject the offline asset list');

const html = readFileSync('index.html', 'utf8');
const htmlTheme = html.match(/name="theme-color" content="([^"]+)"/)?.[1];
if (htmlTheme && htmlTheme.toLowerCase() !== manifest.theme_color.toLowerCase()) {
  problems.push(`theme-color mismatch: index.html ${htmlTheme} vs manifest ${manifest.theme_color}`);
}

if (problems.length) {
  console.error(`verify-pwa: ${problems.length} problem(s)`);
  problems.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log('verify-pwa: manifest, icons and service worker all check out ✓');
