export interface RosterRow {
  name: string;
  studentId?: string;
  title: string;
  material: string;
}

export interface RosterParseResult {
  rows: RosterRow[];
  skipped: number;
}

const MAX_ROWS = 250;
const MAX_MATERIAL_CHARS = 50_000;
const MAX_LABEL_CHARS = 200;

/** Small RFC-4180 parser: quoted commas, escaped quotes and line breaks work offline. */
function cells(csv: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const text = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"' && !cell) quoted = true;
    else if (char === ',') { row.push(cell.trim()); cell = ''; }
    else if (char === '\n') { row.push(cell.trim()); if (row.some(Boolean)) out.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) out.push(row);
  return out;
}

const normal = (value: string) => value.toLowerCase().trim().replace(/[\s_-]+/g, '');

export function parseRosterCsv(csv: string): RosterParseResult {
  const table = cells(csv);
  if (table.length < 2) return { rows: [], skipped: table.length ? 1 : 0 };
  const headers = table[0].map(normal);
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.map(normal).includes(header));
  const nameAt = indexOf('name', 'student', 'studentname');
  const idAt = indexOf('studentid', 'id', 'email');
  const titleAt = indexOf('title', 'assignment', 'submissiontitle');
  const materialAt = indexOf('material', 'submission', 'text', 'work');
  if (nameAt < 0 || materialAt < 0) return { rows: [], skipped: table.length - 1 };
  const data = table.slice(1);
  let skipped = Math.max(0, data.length - MAX_ROWS);
  const rows = data.slice(0, MAX_ROWS).flatMap((values) => {
    const name = values[nameAt]?.trim() ?? '';
    const material = values[materialAt]?.trim() ?? '';
    if (!name || name.length > MAX_LABEL_CHARS || !material || material.length > MAX_MATERIAL_CHARS) {
      skipped += 1;
      return [];
    }
    const studentId = idAt >= 0 ? values[idAt]?.trim() || undefined : undefined;
    if (studentId && studentId.length > MAX_LABEL_CHARS) { skipped += 1; return []; }
    const suppliedTitle = titleAt >= 0 ? values[titleAt]?.trim() : '';
    return [{
      name,
      studentId,
      title: suppliedTitle ? suppliedTitle.slice(0, MAX_LABEL_CHARS) : 'Submitted work',
      material,
    }];
  });
  return { rows, skipped };
}

export function rosterTemplate(): string {
  return 'name,student_id,title,material\n"Lin Yue","S001","Methods section","Paste the student submission here"\n';
}
