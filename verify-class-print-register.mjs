/** Teacher document gate: evidence sheet + concept reteach map, printable and downloadable. */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const sheet = readFileSync('src/screens/class/StudentSheetScreen.tsx', 'utf8');
const reteach = readFileSync('src/screens/class/ReteachScreen.tsx', 'utf8');
const css = readFileSync('src/ui/ui.css', 'utf8') + readFileSync('src/styles/v4.css', 'utf8');
const failures = [];

for (const [name, source] of [['sheet', sheet], ['reteach', reteach]]) {
  if (!/<article className="doc"/.test(source)) failures.push(`${name}: printable document wrapper missing`);
  if (!/window\.print/.test(source)) failures.push(`${name}: browser print path missing`);
  if (!/exportElementPdf/.test(source)) failures.push(`${name}: direct PDF download missing`);
}
if (!/answer/.test(sheet) || !/anchor\.quote/.test(sheet)) failures.push('evidence sheet lost the student words or cited original span');
if (!/conceptLabel|conceptKey/.test(reteach) || /dimensionLabel|byDim/.test(reteach)) failures.push('reteach map is not concept-shaped');
if (!/deidentified|showNames/.test(reteach)) failures.push('reteach map lost its de-identified default and explicit reveal');
if (!/@media print/.test(css) || !/\.no-print/.test(css)) failures.push('print stylesheet does not hide controls');

mkdirSync('.tmp-teacher', { recursive: true });
for (const file of ['StudentSheetScreen.tsx', 'ReteachScreen.tsx']) {
  try { execSync(`npx esbuild src/screens/class/${file} --bundle --platform=browser --format=esm --outfile=.tmp-teacher/${file}.js`, { stdio: 'pipe' }); }
  catch { failures.push(`${file} no longer bundles independently`); }
}
rmSync('.tmp-teacher', { recursive: true, force: true });

console.log('verify-class-print-register: checked both local teacher documents, PDF, print and concept aggregation');
if (failures.length) { failures.forEach((f) => console.error('  ✗ ' + f)); process.exit(1); }
console.log('verify-class-print-register: teacher document register holds ✓');
