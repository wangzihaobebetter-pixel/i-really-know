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
need(shell, /INSTRUCTOR[\s\S]*showStudentNav\s*=\s*!immersive\s*&&\s*!instructor/, 'student navigation is not removed inside the instructor workspace');
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
