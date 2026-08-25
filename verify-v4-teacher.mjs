/** Teacher half contract — task brief §§6.6, 7 and 12. */
import { existsSync, readFileSync } from 'node:fs';
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const classScreen = read('src/screens/class/ClassScreen.tsx');
const cohort = read('src/screens/class/CohortScreen.tsx');
const sheet = read('src/screens/class/StudentSheetScreen.tsx');
const reteach = read('src/screens/class/ReteachScreen.tsx');
const settings = read('src/screens/settings/SettingsScreen.tsx');
const router = read('src/router.ts');
const app = read('src/App.tsx');
const shell = read('src/app/AppShell.tsx');
const pdf = read('src/lib/pdf.ts');
const failures = [];
const need = (value, re, message) => { if (!re.test(value)) failures.push(message); };
const forbid = (value, re, message) => { if (re.test(value)) failures.push(message); };
need(settings, /nav\('class'\)/, 'teacher half has no explicit entrance from Settings');
/* v7 · showStudentNav became a ternary: schemes decide for themselves whether
   their chrome survives a run-through. The invariant this gate exists to hold
   is unchanged and must survive that — no branch may leave student navigation
   on inside the instructor workspace. So instead of matching one literal
   expression, require every leaf of the ternary chain to carry !instructor:
   n conditionals have n+1 leaves, so n+1 guards is the floor. */
need(shell, /INSTRUCTOR/, 'the instructor route set is gone from the shell');
const navAssign = shell.match(/const showStudentNav\s*=([\s\S]*?);\n/);
if (!navAssign) failures.push('showStudentNav is no longer assigned in the shell');
else {
  const expr = navAssign[1];
  const guards = (expr.match(/!instructor/g) || []).length;
  const leaves = (expr.match(/\?/g) || []).length + 1;
  if (guards < leaves) failures.push(`student navigation is not removed inside the instructor workspace: ${guards} !instructor guard(s) for ${leaves} branch(es)`);
}
need(classScreen + cohort, /parseRosterCsv|accept=["']\.csv/, 'teacher half has no roster CSV import');
need(cohort, /MAX_COHORT_SUBMISSIONS\s*=\s*250[\s\S]*submissions\.length/, 'repeated imports can grow a local cohort without a bound');
need(cohort, /studentLink|createStudentTicket|copyShareLink/, 'each student needs a self-contained share link');
need(router + app, /name:\s*'join'[\s\S]*JoinScreen|JoinScreen[\s\S]*case 'join'/, 'shared links need an import route that works without an account');
need(sheet + reteach, /exportElementPdf/, 'documents need a direct PDF download in addition to print');
need(pdf, /MAX_RENDER_PIXELS[\s\S]*throw new Error/, 'direct PDF rendering has no memory bound');
need(reteach, /conceptLabel|conceptKey/, 'reteach map must aggregate concepts');
forbid(reteach, /dimensionLabel|byDim|dimensionId/, 'reteach map is still grouped by internal dimensions');
need(sheet, /p\.answer/, 'evidence sheet must preserve the student’s own words');
need(sheet, /p\.anchor\.quote/, 'evidence sheet must preserve the exact source span');
forbid(sheet, /Math\.round\([^\n]*100|%/, 'student evidence sheet must not contain a percentage');
console.log('verify-v4-teacher: checked CSV, links, join, direct PDF, evidence and concept map');
if (failures.length) {
  console.error(`verify-v4-teacher: ${failures.length} failure(s)`);
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log('verify-v4-teacher: independent teacher half holds ✓');
