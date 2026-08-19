import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';
const SW = join(DIST, 'sw.js');
const marker = '/*__PRECACHE__*/';
const buildMarker = '__BUILD_ID__';

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

const assets = filesUnder(DIST)
  .map((file) => relative(DIST, file).split(sep).join('/'))
  .filter((file) => !['sw.js', 'index.html', 'manifest.webmanifest'].includes(file) && !file.startsWith('.'))
  .sort()
  .map((file) => JSON.stringify(`./${file}`))
  .join(',\n  ');

const source = readFileSync(SW, 'utf8');
if (!source.includes(marker) || !source.includes(buildMarker)) throw new Error('Missing service-worker build markers');
const buildId = createHash('sha256').update(assets).digest('hex').slice(0, 12);
writeFileSync(SW, source.replace(marker, assets).replace(buildMarker, buildId));
console.log(`build-sw: cache ${buildId} precaches ${assets ? assets.split(',\n').length : 0} emitted assets`);
