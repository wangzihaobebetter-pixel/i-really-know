/**
 * Every t('...') key must actually be registered. The compiler cannot catch
 * this: translate() falls back to returning the key, so a missing string ships
 * as literal "app.name" on screen. Found exactly that way in the browser.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("find src -name '*.tsx' -o -name '*.ts'", { encoding: 'utf8' })
  .trim().split('\n');

const registered = new Set();
for (const f of files.filter((x) => x.includes('/i18n/'))) {
  const src = readFileSync(f, 'utf8');
  for (const block of src.matchAll(/registerStrings\('([\w-]+)',\s*\{([\s\S]*?)\n\}\);/g)) {
    const pkg = block[1];
    for (const k of block[2].matchAll(/^\s{4}'?([\w.]+)'?:/gm)) {
      registered.add(k[1].startsWith(pkg + '.') ? k[1] : `${pkg}.${k[1]}`);
    }
  }
}

const used = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\*|\/\/)/.test(l)).join('\n');
  for (const m of code.matchAll(/\bt\('([\w.]+)'/g)) {
    if (!used.has(m[1])) used.set(m[1], f);
  }
  // template-literal keys, e.g. t(`preset.${p}`)
  for (const m of code.matchAll(/\bt\(`([\w.]+)\$\{/g)) {
    if (!used.has(m[1] + '*')) used.set(m[1] + '*', f);
  }
}

const missing = [];
for (const [key, file] of used) {
  if (key.endsWith('*')) {
    const prefix = key.slice(0, -1);
    if (![...registered].some((r) => r.startsWith(prefix))) missing.push([key, file]);
  } else if (!registered.has(key)) {
    missing.push([key, file]);
  }
}

console.log(`verify-i18n: ${registered.size} keys registered, ${used.size} used`);
if (missing.length) {
  console.error(`verify-i18n: ${missing.length} MISSING keys`);
  missing.forEach(([k, f]) => console.error(`  ✗ ${k}  (${f})`));
  process.exit(1);
}
console.log('verify-i18n: every key resolves ✓');
