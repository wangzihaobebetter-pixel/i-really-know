/** Every CSS custom property used by the shipped UI must resolve somewhere. */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find src -name '*.css' -o -name '*.tsx' -o -name '*.ts'", { encoding: 'utf8' }).trim().split('\n');
const css = files.filter((file) => file.endsWith('.css')).map((file) => readFileSync(file, 'utf8')).join('\n');
const code = files.filter((file) => !file.endsWith('.css')).map((file) => readFileSync(file, 'utf8')).join('\n');
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
for (const match of code.matchAll(/['"](--[\w-]+)['"]\s*(?:as\s+string)?\s*:/g)) defined.add(match[1]);
const missing = new Set();
for (const match of css.matchAll(/var\((--[\w-]+)([^)]*)\)/g)) {
  const [, name, rest] = match;
  if (!defined.has(name) && !rest.includes(',')) missing.add(name);
}
console.log(`verify-css-vars: ${defined.size} declared custom properties checked`);
if (missing.size) {
  [...missing].sort().forEach((name) => console.error(`  ✗ ${name} is used but never declared and has no fallback`));
  process.exit(1);
}
console.log('verify-css-vars: every shipped CSS variable resolves ✓');
