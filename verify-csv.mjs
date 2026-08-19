import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
mkdirSync('.tmp-csv', { recursive: true });
execSync('npx esbuild src/lib/csv.ts --format=esm --outfile=.tmp-csv/csv.mjs', { stdio: 'pipe' });
const { parseRosterCsv } = await import('./.tmp-csv/csv.mjs');
const failures = [];
let parsed = parseRosterCsv('name,student_id,title,material\n"Lin, Yue",S1,"Methods ""A""","line one\nline two"\n');
if (parsed.rows.length !== 1 || parsed.rows[0].name !== 'Lin, Yue' || parsed.rows[0].title !== 'Methods "A"' || !parsed.rows[0].material.includes('\n')) failures.push('quoted commas, quotes or line breaks failed');
const many = ['name,material', ...Array.from({ length: 260 }, (_, index) => `Student ${index},work ${index}`)].join('\n');
parsed = parseRosterCsv(many);
if (parsed.rows.length > 250 || parsed.skipped < 10) failures.push('roster row bound is missing');
parsed = parseRosterCsv(`name,material\nStudent,"${'x'.repeat(50001)}"`);
if (parsed.rows.length !== 0 || parsed.skipped !== 1) failures.push('per-submission material bound is missing');
rmSync('.tmp-csv', { recursive: true, force: true });
console.log('verify-csv: checked RFC quoting plus roster and material bounds');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-csv: local roster input is bounded ✓');
