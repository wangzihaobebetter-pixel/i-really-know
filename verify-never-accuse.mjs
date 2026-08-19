/**
 * "Never accuse", enforced as a build-time lint. P3 §5.2.
 *
 * The moat is not the ethic, it is the evidence. Detectors output "87%
 * AI-generated" — unfalsifiable and litigable. This product outputs "the
 * student could not defend line 23 of their own submission" — student present,
 * evidence-based, survives an appeal. That distinction stops being real the
 * moment one string on an instructor surface says "suspicious".
 *
 * SCOPE — this reads THE APP'S OWN STRINGS ONLY, never student-submitted
 * content. Linting submissions would flag a student who wrote the word
 * "plagiarism" in an essay about plagiarism, which is the same category error
 * the product exists to avoid.
 *
 * TWO CHECKS:
 *   1. DENYLIST, bilingual. No instructor-surface string may contain an
 *      accusation term or a probability/percentage of authorship.
 *   2. CLOSED VERB LIST. Any string that reports an OUTCOME must use one of
 *      the six permitted forms. This is the narrower check and it applies to
 *      the verdict vocabulary rather than to prose.
 *
 * COST, stated: a bilingual denylist has to be maintained, and it will
 * occasionally block a legitimate phrasing and need an explicit allow. The
 * allow list is at the bottom of this file and every entry needs a reason.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import ts from 'typescript';

/** i18n packages that render on an instructor surface. */
const INSTRUCTOR_PACKAGES = [
  'sheet', 'reteach', 'teacher4', 'class', 'return4',
  'common', 'import', 'bring4', 'map', 'viva',
];

/** Screens whose literal JSX text is also instructor-facing. */
const INSTRUCTOR_SCREENS = [
  'src/screens/class/ClassScreen.tsx',
  'src/screens/class/CohortScreen.tsx',
  'src/screens/class/StudentSheetScreen.tsx',
  'src/screens/class/ReteachScreen.tsx',
  'src/screens/return/ReturnScreen.tsx',
];

/**
 * STUDENT PACKAGES — FABLE-REDESIGN §8 row M11 extends the never-accuse gate
 * to student surfaces too. The kill list (§1.1) calls out exactly the words
 * the owner rejected as 「极度冰冷和粗糙」: accuse, illusion, borrowed,
 * wrong about yourself, not yours. These cannot appear on any string the
 * student reads.
 *
 * These are every namespace used by the current routed student product.
 */
const STUDENT_PACKAGES = [
  'v5', 'common', 'settings',
  'today4', 'bring4', 'read4', 'result4', 'work4', 'you4',
  'welcome4', 'run4', 'follow4', 'teacher4', 'shell4', 'join4',
];
const STUDENT_SCREENS = [
  'src/screens/welcome/WelcomeScreen.tsx',
  'src/screens/today/TodayScreen.tsx',
  'src/screens/bring/BringScreen.tsx',
  'src/screens/read/ReadScreen.tsx',
  'src/screens/viva/VivaScreen.tsx',
  'src/screens/followups/FollowupsScreen.tsx',
  'src/screens/result/ResultScreen.tsx',
  'src/screens/work/WorkScreen.tsx',
  'src/screens/work/WorkDetailScreen.tsx',
  'src/screens/you/YouScreen.tsx',
  'src/screens/settings/SettingsScreen.tsx',
  'src/screens/join/JoinScreen.tsx',
];

/** Student-surface denylist. Each term maps to a reason. */
const STUDENT_DENY = [
  { re: /\baccuse[sd]?\b/i,                 why: 'student-facing accusation' },
  { re: /\baccusation[s]?\b/i,              why: 'student-facing accusation' },
  { re: /\billusion[s]?\b/i,                why: 'retired student-facing term' },
  { re: /\bborrowed\b/i,                    why: 'retired student-facing term' },
  { re: /wrong about yourself/i,             why: 'retired student-facing phrase' },
  { re: /\bnot\s+yours\b/i,                why: 'retired student-facing phrase' },
  // Chinese
  { re: /指控/,                               why: 'student-facing accusation' },
  { re: /幻觉/,                               why: 'retired student-facing term' },
  { re: /借用/,                               why: 'retired student-facing term' },
  { re: /不是你的/,                            why: 'retired student-facing phrase' },
  { re: /你自己.{0,4}判断错/,                  why: 'retired student-facing phrase' },
];

const DENY = [
  // English
  { re: /\bcheat(s|ed|ing|er)?\b/i,            why: 'accusation' },
  { re: /\bplagiaris(m|e|ed|ing|t)\b/i,        why: 'accusation' },
  { re: /\bAI[- ]generated\b/i,                why: 'authorship claim' },
  { re: /\bmachine[- ]generated\b/i,           why: 'authorship claim' },
  { re: /\bdishonest(y)?\b/i,                  why: 'accusation' },
  { re: /\bmisconduct\b/i,                     why: 'accusation' },
  { re: /\bsuspicious\b/i,                     why: 'accusation' },
  { re: /\bsuspect(ed|s)?\b/i,                 why: 'accusation' },
  { re: /\bfake\b/i,                           why: 'accusation' },
  { re: /\bfraud(ulent)?\b/i,                  why: 'accusation' },
  { re: /\bdetector\b/i,                       why: 'positions the product as a detector' },
  { re: /\bdetection\s+(score|rate|tool)\b/i,  why: 'positions the product as a detector' },
  { re: /\bdid\s+not\s+write\b/i,              why: 'authorship claim' },
  { re: /\bnot\s+(their|his|her)\s+own\s+work\b/i, why: 'authorship claim' },
  { re: /\bcopied\b/i,                         why: 'accusation' },
  // Chinese
  { re: /作弊/,                                 why: 'accusation' },
  { re: /抄袭/,                                 why: 'accusation' },
  { re: /代写/,                                 why: 'authorship claim' },
  { re: /AI\s*生成/,                            why: 'authorship claim' },
  { re: /机器生成/,                              why: 'authorship claim' },
  { re: /可疑/,                                 why: 'accusation' },
  { re: /造假/,                                 why: 'accusation' },
  { re: /检测器/,                                why: 'positions the product as a detector' },
  { re: /学术不端/,                              why: 'accusation' },
  { re: /不是.{0,4}本人写/,                       why: 'authorship claim' },
];

/**
 * P3 §5.1: no percentage anywhere on an instructor artefact. The stated reason
 * is that "a number is disputed on appeal; an evidence row is read" — which is
 * a rule about numbers describing THIS STUDENT.
 *
 * P3 §5.3.3 simultaneously REQUIRES a footnote carrying the Knof 2024
 * distribution (18.5% / 35.5% / 46.0%, N=426) so the instructor can read this
 * student's gap against a published baseline instead of against a hunch.
 *
 * Those two are only in conflict if the rule is read as "no % character".
 * Resolved here by enforcing what §5.1 actually protects: a percentage is
 * forbidden UNLESS the same string carries a literature citation, which makes
 * it a statement about a published population and not about the student in
 * front of you. A citation means an author-and-year plus a sample size.
 * Recorded as a judgement call in LOG 012.
 */
const PERCENT = /\d+(\.\d+)?\s*(%|％|percent|百分)/i;
const CITATION = /\b[A-Z][A-Za-z'’-]{2,}\s+(?:et\s+al\.?|等)\s+(?:19|20)\d{2}[\s\S]*\bN\s*=\s*[1-9]\d*/i;
const CITED_POPULATION = {
  'sheet.calibrationFootnote': {
    en: 'Context only: in Knof et al. 2024 (BMC Medical Education, N=426, oral anatomy examination with self-assessment collected before results), 18.5% of students were accurate, 35.5% expected more than they later demonstrated, and 46.0% demonstrated more than they expected.',
    'zh-CN': '仅供理解背景：Knof 等 2024（BMC Medical Education，N=426，口试解剖学考试，成绩公布前收集自评）中，18.5% 的学生判断准确，35.5% 预期高于后来表现，46.0% 后来表现高于原先预期。',
  },
};
const isCitedPopulation = (item) => CITED_POPULATION[item.key]?.[item.lang] === item.text && CITATION.test(item.text);

/**
 * Outcome vocabulary, closed. P3 §5.2. A string registered under one of these
 * keys must be one of the permitted forms and nothing else.
 */
const OUTCOME_KEYS = [
  'common.verdict.defended', 'common.verdict.partial', 'common.verdict.undefended',
  'common.verdict.underclaimed', 'common.verdict.none',
  'sheet.noAnswer', 'sheet.declined', 'sheet.notClaimed',
];
const ALLOWED_OUTCOMES = new Set([
  'Held', 'Half-held', 'Slipped', 'Steadier than you expected', 'Not asked yet',
  'No response recorded', 'Declined to answer', 'No self-read recorded',
  '站住了', '站了一半', '没站住', '比你预想的更稳', '还没问到',
  '未记录到回答', '学生表示无法回答', '未记录自我判断',
]);

/**
 * Explicit allows. Every entry needs a reason, and the reason has to be that
 * the string is REFUSING the accusation rather than making one.
 */
const ALLOW = [
  {
    key: 'sheet.method',
    texts: {
      en: 'This sheet records whether the student could account for the choices and claims in specified passages under follow-up questioning. It does not report authorship, originality, or the presence of any writing assistance, and it makes no claim about who wrote the work. The student’s own read of each passage was recorded before any examiner judgement was shown to them.',
      'zh-CN': '这份材料记录的是：在追问之下，学生能否讲清楚其提交作业中指定段落里的选择和说法。它不报告作者身份、原创性，也不报告是否使用过任何写作辅助，更不对“这是谁写的”作出任何判断。学生对每一段的自我判断，是在向其展示任何考官判断之前记录的。',
    },
    why: 'The method statement must name what is not measured in order to disclaim it.',
  },
  {
    key: 'sheet.noPercentage',
    texts: {
      en: 'This document carries no percentage on purpose. A number is disputed on appeal; an evidence row is read.',
      'zh-CN': '这份文件刻意不给百分比。数字会在申诉里被争论，证据条目则会被阅读。',
    },
    why: 'Explains why the document carries no percentage; it refuses rather than reports one.',
  },
  {
    key: 'teacher4.linkReady',
    texts: { en: 'Student link copied', 'zh-CN': '学生链接已复制' },
    why: '“Copied” describes a clipboard action, never authorship or conduct.',
  },
  {
    key: 'common.action.copied',
    texts: { en: 'Copied', 'zh-CN': '已复制' },
    why: 'A generic clipboard success label, not an authorship claim.',
  },
];
const isAllowed = (item) => ALLOW.some((allow) => allow.key === item.key && allow.texts[item.lang] === item.text);

/* ---------- collect the strings ---------- */

function constantText(node) {
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (ts.isParenthesizedExpression(node)) return constantText(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = constantText(node.left);
    const right = constantText(node.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = constantText(span.expression);
      if (expression === null) return null;
      value += expression + span.literal.text;
    }
    return value;
  }
  return null;
}

function staticTemplateTexts(node) {
  if (!ts.isTemplateExpression(node)) return [];
  const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  const staticText = parts.join('');
  const candidates = [staticText, parts.join(' ')];
  if (/\p{L}/u.test(staticText)) candidates.push(parts.join('0'));
  return [...new Set(candidates.map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

function propertyName(property) {
  const name = property.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return constantText(name.expression);
  return null;
}

function propertyOf(object, key) {
  return object.properties.find((property) => ts.isPropertyAssignment(property) && propertyName(property) === key);
}

const files = execSync("find src -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' })
  .trim().split('\n');

const strings = [];   // { key, lang, text, file }
const extractionFailures = [];

function collectI18nSource(src, f, target = strings, errors = extractionFailures) {
  const tree = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'registerStrings') {
      const pkg = node.arguments[0] ? constantText(node.arguments[0]) : null;
      const table = node.arguments[1];
      if (!pkg || !table || !ts.isObjectLiteralExpression(table)) {
        errors.push(`${f}: registerStrings call is not statically scannable`);
      } else {
        const isInstructor = INSTRUCTOR_PACKAGES.includes(pkg);
        const isStudent = STUDENT_PACKAGES.includes(pkg);
        const surfaces = [...(isInstructor ? ['instructor'] : []), ...(isStudent ? ['student'] : [])];
        if (surfaces.length && table.properties.some((property) => !ts.isPropertyAssignment(property))) {
          errors.push(`${f}: ${pkg} table contains a spread, shorthand, or other unscannable property`);
        }
        for (const lang of ['en', 'zh-CN']) {
          const languageProperty = propertyOf(table, lang);
          if (!languageProperty || !ts.isObjectLiteralExpression(languageProperty.initializer)) {
            if (surfaces.length) errors.push(`${f}: ${pkg}.${lang} table is not statically scannable`);
            continue;
          }
          for (const property of languageProperty.initializer.properties) {
            if (!ts.isPropertyAssignment(property)) {
              errors.push(`${f}: ${pkg}.${lang} contains a spread, shorthand, or other unscannable property`);
              continue;
            }
            const localKey = propertyName(property);
            const text = constantText(property.initializer);
            if (!localKey || text === null) {
              errors.push(`${f}: ${pkg}.${lang} contains an unscannable key or value`);
              continue;
            }
            const key = localKey.startsWith(`${pkg}.`) ? localKey : `${pkg}.${localKey}`;
            for (const surface of surfaces) {
              target.push({ key, lang, text, file: f, surface, outcome: surface === 'instructor' && OUTCOME_KEYS.includes(key) });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}

for (const f of files.filter((path) => path.includes('/i18n/'))) collectI18nSource(readFileSync(f, 'utf8'), f);

function collectScreenLiterals(file, surface) {
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Set();
  const visit = (node) => {
    if (ts.isJsxText(node)) found.add(node.text.trim());
    const value = constantText(node);
    if (value !== null) found.add(value.trim());
    for (const templateText of staticTemplateTexts(node)) found.add(templateText);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  for (const text of found) {
    if (text.length >= 2) strings.push({ key: `${file}:literal`, lang: 'literal', text, file, surface });
  }
}

/* Literal JSX and expression strings on routed surfaces. Translation keys and
   internal constants are harmless; any user-facing forbidden phrase is not. */
for (const file of INSTRUCTOR_SCREENS) collectScreenLiterals(file, 'instructor');
for (const file of STUDENT_SCREENS) collectScreenLiterals(file, 'student');

function namespacesFromKeyExpression(node) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return namespacesFromKeyExpression(node.expression);
  if (ts.isConditionalExpression(node)) {
    const whenTrue = namespacesFromKeyExpression(node.whenTrue);
    const whenFalse = namespacesFromKeyExpression(node.whenFalse);
    return whenTrue && whenFalse ? new Set([...whenTrue, ...whenFalse]) : null;
  }
  if (ts.isTemplateExpression(node)) {
    const dot = node.head.text.indexOf('.');
    return dot > 0 ? new Set([node.head.text.slice(0, dot)]) : null;
  }
  const value = constantText(node);
  if (value === null) return null;
  const dot = value.indexOf('.');
  return dot > 0 ? new Set([value.slice(0, dot)]) : null;
}

function unwrapExpression(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isNonNullExpression(current)) current = current.expression;
  return current;
}

function translationNamespacesFromSource(source, file = 'mutation.tsx') {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const namespaces = new Set();
  let dynamic = false;
  const translators = new Set(['t']);
  let changed = true;
  while (changed) {
    changed = false;
    const collectAliases = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const value = unwrapExpression(node.initializer);
        if (ts.isIdentifier(value) && translators.has(value.text) && !translators.has(node.name.text)) {
          translators.add(node.name.text);
          changed = true;
        }
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = unwrapExpression(node.left);
        const right = unwrapExpression(node.right);
        if (ts.isIdentifier(left) && ts.isIdentifier(right) && translators.has(right.text) && !translators.has(left.text)) {
          translators.add(left.text);
          changed = true;
        }
      }
      ts.forEachChild(node, collectAliases);
    };
    collectAliases(tree);
  }
  const visit = (node) => {
    const callee = ts.isCallExpression(node) ? unwrapExpression(node.expression) : undefined;
    if (ts.isCallExpression(node) && callee && ts.isIdentifier(callee) && translators.has(callee.text) && node.arguments[0]) {
      const found = namespacesFromKeyExpression(node.arguments[0]);
      if (!found) dynamic = true;
      else for (const namespace of found) namespaces.add(namespace);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return { namespaces, dynamic };
}

function translationNamespaces(file) {
  return translationNamespacesFromSource(readFileSync(file, 'utf8'), file);
}

/* ---------- check ---------- */

const failures = [...extractionFailures];

function violationsFor(item) {
  if (isAllowed(item)) return [];
  const violations = [];
  const denylist = item.surface === 'student' ? STUDENT_DENY : DENY;
  for (const rule of denylist) {
    if (rule.re.test(item.text)) violations.push(`${item.key} [${item.lang}] contains a forbidden term on a ${item.surface} surface (${rule.why})\n      → ${item.text.slice(0, 120)}`);
  }
  if (PERCENT.test(item.text) && (item.surface === 'student' || !isCitedPopulation(item))) {
    violations.push(`${item.key} [${item.lang}] carries a percentage where this surface cannot. Student surfaces never show one; instructor population context requires a citation.\n      → ${item.text.slice(0, 120)}`);
  }
  if (item.outcome && !ALLOWED_OUTCOMES.has(item.text)) violations.push(`${item.key} [${item.lang}] is an outcome string outside the closed vocabulary\n      → "${item.text}"`);
  return violations;
}

function syntheticViolations(source, surface) {
  const tree = ts.createSourceFile('mutation.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Set();
  const visit = (node) => {
    const value = constantText(node);
    if (value !== null) values.add(value);
    for (const templateText of staticTemplateTexts(node)) values.add(templateText);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return [...values].flatMap((text) => violationsFor({ key: '__mutation.literal', lang: 'en', text, surface }));
}

for (const source of [
  `const value = "This is not yours";`,
  'const value = `This is not yours`;',
  `const value = 'This is not ' + 'yours';`,
  'const value = `This is not yours ${1}`;',
  'const value = `This is not ${name}yours`;',
  'const value = `This is not yo${part}urs`;',
  'const value = `Score ${n}%`;',
]) {
  if (!syntheticViolations(source, 'student').length) failures.push(`student AST mutation bypassed the gate: ${source}`);
}
for (const allow of ALLOW) {
  for (const [lang, text] of Object.entries(allow.texts)) {
    const mutation = { key: allow.key, lang, text: `${text} This student cheated.`, surface: 'instructor' };
    if (!violationsFor(mutation).length) failures.push(`allow mutation bypassed the gate for ${allow.key} [${lang}]`);
  }
}

for (const value of ['"This is not yours"', '`This is not yours`']) {
  const mutated = [];
  const errors = [];
  collectI18nSource(`registerStrings('v5', { en: { brand: ${value} }, 'zh-CN': { brand: '安全' } });`, 'mutation-i18n.ts', mutated, errors);
  if (errors.length || !mutated.some((item) => violationsFor(item).length)) failures.push(`i18n AST mutation bypassed the gate for ${value}`);
}

{
  const spreadMutation = [];
  const spreadErrors = [];
  collectI18nSource("const unsafe = { brand: 'This is not yours' }; registerStrings('v5', { en: { ...unsafe }, 'zh-CN': { brand: '安全' } });", 'mutation-spread.ts', spreadMutation, spreadErrors);
  if (!spreadErrors.length && !spreadMutation.some((item) => violationsFor(item).length)) failures.push('registerStrings spread mutation bypassed the gate');
}

const conditionalNamespace = translationNamespacesFromSource(`t(flag ? 'v5.safe' : 'unsafe.bad')`);
if (conditionalNamespace.dynamic || !conditionalNamespace.namespaces.has('unsafe') || [...conditionalNamespace.namespaces].every((namespace) => STUDENT_PACKAGES.includes(namespace))) {
  failures.push('conditional t() namespace mutation bypassed the gate');
}
const templateNamespace = translationNamespacesFromSource('t(`unsafe.${key}`)');
if (templateNamespace.dynamic || !templateNamespace.namespaces.has('unsafe')) failures.push('template t() namespace mutation bypassed the gate');
if (!translationNamespacesFromSource('t(key)').dynamic) failures.push('dynamic t() namespace mutation bypassed the gate');
const parenthesizedNamespace = translationNamespacesFromSource("(t)(flag ? 'v5.safe' : 'unsafe.bad')");
if (parenthesizedNamespace.dynamic || !parenthesizedNamespace.namespaces.has('unsafe')) failures.push('parenthesized t() mutation bypassed the gate');
const aliasedNamespace = translationNamespacesFromSource("const translate = t; translate(flag ? 'v5.safe' : 'unsafe.bad')");
if (aliasedNamespace.dynamic || !aliasedNamespace.namespaces.has('unsafe')) failures.push('aliased t() mutation bypassed the gate');

if (!violationsFor({ key: '__mutation.studentPercent', lang: 'en', text: 'Score 0%', surface: 'student' }).length) failures.push('student dynamic percentage mutation bypassed the gate');
if (!violationsFor({ key: '__mutation.fakeCitation', lang: 'en', text: 'This student received 87%. 2024 N=1', surface: 'instructor' }).length) failures.push('authorless percentage citation mutation bypassed the gate');

for (const pkg of INSTRUCTOR_PACKAGES) {
  if (!strings.some((item) => item.surface === 'instructor' && item.key.startsWith(`${pkg}.`))) {
    failures.push(`instructor i18n namespace ${pkg} is listed but no strings were collected`);
  }
  if (!violationsFor({ key: `${pkg}.__mutation`, lang: 'en', text: 'This evidence is suspicious', surface: 'instructor' }).length) {
    failures.push(`instructor mutation probe did not trip for namespace ${pkg}`);
  }
}
for (const file of INSTRUCTOR_SCREENS) {
  const used = translationNamespaces(file);
  if (used.dynamic) failures.push(`${file} contains a dynamically unscannable instructor t() key`);
  for (const namespace of used.namespaces) if (!INSTRUCTOR_PACKAGES.includes(namespace)) failures.push(`${file} uses unscanned instructor i18n namespace ${namespace}`);
}

for (const pkg of STUDENT_PACKAGES) {
  if (!strings.some((item) => item.surface === 'student' && item.key.startsWith(`${pkg}.`))) {
    failures.push(`student i18n namespace ${pkg} is listed but no strings were collected`);
  }
  if (!violationsFor({ key: `${pkg}.__mutation`, lang: 'en', text: 'This is not yours', surface: 'student' }).length) {
    failures.push(`student mutation probe did not trip for namespace ${pkg}`);
  }
}
for (const file of STUDENT_SCREENS) {
  if (!strings.some((item) => item.surface === 'student' && item.file === file && item.lang === 'literal')) {
    failures.push(`student screen literal collector produced no evidence for ${file}`);
  }
  const used = translationNamespaces(file);
  if (used.dynamic) failures.push(`${file} contains a dynamically unscannable student t() key`);
  for (const namespace of used.namespaces) if (!STUDENT_PACKAGES.includes(namespace)) failures.push(`${file} uses unscanned student i18n namespace ${namespace}`);
}

for (const item of strings) failures.push(...violationsFor(item));

/* The method statement is not optional: an evidence sheet without it is an
   assessment, and P3 §5.3.2 calls it the document's most important element. */
const hasMethod = strings.some((s) => s.key === 'sheet.method' && s.text.length > 120);
if (!hasMethod) failures.push('sheet.method is missing or too short to be a method statement');

const sheetSource = readFileSync('src/screens/class/StudentSheetScreen.tsx', 'utf8');
if (!sheetSource.includes("t('sheet.method')")) {
  failures.push('The evidence sheet does not render sheet.method. It must always be present.');
}
if (!sheetSource.includes("t('sheet.signTitle')")) {
  failures.push('The evidence sheet has no instructor sign-off block. The AI never publishes.');
}

const cited = strings.filter((item) => PERCENT.test(item.text) && isCitedPopulation(item));
const instCount = strings.filter((s) => s.surface === 'instructor').length;
const stuCount = strings.filter((s) => s.surface === 'student').length;
console.log(`verify-never-accuse: ${strings.length} strings checked (instructor ${instCount}, student ${stuCount}) against DENY ${DENY.length} + STUDENT_DENY ${STUDENT_DENY.length} denied terms`);
if (cited.length) {
  console.log(`  ${cited.length} string(s) carry a percentage WITH a citation, which is permitted:`);
  for (const c of cited) console.log(`    · ${c.key} [${c.lang}]`);
}
console.log(`  allow-list: ${ALLOW.length} explicit exception(s)`);
for (const a of ALLOW) console.log(`    · ${a.key} — ${a.why}`);

if (failures.length) {
  console.error(`\nverify-never-accuse: ${failures.length} FAILURE(S)`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-never-accuse: namespace coverage and i18n/TSX AST mutation probes hold ✓');
console.log('verify-never-accuse: no student or instructor surface accuses anyone ✓');
