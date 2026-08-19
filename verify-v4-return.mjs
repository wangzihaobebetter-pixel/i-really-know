/** Zero-backend teacher loop: teacher link out, result link back, local evidence updated. */
import { existsSync, readFileSync } from 'node:fs';
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const types = read('src/types/index.ts');
const result = read('src/screens/result/ResultScreen.tsx');
const join = read('src/screens/join/JoinScreen.tsx');
const returned = read('src/screens/return/ReturnScreen.tsx');
const sheet = read('src/screens/class/StudentSheetScreen.tsx');
const reteach = read('src/screens/class/ReteachScreen.tsx');
const router = read('src/router.ts') + read('src/App.tsx');
const links = read('src/lib/student-links.ts');
const failures = [];
if (!/answer/.test(types.match(/interface ResultTicket[\s\S]*?\n}/)?.[0] || '')) failures.push('ResultTicket does not carry the student’s own words');
if (!/encodeResultTicket|resultLink/.test(result)) failures.push('student result has no self-contained return path');
if (!/cohortId:\s*ticket\.cohortId|cohortId:\s*ticket\.session\.cohortId/.test(join)) failures.push('joined run loses the local roster return address');
if (!/name:\s*'return'/.test(router) || !/ReturnScreen/.test(router)) failures.push('teacher cannot open a returned result link');
if (!/decodeResultTicket/.test(returned) || !/updateSession/.test(returned) || !/updateSubmission/.test(returned)) failures.push('returned result does not update the teacher’s local evidence');
if (!/resultReview:\s*'unverified'/.test(returned) || !/resultReview:\s*'reviewed'/.test(sheet)) failures.push('returned evidence has no explicit instructor review gate');
if (!/resultReview === 'reviewed'/.test(reteach)) failures.push('unreviewed returned evidence can leak into the class map');
if (!/encodeResultTicket/.test(links) || !/decodeResultTicket/.test(links)) failures.push('return link has no bounded codec');
console.log('verify-v4-return: checked answer payload, return route and local evidence merge');
if (failures.length) { failures.forEach((failure) => console.error('  ✗ ' + failure)); process.exit(1); }
console.log('verify-v4-return: zero-backend teacher loop closes ✓');
